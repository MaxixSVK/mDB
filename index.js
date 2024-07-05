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

pool.getConnection()
    .then(conn => {
        console.log('Server-chan: Connected to the DB!');
        conn.release(); 
    })
    .catch(err => {
        console.error('Server-chan: Error connecting to the DB:', err);
    });

app.get('/', (req, res) => {
    res.send('mDatabase-chan: Ahoooj!');
});

app.get('/data', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const query = `
        SELECT series.series_id, series.seriesName, series.img, 
               books.book_id, books.name AS bookName, books.startedReading, books.endedReading, 
               chapters.chapter_id, chapters.name AS chapterName, chapters.date
        FROM series
        LEFT JOIN books ON series.series_id = books.series_id
        LEFT JOIN chapters ON books.book_id = chapters.book_id
        ORDER BY series.series_id, books.book_id, chapters.chapter_id;
    `;
        const rows = await conn.query(query);

        const seriesData = {};
        rows.forEach(row => {
            if (!seriesData[row.series_id]) {
                seriesData[row.series_id] = {
                    series_id: row.series_id,
                    seriesName: row.seriesName,
                    img: row.img,
                    books: {}
                };
            }
            if (row.book_id && !seriesData[row.series_id].books[row.book_id]) {
                seriesData[row.series_id].books[row.book_id] = {
                    book_id: row.book_id,
                    name: row.bookName,
                    startedReading: row.startedReading ? formatDateToLocal(row.startedReading) : null,
                    endedReading: row.endedReading ? formatDateToLocal(row.endedReading) : null,
                    chapters: []
                };
            }
            if (row.chapter_id) {
                seriesData[row.series_id].books[row.book_id].chapters.push({
                    chapter_id: row.chapter_id,
                    name: row.chapterName,
                    date: row.date ? formatDateToLocal(row.date) : null
                });
            }
        });

        function formatDateToLocal(date) {
            return new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
                .toISOString()
                .split("T")[0];
        }

        const seriesArray = Object.values(seriesData).map(series => ({
            ...series,
            books: Object.values(series.books)
        }));

        res.send(seriesArray);
    } catch (err) {
        console.log(err);
        res.status(500).send('Error reading data');
    } finally {
        if (conn) conn.end();
    }
});

const apiKey = process.env.API_KEY;

function checkApiKey(req, res, next) {
    if (req.headers['api-key'] === apiKey) {
        next();
    } else {
        res.status(401).send('Invalid API key');
    }
}

app.post('/admin', checkApiKey , async (req, res) => {
    res.status(200).send('OK');
});

app.post('/add-data', checkApiKey, async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { type, ...data } = req.body;

        switch (type) {
            case 'series':
                if (!data.seriesName) return res.status(400).send('Missing series name');
                await conn.query('INSERT INTO series (seriesName, img) VALUES (?, ?)', [data.seriesName, data.img]);
                break;
            case 'book':
                if (!data.name || !data.series_id) return res.status(400).send('Missing book name or series ID');
                await conn.query('INSERT INTO books (name, startedReading, endedReading, series_id) VALUES (?, ?, ?, ?)', [data.name, data.startedReading, data.endedReading, data.series_id]);
                break;
            case 'chapter':
                if (!data.name || !data.book_id) return res.status(400).send('Missing chapter name or book ID');
                await conn.query('INSERT INTO chapters (name, date, book_id) VALUES (?, ?, ?)', [data.name, data.date, data.book_id]);
                break;
            default:
                return res.status(400).send('Invalid type specified');
        }

        res.send(`${type} added successfully`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error adding data');
    } finally {
        if (conn) conn.end();
    }
});

app.put('/update-data/:type/:id', checkApiKey, async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { type, id } = req.params;
        const { name, startedReading, endedReading, date } = req.body;

        switch (type) {
            case 'series':
                await conn.query('UPDATE series SET seriesName = ? WHERE series_id = ?', [name, id]);
                break;
            case 'book':
                await conn.query('UPDATE books SET name = ?, startedReading = ?, endedReading = ? WHERE book_id = ?', [name, startedReading, endedReading, id]);
                break;
            case 'chapter':
                await conn.query('UPDATE chapters SET name = ?, date = ? WHERE chapter_id = ?', [name, date, id]);
                break;
            default:
                return res.status(400).send('Invalid type specified');
        }

        res.send(`${type} updated successfully`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error updating data');
    } finally {
        if (conn) conn.end();
    }
});


app.delete('/delete-data/:type/:id', checkApiKey, async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { type, id } = req.params;

        switch (type) {
            case 'series':
                await conn.query('DELETE FROM series WHERE series_id = ?', [id]);
                break;
            case 'book':
                await conn.query('DELETE FROM books WHERE book_id = ?', [id]);
                break;
            case 'chapter':
                await conn.query('DELETE FROM chapters WHERE chapter_id = ?', [id]);
                break;
            default:
                return res.status(400).send('Invalid type specified');
        }

        res.send(`${type} deleted successfully`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error deleting data');
    } finally {
        if (conn) conn.end();
    }
});

app.get('/list-series', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const query = 'SELECT series_id, seriesName FROM series';
        const rows = await conn.query(query);
        res.send(rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error reading data');
    } finally {
        if (conn) conn.end();
    }
});

app.get('/list-books/:series_id', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { series_id } = req.params;
        const query = 'SELECT book_id, name FROM books WHERE series_id = ?';
        const rows = await conn.query(query, [series_id]);
        res.send(rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error reading data');
    } finally {
        if (conn) conn.end();
    }
});

app.use((req, res, next) => {
    res.status(404).send({ msg: '404-chan: Nenašla som to!' });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({ msg: '500-chan: Niečo sa pokazilo!' });
});

app.listen(7000, () => {
    console.log('Server-chan: Listening on port 7000');
});