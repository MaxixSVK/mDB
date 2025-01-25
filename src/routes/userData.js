const express = require('express');
const router = express.Router();

module.exports = function (pool) {
    const validate = require('../middleware/checkToken')(pool);
    
    //TODO: Input validation for all routes
    //TODO: Move type to body for all routes
    router.post('/add-data/:type', validate, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const { type } = req.params;
            const data = req.body;

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

            if (params.length > 0) {
                const result = await conn.query(sql, params);
                if (result.affectedRows === 0) {
                    return res.error(`Failed to add ${type}`, 500);
                }

                const logSql = `INSERT INTO logs (change_type, table_name, record_id, new_data) VALUES (?, ?, ?, ?)`;
                await conn.query(logSql, ['INSERT', type, result.insertId, JSON.stringify(data)]);

                res.success({ msg: `${type} added successfully` });
            } else {
                res.success({ msg: `No valid fields provided to add ${type}` });
            }
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.end();
        }
    });

    router.put('/update-data/:type/:id', validate, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const { type, id } = req.params;
            const data = req.body;

            const primaryKeyMapping = {
                series: 'series_id',
                books: 'book_id',
                chapters: 'chapter_id'
            };

            const oldDataSql = `SELECT * FROM ${type} WHERE ${primaryKeyMapping[type]} = ?`;
            const [oldData] = await conn.query(oldDataSql, [id]);

            let sql = `UPDATE ${type} SET `;
            let params = [];

            Object.entries(data).forEach(([key, value]) => {
                sql += `${key} = ${value !== '' ? '?' : 'NULL'}, `;
                if (value !== '') {
                    params.push(value);
                }
            });

            sql = sql.slice(0, -2);
            sql += ` WHERE ${primaryKeyMapping[type]} = ?`;
            params.push(id);

            if (params.length > 1) {
                const result = await conn.query(sql, params);
                if (result.affectedRows === 0) {
                    return res.error(`${type} not found or no changes made`, 404);
                }

                const logSql = `INSERT INTO logs (change_type, table_name, record_id, old_data, new_data) VALUES (?, ?, ?, ?, ?)`;
                await conn.query(logSql, ['UPDATE', type, id, JSON.stringify(oldData), JSON.stringify(data)]);

                res.success({ msg: `${type} updated successfully` });
            } else {
                res.success({ msg: `No valid fields provided to update ${type}` });
            }
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.end();
        }
    });

    router.delete('/delete-data/:type/:id', validate, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const { type, id } = req.params;

            const tableName = type;
            const primaryKeyMapping = {
                series: 'series_id',
                books: 'book_id',
                chapters: 'chapter_id'
            };

            const oldDataSql = `SELECT * FROM ${tableName} WHERE ${primaryKeyMapping[type]} = ?`;
            const [oldData] = await conn.query(oldDataSql, [id]);

            const result = await conn.query(`DELETE FROM ${tableName} WHERE ${primaryKeyMapping[type]} = ?`, [id]);

            if (result.affectedRows === 0) {
                return res.error(`${type} with ID ${id} not found`, 404);
            }

            const logSql = `INSERT INTO logs (change_type, table_name, record_id, old_data) VALUES (?, ?, ?, ?)`;
            await conn.query(logSql, ['DELETE', type, id, JSON.stringify(oldData)]);

            res.success({ msg: `${type} with ID ${id} deleted successfully` });
        } catch (err) {
            if (err.code === 'ER_ROW_IS_REFERENCED_2') {
                return res.error(`${type} with ID ${id} is referenced in another table`, 409);
            }
            next(err);
        } finally {
            if (conn) conn.end();
        }
    });

    return router;
};