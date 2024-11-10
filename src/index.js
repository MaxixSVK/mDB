const express = require('express');
const cors = require('cors');
const mariadb = require('mariadb');
require('dotenv').config();

const config = require('../config.json');

const app = express();
app.use(cors());
app.use(express.json());

const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 5
});

app.use('/', require('./routes/publicData')(pool));
app.use('/account', require('./routes/accountManagement')(pool));
app.use('/auth', require('./routes/auth')(pool));
app.use('/', require('./routes/userData')(pool));

app.use('/cdn', require('./cdn')(pool));

app.get('/', (req, res) => {
    res.send('Server-chan: Hello, world!');
});

app.use((req, res, next) => {
    res.status(404).send({ msg: 'Server-chan: 404 - Not found!'});
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({ msg: 'Server-chan: 500 - Internal Server Error'});
});

app.listen(config.port, () => {
    console.log('Server-chan: Listening on port: ' + config.port);
    pool.getConnection()
        .then(conn => {
            console.log('Server-chan: Connected to MariaDB');
            conn.release();
        })
        .catch(err => {
            console.error('Server-chan: Connection to MariaDB failed');
            process.exit(1)
        });
});