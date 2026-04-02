const fs = require('fs');
const path = require('path');
const express = require('express');
const favicon = require('serve-favicon');
require('dotenv').config({ quiet: true });

const config = require('../config.json');
const logger = require('./utils/logger');
const app = express();
const webDir = path.join(__dirname, '../web');

const faviconPath = path.join(__dirname, '../cdn/web/favicon.png');
if (fs.existsSync(faviconPath)) {
    app.use(favicon(faviconPath));
}

app.use(express.static(webDir, {
    extensions: ['html']
}));

const pageAliases = new Map([
    ['/user/:username', 'index.html'],
    ['/stats/:username', 'stats.html'],
]);

for (const [route, fileName] of pageAliases) {
    app.get(route, (req, res) => {
        res.sendFile(path.join(webDir, fileName));
    });
}

app.get('/api', (req, res) => {
    res.json({ url: process.env.API_HOST, env: process.env.ENV });
});

app.use((req, res) => {
    res.sendFile(path.join(webDir, '404.html'));
});

app.listen(config.web.port, () => {
    logger.info(`Web server started on port ${config.web.port}`);
});