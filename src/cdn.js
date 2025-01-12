const express = require('express');
const multer = require('multer');
const sanitize = require('sanitize-filename');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const router = express.Router();

module.exports = function (pool) {
  const validate = require('./middleware/checkToken')(pool, admin = true);
  const { backupCDN } = require('./backup/cdn');

  const createStorage = () => {
    return multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = path.resolve(__dirname, '../uploads');
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath);
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        cb(null, file.originalname);
      }
    });
  };

  const createPfpStorage = () => {
    return multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = path.resolve(__dirname, '../uploads/pfp');
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const userId = req.userId;
        cb(null, `${userId}.png`);
      }
    });
  };

  const upload = multer({ storage: createStorage() });
  const uploadPfp = multer({ storage: createPfpStorage() });

  router.post('/upload', validate, upload.single('image'), (req, res, next) => {
    if (!req.file) {
      return res.error('Please upload a file.', 400);
    }
    res.success({ msg: 'File uploaded.', filename: req.file.originalname });
  });

  router.post('/upload-pfp', validate, uploadPfp.single('image'), async (req, res) => {
    if (!req.file) {
      return res.error('Please upload a file.', 400);
    }

    const filePath = path.resolve(__dirname, '../uploads/pfp', `${req.userId}.png`);
    try {
      await sharp(req.file.path)
        .png()
        .toFile(filePath);
      fs.unlinkSync(req.file.path);
      res.success({ msg: 'Profile picture uploaded and converted to PNG.', filename: `${req.userId}.png` });
    } catch (error) {
      next(error);
    }
  });

  router.get('/images/search/:search', (req, res, next) => {
    const uploadPath = path.resolve(__dirname, '../uploads');
    const search = sanitize(req.params.search);

    fs.readdir(uploadPath, (err, files) => {
      if (err) {
        next(err);
      }
      const filteredFiles = files.filter(file => file.includes(search));
      if (filteredFiles.length === 0) {
        return res.error('No files found.', 404);
      }
      res.send(filteredFiles);
    });
  });
  
  router.get('/images/:filename', (req, res, next) => {
    const filename = sanitize(req.params.filename);
    const uploadsDir = path.join(__dirname, '../uploads');
    const filePath = path.join(uploadsDir, filename);
    const normalizedPath = path.normalize(filePath);
    const isLowRes = req.query.lowres === 'true';

    if (normalizedPath.startsWith(uploadsDir) && fs.existsSync(normalizedPath)) {
      if (isLowRes) {
        sharp(filePath)
          .resize(200)
          .toBuffer()
          .then(data => {
            res.type('image').send(data);
          })
          .catch(err => {
            next(err);
          });
      } else {
        res.type('image').sendFile(normalizedPath);
      }
    } else {
      res.error('File not found.', 404);
    }
  });

  router.get('/pfp/:filename', (req, res, next) => {
    const filename = sanitize(req.params.filename);
    const uploadsDir = path.join(__dirname, '../uploads/pfp');
    const filePath = path.join(uploadsDir, filename);
    const normalizedPath = path.normalize(filePath);
    const isLowRes = req.query.lowres === 'true';

    if (normalizedPath.startsWith(uploadsDir) && fs.existsSync(normalizedPath)) {
      if (isLowRes) {
        sharp(filePath)
          .resize(200)
          .toBuffer()
          .then(data => {
            res.type('image').send(data);
          })
          .catch(err => {
            next(err);
          });
      } else {
        res.type('image').sendFile(normalizedPath);
      }
    } else {
      res.type('image').sendFile(path.join(__dirname, '../uploads/pfp/default.png'));
    }
  });

  router.delete('/images/:filename', validate, (req, res, next) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../uploads', filename);

    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) {
          next(err);
        }
        res.success({ msg: 'File deleted.' });
      });
    } else {
      res.error('File not found.', 404);
    }
  });

  router.put('/images/rename/:filename', validate, async (req, res, next) => {
    const { filename } = req.params;
    const { newFilename } = req.body;

    let newFilenameWithExtension;
    if (path.extname(newFilename) === '') {
      const fileExtension = path.extname(filename);
      newFilenameWithExtension = `${newFilename}${fileExtension}`;
    } else {
      newFilenameWithExtension = newFilename;
    }

    const filePath = path.join(__dirname, '../uploads', filename);
    const newFilePath = path.join(__dirname, '../uploads', newFilenameWithExtension);

    if (fs.existsSync(filePath)) {
      fs.rename(filePath, newFilePath, async (err) => {
        if (err) {
          return next(err);
        }

        const oldLink = `https://mdatabase.maxix.sk/cdn/images/${filename}`;
        const newLink = `https://mdatabase.maxix.sk/cdn/images/${newFilenameWithExtension}`;

        const connection = await pool.getConnection();
        try {
          await connection.query(
            'UPDATE series SET img = ? WHERE img = ?',
            [newLink, oldLink]
          );
          await connection.query(
            'UPDATE books SET img = ? WHERE img = ?',
            [newLink, oldLink]
          );
          res.success({ msg: 'File renamed, DB references updated.', filename: newFilenameWithExtension });
        } catch (dbErr) {
          next(dbErr);
        } finally {
          connection.release();
        }
      });
    } else {
      res.error('File not found.', 404);
    }
  });

  router.get('/backup', validate, async (req, res, next) => {
    let backupFile;
    try {
      backupFile = await backupCDN();
      const date = new Date().toISOString().split('T')[0];
      const fileName = `mdb-cdn-backup-${date}.tar.gz`;
      res.download(backupFile, fileName, (err) => {
        fs.unlinkSync(backupFile);
        if (err) {
          next(err);
        }
      });
    } catch (error) {
      if (backupFile) {
        fs.unlinkSync(backupFile);
      }
      next(error);
    }
  });

  return router;
};