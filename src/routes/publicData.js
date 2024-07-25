const express = require('express');
const router = express.Router();

module.exports = function (pool) {
    router.get('/data', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const query = `
            SELECT series.series_id, series.seriesName, series.img, series.seriesType, 
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
                        seriesType: row.seriesType,
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

            let seriesArray = Object.values(seriesData).map(series => ({
                ...series,
                books: Object.values(series.books)
            }));

            if (req.query.clear === 'true') {
                seriesArray = seriesArray.map(series => ({
                    seriesName: series.seriesName,
                    img: series.img,
                    books: series.books.map(book => ({
                        name: book.name,
                        startedReading: book.startedReading,
                        endedReading: book.endedReading,
                        chapters: book.chapters.map(chapter => ({
                            name: chapter.name,
                            date: chapter.date
                        }))
                    }))
                }));
            }

            res.send(seriesArray);
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.end();
        }
    });

    router.get('/list-series', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const query = 'SELECT series_id, seriesName FROM series';
            const rows = await conn.query(query);
            res.send(rows);
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.end();
        }
    });

    router.get('/list-books/:series_id', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const { series_id } = req.params;
            const query = 'SELECT book_id, startedReading, endedReading, name FROM books WHERE series_id = ?';
            const rows = await conn.query(query, [series_id]);
            res.send(rows);
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.end();
        }
    });

    router.get('/list-chapters/:book_id', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const { book_id } = req.params;
            const query = 'SELECT chapter_id, date, name FROM chapters WHERE book_id = ?';
            const rows = await conn.query(query, [book_id]);
            res.send(rows);
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.end();
        }
    });


    return router;
};