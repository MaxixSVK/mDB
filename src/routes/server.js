const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const logger = require('../logger');
const { log } = require('console');

const configFilePath = path.join(__dirname, '../../config.json');
let configFile = require(configFilePath);

module.exports = function (pool) {
    const validate = require('../middleware/checkToken')(pool, admin = true);

    router.get('/config', validate, (req, res, next) => {
        res.json(configFile);
    });

    router.put('/config', validate, (req, res, next) => {
        const { body } = req;

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