const router = require('express').Router();
const sanitize = require('sanitize-filename');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { createLibraryStorage, createPfpStorage } = require('./cdnStorage')
const { backupCDN } = require('./backup/cdn');

const sendImage = require('./middleware/sendImage');
router.use(sendImage);

module.exports = function (pool) {
  const validateToken = require('./middleware/checkToken')(pool);
  const validateTokenAdmin = require('./middleware/checkToken')(pool, admin = true);

  const uploadLibraryImage = multer({ storage: createLibraryStorage() });
  const uploadUserPFP = multer({ storage: createPfpStorage() });

  router.get('/library/:filename', (req, res, next) => {
    try {
      const filename = sanitize(req.params.filename);
      const dir = path.join(__dirname, '../cdn/library');
      const filePath = path.join(dir, filename);
      const normalizedPath = path.normalize(filePath);
      const quality = req.query.q;

      if (normalizedPath.startsWith(dir) && fs.existsSync(normalizedPath)) {
        res.sendImage(filePath, quality, req, res, next);
      } else {
        res.success('Requested file does not exist.');
      }
    } catch (err) {
      next(err);
    }
  });

  router.get('/library/search/:filename', (req, res, next) => {
    try {
      const uploadPath = path.resolve(__dirname, '../cdn/library');
      const search = sanitize(req.params.filename);

      fs.readdir(uploadPath, (err, files) => {
        if (err) {
          next(err);
        }
        res.send(files.filter(file => file.includes(search)));
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/library/upload', validateToken, uploadLibraryImage.single('image'), (req, res, next) => {
    try {
      if (!req.file) {
        return res.error('Please upload a file.', 400);
      }

      const refFilename = req.body.refFilename;
      let finalFilename = req.file.filename;

      if (refFilename) {
        const oldPath = req.file.path;
        const newPath = path.join(path.dirname(oldPath), refFilename);
        
        try {
          fs.renameSync(oldPath, newPath);
          finalFilename = refFilename;
        } catch (renameErr) {
          console.error('Error renaming file:', renameErr);
        }
      }

      res.success({ msg: 'File uploaded.', filename: finalFilename });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/library/delete/:filename', validateToken, (req, res, next) => {
    try {
      const filename = sanitize(req.params.filename);
      const filePath = path.join(__dirname, '../cdn/library', filename);

      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
          if (err) {
            next(err);
          }
          res.success({ msg: 'File deleted.' });
        });
      } else {
        res.success('Requested file does not exist.');
      }
    } catch (err) {
      next(err);
    }
  });

  router.get('/users/pfp/:filename', (req, res, next) => {
    try {
      const filename = sanitize(req.params.filename);
      const dir = path.join(__dirname, '../cdn/users/pfp');
      const filePath = path.join(dir, filename);
      const normalizedPath = path.normalize(filePath);
      const quality = req.query.q;

      if (normalizedPath.startsWith(dir) && fs.existsSync(normalizedPath)) {
        res.sendImage(filePath, quality);
      } else {
        res.success('Requested file does not exist.');
      }
    } catch (err) {
      next(err);
    }
  });

  router.post('/users/upload/pfp', validateToken, uploadUserPFP.single('image'), async (req, res, next) => {
    try {
      if (!req.file) {
        return res.error('Please upload a file.', 400);
      }
      res.success({ msg: 'File uploaded.', filename: req.file.originalname });
    } catch (err) {
      next(err);
    }
  });

  router.get('/backup', validateTokenAdmin, async (req, res, next) => {
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
    } catch (err) {
      if (backupFile) {
        fs.unlinkSync(backupFile);
      }
      next(err);
    }
  });

  return router;
};