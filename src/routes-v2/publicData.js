const express = require('express');
const router = express.Router();

module.exports = function (pool) {
    router.get('/data', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const query = `
            SELECT series.series_id, series.name, series.img, series.seriesType, series.finished,
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
                        name: row.name,
                        img: row.img,
                        seriesType: row.seriesType,
                        finished: row.finished,
                        books: {}
                    };
                }
                if (row.book_id && !seriesData[row.series_id].books[row.book_id]) {
                    seriesData[row.series_id].books[row.book_id] = {
                        book_id: row.book_id,
                        name: row.bookName,
                        startedReading: row.startedReading || null,
                        endedReading: row.endedReading || null,
                        chapters: []
                    };
                }
                if (row.chapter_id) {
                    seriesData[row.series_id].books[row.book_id].chapters.push({
                        chapter_id: row.chapter_id,
                        name: row.chapterName,
                        date: row.date || null
                    });
                }
            });

            let seriesArray = Object.values(seriesData).map(series => ({
                ...series,
                books: Object.values(series.books)
            }));

            if (req.query.clear === 'true') {
                seriesArray = seriesArray.map(series => ({
                    name: series.name,
                    img: series.img,
                    finished: series.finished,
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

    router.get('/series', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const query = 'SELECT series_id FROM series';
            const rows = await conn.query(query);
            const seriesIds = rows.map(row => row.series_id);
            res.send(seriesIds);
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.end();
        }
    });

    router.get('/series/:series_id', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const { series_id } = req.params;
            const query = 'SELECT * FROM series WHERE series_id = ?';
            const rows = await conn.query(query, [series_id]);

            if (rows.length === 0) {
                res.status(404).send({ msg: 'Series not found' });
                return;
            }

            res.send(rows[0]);
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.end();
        }
    });

    router.get('/books/:series_id', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const { series_id } = req.params;
            const query = 'SELECT book_id FROM books WHERE series_id = ?';
            const rows = await conn.query(query, [series_id]);
            const bookIds = rows.map(row => row.book_id);
            res.send(bookIds);
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.end();
        }
    });

    router.get('/book/:book_id', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const { book_id } = req.params;
            const query = 'SELECT * FROM books WHERE book_id = ?';
            const rows = await conn.query(query, [book_id]);

            if (rows.length === 0) {
                res.status(404).send({ msg: 'Book not found' });
                return;
            }

            rows[0].startedReading = rows[0].startedReading || null;
            rows[0].endedReading = rows[0].endedReading || null;

            res.send(rows[0]);
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.end();
        }
    });

    router.get('/chapters/:book_id', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const { book_id } = req.params;
            const query = 'SELECT chapter_id FROM chapters WHERE book_id = ?';
            const rows = await conn.query(query, [book_id]);
            const chapterIds = rows.map(row => row.chapter_id);
            res.send(chapterIds);
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.end();
        }
    });


    router.get('/chapter/:chapter_id', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const { chapter_id } = req.params;
            const query = 'SELECT * FROM chapters WHERE chapter_id = ?';
            const rows = await conn.query(query, [chapter_id]);

            if (rows.length === 0) {
                res.status(404).send({ msg: 'Chapter not found' });
                return;
            }

            rows[0].date = rows[0].date || null;

            res.send(rows[0]);
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.end();
        }
    });

        router.get('/search/:search', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const { search } = req.params;
            const query = `
            SELECT series.series_id, books.book_id, chapters.chapter_id
            FROM series
            LEFT JOIN books ON series.series_id = books.series_id
            LEFT JOIN chapters ON books.book_id = chapters.book_id
            WHERE series.name LIKE ? OR books.name LIKE ? OR chapters.name LIKE ?
            ORDER BY series.series_id, books.book_id, chapters.chapter_id;
            `;
            const rows = await conn.query(query, [`%${search}%`, `%${search}%`, `%${search}%`]);
    
            const seriesData = {};
            rows.forEach(row => {
                if (!seriesData[row.series_id]) {
                    seriesData[row.series_id] = {
                        series_id: row.series_id,
                        books: {}
                    };
                }
                if (row.book_id && !seriesData[row.series_id].books[row.book_id]) {
                    seriesData[row.series_id].books[row.book_id] = {
                        book_id: row.book_id,
                        chapters: []
                    };
                }
                if (row.chapter_id) {
                    seriesData[row.series_id].books[row.book_id].chapters.push({
                        chapter_id: row.chapter_id
                    });
                }
            });
    
            let seriesArray = Object.values(seriesData).map(series => ({
                series_id: series.series_id,
                books: Object.values(series.books).map(book => ({
                    book_id: book.book_id,
                    chapters: book.chapters.map(chapter => ({
                        chapter_id: chapter.chapter_id
                    }))
                }))
            }));
    
            if (seriesArray.length === 0) {
                res.status(404).send({ msg: 'No results found' });
                return;
            }
    
            res.send(seriesArray);
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.end();
        }
    });

    router.get('/stats', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const query = `
                SELECT 
                (SELECT COUNT(series_id) FROM series) as seriesCount,
                (SELECT COUNT(book_id) FROM books) as bookCount,
                (SELECT COUNT(chapter_id) FROM chapters) as chapterCount,
                (SELECT COUNT(series_id) FROM series WHERE seriesType = 'manga') as mangaCount,
                (SELECT COUNT(series_id) FROM series WHERE seriesType = 'lightNovel') as lightNovelCount;
            `;

            const rows = await conn.query(query);
            const stats = {
                seriesCount: rows[0].seriesCount.toString(),
                bookCount: rows[0].bookCount.toString(),
                chapterCount: rows[0].chapterCount.toString(),
                mangaCount: rows[0].mangaCount.toString(),
                lightNovelCount: rows[0].lightNovelCount.toString()
            };
            res.send(stats);

        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    return router;
};