const fs = require('fs');
const path = require('path');
const router = require('express').Router();
const sanitize = require('sanitize-filename');
const multer = require('multer');

module.exports = function (pool) {
    const validateToken = require('../middleware/checkToken')(pool, 'auth');

    const { createLibraryStorage, createPfpStorage } = require('../utils/cdnStorage');
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
                res.empty();
            }
        } catch (err) {
            next(err);
        }
    });

    router.post('/library/upload', validateToken, uploadLibraryImage.single('image'), async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const { type, id } = req.body;
            const oldPath = req.file.path;

            const parentTable = type === 'series' ? 'series' : 'books';
            const parentKey = type === 'series' ? 'series_id' : 'book_id';

            const parentDataQuery = `SELECT * FROM ${conn.escapeId(parentTable)} WHERE ${conn.escapeId(parentKey)} = ? AND user_id = ?`;
            const [parentData] = await conn.query(parentDataQuery, [id, req.userId]);
            if (!parentData) {
                return res.error(400, `Cannot find ${parentTable} with id ${id} for user ${req.userId}`);
            }

            const newFileName = type === 'series' ? `s-${id}.png` : `b-${id}.png`;
            const newPath = path.join(path.dirname(oldPath), newFileName);
            fs.renameSync(oldPath, newPath);

            await conn.query(
                `UPDATE ${parentTable} SET img = ? WHERE ${parentKey} = ?`,
                [true, id]
            );

            res.success({ fileName: newFileName }, 'File uploaded.');
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
                res.empty();
            }
        } catch (err) {
            next(err);
        }
    });

    router.post('/users/pfp/upload', validateToken, uploadUserPFP.single('image'), async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const oldPath = req.file.path;

            await conn.query(
                `UPDATE users SET pfp = ? WHERE id = ?`,
                [true, req.userId]
            );

            const newFileName = `u-${req.userId}.png`;
            const newPath = path.join(path.dirname(oldPath), newFileName);
            fs.renameSync(oldPath, newPath);

            res.success({ fileName: newFileName }, 'File uploaded.');
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    return router;
};