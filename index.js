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

app.get('/', (req, res) => {
    res.send('mDatabase-chan: Ahoooj!');
});

app.get('/data', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const query = `
            SELECT Series.series_id, Series.seriesName, Series.img, 
                   Books.book_id, Books.name AS bookName, Books.startedReading, Books.endedReading, 
                   Chapters.chapter_id, Chapters.name AS chapterName, Chapters.date
            FROM Series
            LEFT JOIN Books ON Series.series_id = Books.series_id
            LEFT JOIN Chapters ON Books.book_id = Chapters.book_id
            ORDER BY Series.series_id, Books.book_id, Chapters.chapter_id;
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
                    startedReading: row.startedReading ? row.startedReading.toISOString().split('T')[0] : null,
                    endedReading: row.endedReading ? row.endedReading.toISOString().split('T')[0] : null,
                    chapters: []
                };
            }
            if (row.chapter_id) {
                seriesData[row.series_id].books[row.book_id].chapters.push({
                    chapter_id: row.chapter_id,
                    name: row.chapterName,
                    date: row.date ? row.date.toISOString().split('T')[0] : null
                });
            }
        });

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

app.post('/data', (req, res) => {
    if (req.headers['api-key'] !== apiKey) {
        res.status(401).send('Unauthorized');
        return;
    }
    fs.writeFile('data.json', JSON.stringify(req.body), 'utf8', (err) => {
        if (err) {
            res.status(500).send('Error saving data');
        } else {
            res.send('Data saved successfully');
        }
    });
});

app.listen(7000, () => {
    console.log('mDatabase-chan: Bežím na porte 7000');
});