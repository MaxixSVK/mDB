const express = require('express');
const cors = require('cors');
const mariadb = require('mariadb');
require('dotenv').config();

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

app.use('/', require('./routes/data')(pool));
app.use('/', require('./routes/publicData')(pool));

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

app.listen(7000, () => {
    console.log('Server-chan: Listening on port 7000');
    pool.getConnection()
        .then(conn => {
            console.log('Server-chan: Connected successfully!');
            conn.release();
        })
        .catch(err => {
            console.error('Server-chan: Connection failed -', err);
        });
});