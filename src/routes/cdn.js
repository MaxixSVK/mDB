const fs = require('fs');
const path = require('path');
const router = require('express').Router();
const sanitize = require('sanitize-filename');
const multer = require('multer');

module.exports = function (pool) {
  const validateToken = require('../middleware/checkToken')(pool);

  const { createLibraryStorage, createPfpStorage } = require('../cdnStorage')

  const sendImage = require('../middleware/sendImage');
  router.use(sendImage);

  const uploadLibraryImage = multer({ storage: createLibraryStorage() });
  const uploadUserPFP = multer({ storage: createPfpStorage() });

  router.get('/library/:filename', (req, res, next) => {
    try {
      const filename = sanitize(req.params.filename);
      const dir = path.join(__dirname, '../../cdn/library');
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

  router.post('/library/upload', validateToken, uploadLibraryImage.single('image'), async (req, res, next) => {
    let conn;
    try {
      const { type, id } = req.body;
      const oldPath = req.file.path;

      const table = type === 'series' ? 'series' : 'books';
      const idColumn = type === 'series' ? 'series_id' : 'book_id';

      conn = await pool.getConnection();
      const validRef = await conn.query(
        `SELECT EXISTS(SELECT 1 FROM ${table} WHERE ${idColumn} = ? AND user_id = ?) AS record_exists`,
        [id, req.userId]
      );

      if (!validRef[0].record_exists) {
        return res.error('Invalid reference or unauthorized.', 403);
      }

      const newFileName = type === 'series' ? `s-${id}.png` : `b-${id}.png`;
      const newPath = path.join(path.dirname(oldPath), newFileName);
      fs.renameSync(oldPath, newPath);

      await conn.query(
        `UPDATE ${table} SET img = ? WHERE ${idColumn} = ?`,
        [true, id]
      );

      res.success({ msg: 'File uploaded.', filename: newFileName });
    } catch (err) {
      next(err);
    } finally {
      if (conn) conn.release();
    }
  });


  router.get('/users/pfp/:filename', (req, res, next) => {
    try {
      const filename = sanitize(req.params.filename);
      const dir = path.join(__dirname, '../../cdn/users/pfp');
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
      res.success({ msg: 'File uploaded.', filename: req.file.originalname });
    } catch (err) {
      next(err);
    }
  });

  return router;
};