const express = require('express');
const cors = require('cors');
const mariadb = require('mariadb');
require('dotenv').config();

const package = require('../package.json');
const responseFormatter = require('./middleware/responseFormatter');
const logger = require('./logger');
const routes = require('./routes.json');

const app = express();
const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 5
});

app.use(cors());
app.use(express.json());
app.use(responseFormatter);

routes.forEach(({ path, route }) => {
    app.use(path, require(route)(pool));
});

app.get('/', (req, res) => {
    res.success(`API ${package.version}`);
});

app.use((req, res, next) => {
    res.error('Not Found', 404);
});

app.use((err, req, res, next) => {
    logger.error(`500 Internal Server Error - ${err}`);
    res.error('Internal Server Error', 500);
});

const startServer = async () => {
    try {
        await pool.getConnection().then(conn => conn.release());
        logger.info('Database connection established');
        app.listen(process.env.PORT, () => {
            logger.info(`Server version ${package.version} started on port ${process.env.PORT}`);
        });
    } catch (err) {
        logger.error(`Database connection error: ${err.message}`);
        process.exit(1);
    }
};

startServer();