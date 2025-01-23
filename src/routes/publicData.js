const express = require('express');
const router = express.Router();

module.exports = function (pool) {
    router.get('/series', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const query = 'SELECT series_id FROM series';
            const rows = await conn.query(query);
            const seriesIds = rows.map(row => row.series_id);
            res.success(seriesIds);
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.end();
        }
    });

    router.get('/series/formats', async (req, res, next) => {
        const allowedFormats = [
            { format: 'lightNovel', name: 'Light Novel', pluralName: 'Light Novels' },
            { format: 'manga', name: 'Manga', pluralName: 'Manga' }
        ];
        res.success(allowedFormats);
    });

    router.get('/series/:series_id', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const { series_id } = req.params;
            const query = 'SELECT * FROM series WHERE series_id = ?';
            const rows = await conn.query(query, [series_id]);

            if (rows.length === 0) {
                return res.error('Series not found', 404);
            }

            res.success(rows[0]);
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
            res.success(bookIds);
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
                return res.error('Book not found', 404);
            }

            rows[0].startedReading = rows[0].startedReading || null;
            rows[0].endedReading = rows[0].endedReading || null;

            res.success(rows[0]);
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
            res.success(chapterIds);
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
                return res.error('Chapter not found', 404);
            }

            rows[0].date = rows[0].date || null;

            res.success(rows[0]);
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
                return res.error('No results found', 404);
            }

            res.success(seriesArray);
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
                (SELECT COUNT(series_id) FROM series WHERE format = 'manga') as mangaCount,
                (SELECT COUNT(series_id) FROM series WHERE format = 'lightNovel') as lightNovelCount;
            `;

            const rows = await conn.query(query);
            const stats = {
                seriesCount: rows[0].seriesCount.toString(),
                bookCount: rows[0].bookCount.toString(),
                chapterCount: rows[0].chapterCount.toString(),
                mangaCount: rows[0].mangaCount.toString(),
                lightNovelCount: rows[0].lightNovelCount.toString()
            };
            res.success(stats);

        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    router.get('/stats/month/:year?', async (req, res, next) => {
        let conn;
        try {
            const year = req.params.year || new Date().getFullYear();
            conn = await pool.getConnection();
            const query = `
                SELECT 
                    DATE_FORMAT(date, '%Y-%m') as month,
                    COUNT(chapter_id) as chapterCount
                FROM chapters
                WHERE YEAR(date) = ?
                GROUP BY month
                ORDER BY month;
            `;

            const rows = await conn.query(query, [year]);
            const formattedRows = rows.map(row => ({
                ...row,
                chapterCount: row.chapterCount.toString()
            }));
            res.success(formattedRows);

        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    return router;
};