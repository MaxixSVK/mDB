const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = function (pool) {
    const validate = require('../auth/tokenValidation')(pool, admin = true);

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