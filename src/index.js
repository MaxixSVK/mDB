const express = require('express');
const cors = require('cors');
const mariadb = require('mariadb');
require('dotenv').config({ quiet: true });

const { automaticBackup } = require('./backup/automaticBackup');
const config = require('../config.json');
const package = require('../package.json');
const responseFormatter = require('./middleware/responseFormatter');
const logger = require('./utils/logger');
const routes = require('./routes.json');

const app = express();
const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    connectionLimit: 5
});

app.use(cors());
app.use(express.json());
app.use(responseFormatter);

let endpoints = [];

routes.forEach(({ path, route }) => {
    const router = require(route)(pool);
    app.use(path, router);

    router.stack.forEach(middleware => {
        if (middleware.route) {
            const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();

            endpoints.push({
                method: methods,
                router: path,
                path: `${path}${middleware.route.path}`
            });
        }
    });
});

app.get('/', (req, res) => {
    res.success({ name: package.name, version: package.version }, 'API is running');
});

app.get('/docs', (req, res) => {
    res.success(endpoints);
});

app.use((req, res, next) => {
    res.empty();
});

app.use((err, req, res, next) => {
    logger.error(`500 Internal Server Error - ${err}`);
    res.error(500, 'Internal Server Error');
});

const startServer = async () => {
    let conn;
    try {
        conn = await pool.getConnection();
        logger.info('Database connection established');
        app.listen(config.api.port, () => {
            logger.info(`API started on port ${config.api.port}`);
            logger.info(`Server version ${package.version}`);
            automaticBackup();
        });
    } catch (err) {
        logger.error(`Error starting server: ${err}`);
        process.exit(1);
    } finally {
        if (conn) conn.release();
    }
};

startServer();