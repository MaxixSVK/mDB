const express = require('express');
require('dotenv').config();
const path = require('path');

const config = require('../config.json');
const logger = require('./logger');
const app = express();

app.use((req, res, next) => {
    if (path.extname(req.path) === '') {
        const filePath = path.join(__dirname, '../web', req.path + '.html');
        if (require('fs').existsSync(filePath)) {
            return res.sendFile(filePath);
        }
    }
    next();
});

app.use(express.static(path.join(__dirname, '../web')));

app.get('/user/:username', (_req, res) => {
    const filePath = path.join(__dirname, '../web/index.html');
    res.sendFile(filePath);
});

app.get('/stats/:username', (_req, res) => {
    const filePath = path.join(__dirname, '../web/stats.html');
    res.sendFile(filePath);
});

app.use((_req, res) => {
    res.status(404).sendFile(path.join(__dirname, '../web/404.html'));
});

app.listen(config.web.port, () => {
    logger.info(`Web server started on port ${config.web.port}`);
    logger.info(`Web server version ${require('../package.json').version}`);
});