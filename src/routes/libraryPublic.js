const router = require('express').Router();

module.exports = function (pool) {
    router.get('/series', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const data = await conn.query('SELECT series_id FROM series');
            const seriesIds = data.map(row => row.series_id);

            res.success(seriesIds);
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
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
            const [data] = await conn.query('SELECT * FROM series WHERE series_id = ?', [series_id]);

            res.success(data);
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    router.get('/books/:series_id', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const { series_id } = req.params;
            const data = await conn.query('SELECT book_id FROM books WHERE series_id = ?', [series_id]);
            const bookIds = data.map(row => row.book_id);

            res.success(bookIds);
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    router.get('/book/:book_id', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const { book_id } = req.params;
            const query = `
                SELECT 
                    books.*, 
                    series.author_id, 
                    authors.name AS author_name
                FROM books
                LEFT JOIN series ON books.series_id = series.series_id
                LEFT JOIN authors ON series.author_id = authors.author_id
                WHERE books.book_id = ?;
            `;
            const [data] = await conn.query(query, [book_id]);
    
            res.success(data);
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    router.get('/chapters/:book_id', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const { book_id } = req.params;
            const data = await conn.query('SELECT chapter_id FROM chapters WHERE book_id = ?', [book_id]);
            const chapterIds = data.map(row => row.chapter_id);

            res.success(chapterIds);
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    router.get('/chapter/:chapter_id', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const { chapter_id } = req.params;
            const [data] = await conn.query('SELECT * FROM chapters WHERE chapter_id = ?', [chapter_id]);

            res.success(data);
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    //TODO: change reply format
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
            WHERE series.name LIKE ? OR books.name LIKE ? OR chapters.name LIKE ? OR books.isbn LIKE ?
            ORDER BY series.series_id, books.book_id, chapters.chapter_id;
            `;
            const rows = await conn.query(query, [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`]);

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

            res.success(seriesArray);
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
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

            const [data] = await conn.query(query);
            const stats = {
                seriesCount: Number(data.seriesCount),
                bookCount: Number(data.bookCount),
                chapterCount: Number(data.chapterCount),
                mangaCount: Number(data.mangaCount),
                lightNovelCount: Number(data.lightNovelCount)
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
            conn = await pool.getConnection();
            const year = req.params.year || new Date().getFullYear();
            const query = `
                SELECT 
                    DATE_FORMAT(date, '%Y-%m') as month,
                    COUNT(chapter_id) as chapters
                FROM chapters
                WHERE YEAR(date) = ?
                GROUP BY month
                ORDER BY month;
            `;

            const data = await conn.query(query, [year]);
            const stats = data.map(item => ({
                ...item,
                chapters: Number(item.chapters)
            }));

            res.success(stats);
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    router.get('/author/:author_id', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const { author_id } = req.params;
            const [data] = await conn.query('SELECT * FROM authors WHERE author_id = ?', [author_id]);

            res.success(data);
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    router.get('/authors/:user_id', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const { user_id } = req.params;
            const data = await conn.query('SELECT author_id FROM authors WHERE user_id = ?', [user_id]);
            const authorIds = data.map(row => row.author_id);

            res.success(authorIds);
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    return router;
};