const router = require('express').Router();
const sanitize = require('sanitize-filename');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { createLibraryStorage, createPfpStorage } = require('./cdnStorage')

const sendImage = require('./middleware/sendImage');
router.use(sendImage);

module.exports = function (pool) {
  const validateToken = require('./middleware/checkToken')(pool);

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

  router.post('/library/upload', validateToken, uploadLibraryImage.single('image'), async (req, res, next) => {
    let conn;
    try {
      const refFilename = req.body.refFilename;

      const oldPath = req.file.path;
      const newPath = path.join(path.dirname(oldPath), refFilename);

      fs.renameSync(oldPath, newPath);

      const [type, idWithExt] = refFilename.split('-');
      const id = idWithExt.split('.')[0];

      const table = type === 's' ? 'series' : 'books';
      const idColumn = type === 's' ? 'series_id' : 'book_id';

      conn = await pool.getConnection();
      await conn.query(
        `UPDATE ${table} SET img = ? WHERE ${idColumn} = ?`,
        [true, id]
      );

      res.success({ msg: 'File uploaded.', filename: refFilename });
    } catch (err) {
      next(err);
    } finally {
      if (conn) conn.release();
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

  router.post('/users/pfp/upload', validateToken, uploadUserPFP.single('image'), async (req, res, next) => {
    try {
      if (!req.file) {
        return res.error('Please upload a file.', 400);
      }
      res.success({ msg: 'File uploaded.', filename: req.file.originalname });
    } catch (err) {
      next(err);
    }
  });

  return router;
};