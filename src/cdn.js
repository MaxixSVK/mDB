const express = require('express');
const multer = require('multer');
const sanitize = require('sanitize-filename');
const path = require('path');
const fs = require('fs');

const { createLibraryStorage, createPfpStorage } = require('./cdnStorage')
const { backupCDN } = require('./backup/cdn');
const sendImage = require('./middleware/sendImage');

const router = express.Router();
router.use(sendImage);

module.exports = function (pool) {
  const validate = require('./middleware/checkToken')(pool, admin = true);

  const uploadLibraryImage = multer({ storage: createLibraryStorage() });
  const uploadUserPFP = multer({ storage: createPfpStorage() });

  router.get('/library/:filename', (req, res, next) => {
    try {
      const filename = sanitize(req.params.filename);
      const dir = path.join(__dirname, '../cdn/library');
      const filePath = path.join(dir, filename);
      const normalizedPath = path.normalize(filePath);
      const isLowRes = req.query.lowres === 'true';
      const isMidRes = req.query.midres === 'true';

      if (normalizedPath.startsWith(dir) && fs.existsSync(normalizedPath)) {
        res.sendImage(filePath, isLowRes, isMidRes, req, res, next);
      } else {
        res.success('Requested file does not exist.');
      }
    } catch (error) {
      next(error);
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

  router.post('/library/upload', validate, uploadLibraryImage.single('image'), (req, res, next) => {
    try {
      if (!req.file) {
        return res.error('Please upload a file.', 400);
      }
      res.success({ msg: 'File uploaded.', filename: req.file.originalname });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/library/delete/:filename', validate, (req, res, next) => {
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
    } catch (error) {
      next(error);
    }
  });

  router.get('/users/pfp/:filename', (req, res, next) => {
    try {
      const filename = sanitize(req.params.filename);
      const dir = path.join(__dirname, '../cdn/users/pfp');
      const filePath = path.join(dir, filename);
      const normalizedPath = path.normalize(filePath);
      const isLowRes = req.query.lowres === 'true';
      const isMidRes = req.query.midres === 'true';

      if (normalizedPath.startsWith(dir) && fs.existsSync(normalizedPath)) {
        res.sendImage(filePath, isLowRes, isMidRes, req, res, next);
      } else {
        res.success('Requested file does not exist.');
      }
    } catch (error) {
      next(error);
    }
  });

  router.post('/users/upload/pfp', validate, uploadUserPFP.single('image'), async (req, res, next) => {
    try {
      if (!req.file) {
        return res.error('Please upload a file.', 400);
      }
      res.success({ msg: 'File uploaded.', filename: req.file.originalname });
    } catch (error) {
      next(error);
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