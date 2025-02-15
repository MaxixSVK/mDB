const router = require('express').Router();

module.exports = function (pool) {
    const validateToken = require('../middleware/checkToken')(pool);
    router.use(validateToken);

    async function logChanges(conn, changeType, tableName, recordId, oldData = null, newData = null) {
        const logQuery = `INSERT INTO logs (change_type, table_name, record_id, old_data, new_data) VALUES (?, ?, ?, ?, ?)`;
        await conn.query(logQuery, [changeType, tableName, recordId, oldData, newData]);
    }

    //TODO: Input validation for all routes
    router.post('/new', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const { type, ...data } = req.body;

            const tableNameMapping = {
                series: 'series',
                book: 'books',
                chapter: 'chapters'
            };

            const tableName = tableNameMapping[type];

            let columns = ['user_id'];
            let placeholders = ['?'];
            let params = [req.userId];

            Object.entries(data).forEach(([key, value]) => {
                if (value !== '') {
                    columns.push(key);
                    placeholders.push('?');
                    params.push(value);
                }
            });

            const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;

            if (params.length > 1) {
                const result = await conn.query(sql, params);
                await logChanges(conn, 'INSERT', tableName, result.insertId, null, JSON.stringify(data));

                res.success('Added successfully');
            } else {
                res.success('No valid fields provided to update');
            }
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    router.put('/update/:id', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const { id } = req.params;
            const { type, ...data } = req.body;

            const tableNameMapping = {
                series: 'series',
                book: 'books',
                chapter: 'chapters'
            };

            const tableName = tableNameMapping[type];
            const primaryKey = `${type}_id`;

            const checkSql = `SELECT * FROM ${tableName} WHERE ${primaryKey} = ? AND user_id = ?`;
            const [existingRow] = await conn.query(checkSql, [id, req.userId]);

            if (!existingRow) {
                return res.success('Data does not exist');
            }

            let sql = `UPDATE ${tableName} SET `;
            let params = [];

            Object.entries(data).forEach(([key, value]) => {
                sql += `${key} = ${value !== '' ? '?' : 'NULL'}, `;
                if (value !== '') {
                    params.push(value);
                }
            });

            sql = sql.slice(0, -2);
            sql += ` WHERE ${primaryKey} = ? AND user_id = ?`;
            params.push(id, req.userId);

            if (params.length > 2) {
                const oldDataSql = `SELECT * FROM ${tableName} WHERE ${primaryKey} = ? AND user_id = ?`;
                const [oldData] = await conn.query(oldDataSql, [id, req.userId]);

                await conn.query(sql, params);
                await logChanges(conn, 'UPDATE', tableName, id, JSON.stringify(oldData), JSON.stringify(data));

                res.success('Updated successfully');
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
            const { id, type } = req.params;

            const tableNameMapping = {
                series: 'series',
                book: 'books',
                chapter: 'chapters'
            };

            const tableName = tableNameMapping[type];
            const primaryKey = `${type}_id`;

            const checkSql = `SELECT * FROM ${tableName} WHERE ${primaryKey} = ? AND user_id = ?`;
            const [existingRow] = await conn.query(checkSql, [id, req.userId]);

            if (!existingRow) {
                return res.success('Data does not exist');
            }

            const oldDataSql = `SELECT * FROM ${tableName} WHERE ${primaryKey} = ? AND user_id = ?`;
            const [oldData] = await conn.query(oldDataSql, [id, req.userId]);

            await conn.query(`DELETE FROM ${tableName} WHERE ${primaryKey} = ? AND user_id = ?`, [id, req.userId]);

            await logChanges(conn, 'DELETE', tableName, id, JSON.stringify(oldData));

            res.success('Deleted successfully');
        } catch (err) {
            if (err.code === 'ER_ROW_IS_REFERENCED_2') {
                return res.error(`Cannot delete because it is used elsewhere`, 409, true);
            }
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    return router;
};