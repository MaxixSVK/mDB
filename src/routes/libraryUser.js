const fs = require('fs');
const path = require('path');
const router = require('express').Router();

module.exports = function (pool) {
    const validateToken = require('../middleware/checkToken')(pool, 'auth');
    router.use(validateToken);

    const newlibraryLog = require('../utils/libraryLogs');
    const tableNameMapping = {
        series: 'series',
        book: 'books',
        chapter: 'chapters'
    };
    const fieldWhitelistMapping = {
        series: ['author_id', 'name', 'img', 'format', 'status'],
        book: ['series_id', 'name', 'isbn', 'started_reading', 'ended_reading', 'img', 'current_page', 'total_pages'],
        chapter: ['book_id', 'name', 'date']
    };

    router.post('/new/:type', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const { type } = req.params;
            const { ...data } = req.body;

            const tableName = tableNameMapping[type];
            const allowedFields = fieldWhitelistMapping[type];
            if (!tableName) {
                return res.error('Invalid type', 400);
            }
            if (!allowedFields) {
                return res.error('Invalid type', 400);
            }

            let columns = ['user_id'];
            let placeholders = ['?'];
            let params = [req.userId];
            let hasValidField = false;

            for (const [key, value] of Object.entries(data)) {
                if (!allowedFields.includes(key)) {
                    return res.error(`Invalid field: ${key}`, 400);
                }
                if (value !== '') {
                    columns.push(conn.escapeId(key));
                    placeholders.push('?');
                    params.push(value);
                    hasValidField = true;
                }
            }

            const sql = `INSERT INTO ${conn.escapeId(tableName)} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;

            if (hasValidField) {
                const result = await conn.query(sql, params);

                const primaryKey = `${type}_id`;
                const [newDbData] = await conn.query(
                    `SELECT * FROM ${conn.escapeId(tableName)} WHERE ${conn.escapeId(primaryKey)} = ? AND user_id = ?`,
                    [result.insertId, req.userId]
                );

                await newlibraryLog(req.userId, 'INSERT', tableName, result.insertId, null, JSON.stringify(newDbData), pool);
                res.success({
                    msg: 'Added successfully',
                    data: newDbData
                });
            } else {
                res.success('No valid fields provided to update');
            }
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    router.put('/update/:type/:id', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const { type, id } = req.params;
            const { ...data } = req.body;

            const tableName = tableNameMapping[type];
            const allowedFields = fieldWhitelistMapping[type];
            if (!tableName) {
                return res.error('Invalid type', 400);
            }
            if (!allowedFields) {
                return res.error('Invalid type', 400);
            }
            const primaryKey = `${type}_id`;

            let sql = `UPDATE ${conn.escapeId(tableName)} SET `;
            let params = [];
            let hasValidField = false;

            for (const [key, value] of Object.entries(data)) {
                if (!allowedFields.includes(key)) {
                    return res.error(`Invalid field: ${key}`, 400);
                }
                sql += `${conn.escapeId(key)} = ${value !== '' ? '?' : 'NULL'}, `;
                if (value !== '') {
                    params.push(value);
                    hasValidField = true;
                }
            }

            sql = sql.slice(0, -2);
            sql += ` WHERE ${conn.escapeId(primaryKey)} = ? AND user_id = ?`;
            params.push(id, req.userId);

            if (hasValidField) {
                const oldDbDataQuery = `SELECT * FROM ${conn.escapeId(tableName)} WHERE ${conn.escapeId(primaryKey)} = ? AND user_id = ?`;
                const [oldDbData] = await conn.query(oldDbDataQuery, [id, req.userId]);

                await conn.query(sql, params);

                const newDbDataQuery = `SELECT * FROM ${conn.escapeId(tableName)} WHERE ${conn.escapeId(primaryKey)} = ? AND user_id = ?`;
                const [newDbData] = await conn.query(newDbDataQuery, [id, req.userId]);

                await newlibraryLog(req.userId, 'UPDATE', tableName, id, JSON.stringify(oldDbData), JSON.stringify(newDbData), pool);
                res.success({
                    msg: 'Updated successfully',
                    data: newDbData
                });

                if ((type === 'series' || type === 'book') && oldDbData.img === 1 && newDbData.img === 0) {
                    const filename = type === 'series' ? `s-${id}.png` : `b-${id}.png`;
                    const filePath = path.join(__dirname, '../../cdn/library', filename);

                    if (fs.existsSync(filePath)) {
                        fs.unlink(filePath, (err) => {
                            if (err) {
                                next(err);
                            }
                        });
                    }
                }
            } else {
                res.success('No valid fields provided to update');
            }
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    router.delete('/delete/:type/:id', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const { type, id } = req.params;

            const tableName = tableNameMapping[type];
            if (!tableName) {
                return res.error('Invalid type', 400);
            }
            const primaryKey = `${type}_id`;

            const dbDataQuery = `SELECT * FROM ${conn.escapeId(tableName)} WHERE ${conn.escapeId(primaryKey)} = ? AND user_id = ?`;
            const [dbData] = await conn.query(dbDataQuery, [id, req.userId]);
            if (!dbData) {
                return res.success('Data does not exist');
            }

            await conn.query(
                `DELETE FROM ${conn.escapeId(tableName)} WHERE ${conn.escapeId(primaryKey)} = ? AND user_id = ?`,
                [id, req.userId]
            );

            await newlibraryLog(req.userId, 'DELETE', tableName, id, JSON.stringify(dbData), null, pool);
            res.success('Deleted successfully');
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    router.post('/author/new', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const { name, bio } = req.body;

            const sql = `INSERT INTO authors (user_id, name, bio) VALUES (?, ?, ?)`;
            const params = [req.userId, name, bio || null];

            const result = await conn.query(sql, params);
            const [newDbData] = await conn.query(
                `SELECT * FROM authors WHERE author_id = ? AND user_id = ?`,
                [result.insertId, req.userId]
            );

            await newlibraryLog(req.userId, 'INSERT', 'authors', result.insertId, null, JSON.stringify(newDbData), pool);
            res.success('Author added successfully');
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    router.get('/logs', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const { limit = 10, offset = 0, all = 'false', format = 'file' } = req.query;

            let sql;
            let params;

            if (all === 'true') {
                sql = `SELECT * FROM library_logs WHERE user_id = ? ORDER BY created_at DESC`;
                params = [req.userId];
            } else {
                sql = `SELECT * FROM library_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`;
                params = [req.userId, parseInt(limit), parseInt(offset)];
            }

            const logs = await conn.query(sql, params);
            res.success(logs);
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.end();
        }
    });

    router.get('/logs/:user_query', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const { user_query } = req.params;

            const sql = `
                    SELECT * FROM library_logs 
                    WHERE user_id = ? AND (
                        CAST(old_data AS CHAR) LIKE ? OR
                        CAST(new_data AS CHAR) LIKE ?
                    )
                    ORDER BY created_at DESC
                `;

            const searchTerm = `%${user_query}%`;

            const logs = await conn.query(sql, [
                req.userId,
                searchTerm,
                searchTerm
            ]);

            res.success(logs);
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    return router;
};