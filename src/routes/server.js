const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const logger = require('../logger');
const { backupDatabase } = require('../backup/db');

const configFilePath = path.join(__dirname, '../../config.json');
let configFile = require(configFilePath);

module.exports = function (pool) {
    const validate = require('../middleware/checkToken')(pool, admin = true);

    router.get('/config', validate, (req, res, next) => {
        res.json(configFile);
    });

    router.put('/config', validate, (req, res, next) => {
        const { body } = req;
    
        try {
            for (let key in body) {
                configFile[key] = body[key];
            }
    
            fs.writeFile(configFilePath, JSON.stringify(configFile, null, 2), (err) => {
                if (err) {
                    logger.error('Failed to update config file by ACP:', err);
                    return res.error('Failed to update config file', 500);
                }
                logger.info('Config file updated by ACP');
                res.json(configFile);
            });
        } catch (error) {
            next(error);
        }
    });

    router.get('/backup-db', validate, async (req, res, next) => {
        let backupFile;
        try {
            backupFile = await backupDatabase();
            const date = new Date().toISOString().split('T')[0];
            const fileName = `mdb-db-backup-${date}.sql`;
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

    router.get('/logs', validate, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const { limit = 10, offset = 0, all = 'false', format = 'file' } = req.query;

            let sql;
            let params;

            if (all === 'true') {
                sql = `SELECT * FROM logs ORDER BY change_date DESC`;
                params = [];
            } else {
                sql = `SELECT * FROM logs ORDER BY change_date DESC LIMIT ? OFFSET ?`;
                params = [parseInt(limit), parseInt(offset)];
            }

            const logs = await conn.query(sql, params);

            if (format === 'file') {
                const filePath = path.join(__dirname, 'logs.json');
                fs.writeFileSync(filePath, JSON.stringify(logs, null, 2));
                res.download(filePath, 'logs.json', err => {
                    if (err) {
                        next(err);
                    } else {
                        fs.unlinkSync(filePath);
                    }
                });
            } else {
                res.success(logs);
            }
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.end();
        }
    });

    router.get('/restart', validate, (req, res, next) => {
        logger.info('Request to restart server from ACP, restarting...');
        res.json({ message: 'Restarting server...' });
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    });

    return router;
};