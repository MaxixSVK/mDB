const express = require('express');
const router = express.Router();

module.exports = function (pool) {
    const apiKey = process.env.API_KEY;
    function checkApiKey(req, res, next) {
        if (req.headers['api-key'] === apiKey) {
            next();
        } else {
            res.status(401).send('Invalid API key');
        }
    }

    router.post('/admin', checkApiKey, async (req, res) => {
        res.status(200).send('OK');
    });

    function buildInsertQuery(type, data) {
        let columns = [];
        let placeholders = [];
        let params = [];

        Object.entries(data).forEach(([key, value]) => {
            if (value !== '') {
                columns.push(key);
                placeholders.push('?');
                params.push(value);
            }
        });

        const sql = `INSERT INTO ${type} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
        return { sql, params };
    }

    router.post('/add-data', checkApiKey, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const { type, ...data } = req.body;

            if (!['series', 'books', 'chapters'].includes(type)) {
                return res.status(400).send('Invalid type specified');
            }

            const { sql, params } = buildInsertQuery(type, data);

            if (params.length > 0) {
                await conn.query(sql, params);
                res.send(`${type} added successfully`);
            } else {
                res.send(`No valid fields provided to add ${type}`);
            }
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.end();
        }
    });

    function buildUpdateQuery(type, data, id) {
        const primaryKeyMapping = {
            series: 'series_id',
            books: 'book_id', 
            chapters: 'chapter_id'
        };
    
        let sql = `UPDATE ${type} SET `;
        let params = [];
    
        Object.entries(data).forEach(([key, value]) => {
            if (value !== '') {
                sql += `${key} = ?, `;
                params.push(value);
            }
        });
    
        sql = sql.slice(0, -2);
        sql += ` WHERE ${primaryKeyMapping[type]} = ?`;
        params.push(id);
    
        return { sql, params };
    }

    router.put('/update-data/:type/:id', checkApiKey, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const { type, id } = req.params;
            const data = req.body;

            if (!['series', 'books', 'chapters'].includes(type)) {
                return res.status(400).send('Invalid type specified');
            }

            const { sql, params } = buildUpdateQuery(type, data, id);

            if (params.length > 1) { 
                await conn.query(sql, params);
                res.send(`${type} updated successfully`);
            } else {
                res.send(`No valid fields provided to update ${type}`);
            }
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.end();
        }
    });

    router.delete('/delete-data/:type/:id', checkApiKey, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const { type, id } = req.params;
    
            const validTypes = ['series', 'books', 'chapters'];
            if (!validTypes.includes(type)) {
                return res.status(400).send('Invalid type specified');
            }
    
            const tableName = type;

            const primaryKeyMapping = {
                series: 'series_id',
                books: 'book_id', 
                chapters: 'chapter_id'
            };
    
            await conn.query(`DELETE FROM ${tableName} WHERE ${primaryKeyMapping[type]} = ?`, [id]);
    
            res.send(`${type} deleted successfully`);
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.end();
        }
    });

    return router;
};