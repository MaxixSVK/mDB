const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = function (pool) {
    const validate = require('../tokenValidation/checkToken')(pool, admin = true);

    router.post('/add-data', validate, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const { type, ...data } = req.body;

            // TODO: Add more input validation
            if (!['series', 'books', 'chapters'].includes(type)) {
                return res.status(400).send({ msg: 'Invalid type specified' });
            }

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
                    return res.status(500).send(`Failed to add ${type}`);
                }
                res.send({ msg: `${type} added successfully` });
            } else {
                res.send({ msg: `No valid fields provided to add ${type}` });
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

            // TODO: Add more input validation
            if (!['series', 'books', 'chapters'].includes(type)) {
                return res.status(400).send({ msg: 'Invalid type specified' });
            }

            const primaryKeyMapping = {
                series: 'series_id',
                books: 'book_id',
                chapters: 'chapter_id'
            };

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
                    return res.status(404).send(`${type} not found or no changes made`);
                }
                res.send({ msg: `${type} updated successfully` });
            } else {
                res.send({ msg: `No valid fields provided to update ${type}` });
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

            // TODO: Add more input validation
            if (!['series', 'books', 'chapters'].includes(type)) {
                return res.status(400).send({ msg: 'Invalid type specified' });
            }

            const tableName = type;

            const primaryKeyMapping = {
                series: 'series_id',
                books: 'book_id',
                chapters: 'chapter_id'
            };

            const result = await conn.query(`DELETE FROM ${tableName} WHERE ${primaryKeyMapping[type]} = ?`, [id]);

            if (result.affectedRows === 0) {
                return res.status(404).send({ msg: `${type} with ID ${id} not found` });
            }

            res.send({ msg: `${type} with ID ${id} deleted successfully` });
        } catch (err) {
            if (err.code === 'ER_ROW_IS_REFERENCED_2') {
                return res.status(409).send({ msg: `${type} with ID ${id} is referenced in another table` });
            }
            next(err);
        } finally {
            if (conn) conn.end();
        }
    });

   router.get('/backup-db', validate, async (req, res, next) => {
        const dumpFile = path.join(__dirname, 'backup.sql');
        const excludedTables = ['users', 'sessions'];
        const ignoreTables = excludedTables.map(table => `--ignore-table=${process.env.DB_NAME}.${table}`).join(' ');
    
        const command = `mariadb-dump -u ${process.env.DB_USER} -p${process.env.DB_PASSWORD} ${process.env.DB_NAME} ${ignoreTables} > ${dumpFile}`;
    
        exec(command, (error, stdout, stderr) => {
            if (error) {
                return next(error);
            }
            res.download(dumpFile, 'backup.sql', (err) => {
                if (err) {
                    next(err);
                } else {
                    fs.unlinkSync(dumpFile);
                }
            });
        });
    });

    return router;
};