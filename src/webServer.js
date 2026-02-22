const path = require('path');
const express = require('express');
const favicon = require('serve-favicon');
require('dotenv').config();


const config = require('../config.json');
const logger = require('./utils/logger');
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
app.use(favicon(path.join(__dirname, '../cdn/web/favicon.png')));

app.get('/api-url', (_req, res) => {
    res.json({ url: process.env.API_HOST });
});

function customRoute(route, htmlFile) {
    app.get(route, (_req, res) => {
        const filePath = path.join(__dirname, '../web', htmlFile);
        res.sendFile(filePath);
    });
}

customRoute('/user/:username', 'index.html');
customRoute('/stats/:username', 'stats.html');
customRoute('/activity/:username', 'activity.html');

app.use((_req, res) => {
    res.status(404).sendFile(path.join(__dirname, '../web/404.html'));
});

app.listen(config.web.port, () => {
    logger.info(`Web server started on port ${config.web.port}`);
});