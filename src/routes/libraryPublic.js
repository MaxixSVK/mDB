const router = require('express').Router();

module.exports = function (pool) {
    const validateToken = require('../middleware/checkToken')(pool, 'viewOnly');
    router.use(validateToken);

    router.get('/user/:username', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const { username } = req.params;
            const [userData] = await conn.query('SELECT id, public, pfp FROM users WHERE username = ?', [username]);
            if (!userData) {
                return res.error('User does not exist', 404);
            }

            if (userData.public || req.userId == userData.id) {
                const seriesList = await conn.query('SELECT series_id, user_id FROM series WHERE user_id = ?', [userData.id]);
                userData.series = seriesList.map(series => series.series_id);
            }

            res.success(userData);
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    router.get('/user/search/:user_id/:search', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const { user_id, search } = req.params;
            const query = `
        SELECT series.series_id, books.book_id, chapters.chapter_id
        FROM series
        LEFT JOIN books ON series.series_id = books.series_id
        LEFT JOIN chapters ON books.book_id = chapters.book_id
        WHERE (series.name LIKE ? OR books.name LIKE ? OR chapters.name LIKE ? OR books.isbn LIKE ?)
          AND series.user_id = ?
        ORDER BY series.series_id, books.book_id, chapters.chapter_id;
        `;
            let searchTerm = "%" + search + "%";
            const data = await conn.query(query, [searchTerm, searchTerm, searchTerm, searchTerm, user_id]);

            const [{ public }] = await conn.query('SELECT public FROM users WHERE id = ?', [user_id]);
            if (!public && req.userId != user_id) {
                return res.error('You do not have access to view this data', 403);
            }

            const seriesMap = new Map();
            for (const row of data) {
                if (!seriesMap.has(row.series_id)) {
                    seriesMap.set(row.series_id, new Map());
                }
                const booksMap = seriesMap.get(row.series_id);
                if (row.book_id && !booksMap.has(row.book_id)) {
                    booksMap.set(row.book_id, []);
                }
                if (row.book_id && row.chapter_id) {
                    booksMap.get(row.book_id).push(row.chapter_id);
                }
            }

            const searchResult = [];
            for (const [series_id, booksMap] of seriesMap.entries()) {
                const booksArr = [];
                for (const [book_id, chaptersArr] of booksMap.entries()) {
                    booksArr.push([book_id, chaptersArr]);
                }
                searchResult.push([series_id, booksArr]);
            }
            res.success(searchResult);
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    router.get('/series/:series_id', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const { series_id } = req.params;
            const [seriesData] = await conn.query('SELECT * FROM series WHERE series_id = ?', [series_id]);
            if (!seriesData) {
                return res.error('Entry does not exist', 404);
            }

            const [{ public }] = await conn.query('SELECT public FROM users WHERE id = ?', [seriesData.user_id]);
            if (!public && req.userId !== seriesData.user_id) {
                return res.error('You do not have access to view this data', 403);
            }

            const bookList = await conn.query('SELECT book_id FROM books WHERE series_id = ?', [series_id]);
            seriesData.books = bookList.map(book => book.book_id);

            res.success(seriesData);
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
            const [bookData] = await conn.query('SELECT * FROM books WHERE book_id = ?', [book_id]);
            if (!bookData) {
                return res.error('Entry does not exist', 404);
            }

            const [{ public }] = await conn.query('SELECT public FROM users WHERE id = ?', [bookData.user_id]);
            if (!public && req.userId !== bookData.user_id) {
                return res.error('You do not have access to view this data', 403);
            }

            const chapterList = await conn.query('SELECT chapter_id FROM chapters WHERE book_id = ?', [book_id]);
            bookData.chapters = chapterList.map(chapter => chapter.chapter_id);

            res.success(bookData);
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
            if (!data) {
                return res.error('Entry does not exist', 404);
            }

            const [{ public }] = await conn.query('SELECT public FROM users WHERE id = ?', [data.user_id]);
            if (!public && req.userId !== data.user_id) {
                return res.error('You do not have access to view this data', 403);
            }

            res.success(data);
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    router.get('/user/authors/:user_id', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const { user_id } = req.params;
            const data = await conn.query('SELECT author_id, user_id FROM authors WHERE user_id = ?', [user_id]);
            if (data.length === 0) {
                return res.error('Entries does not exist', 200);
            }

            const [{ public }] = await conn.query('SELECT public FROM users WHERE id = ?', [data[0].user_id]);
            if (!public && req.userId !== data[0].user_id) {
                return res.error('You do not have access to view this data', 403);
            }

            const authorIds = data.map(row => row.author_id);
            res.success(authorIds);
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
            if (!data) {
                return res.error('Entry does not exist', 404);
            }

            const [{ public }] = await conn.query('SELECT public FROM users WHERE id = ?', [data.user_id]);
            if (!public && req.userId !== data.user_id) {
                return res.error('You do not have access to view this data', 403);
            }

            res.success(data);
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    router.get('/stats/:user_id', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const { user_id } = req.params;
            const query = `
            SELECT 
            (SELECT COUNT(series_id) FROM series WHERE user_id = ?) as seriesCount,
            (SELECT COUNT(book_id) FROM books WHERE user_id = ?) as bookCount,
            (SELECT COUNT(chapter_id) FROM chapters WHERE user_id = ?) as chapterCount,
            (SELECT COUNT(series_id) FROM series WHERE user_id = ? AND format = 'manga') as mangaCount,
            (SELECT COUNT(series_id) FROM series WHERE user_id = ? AND format = 'lightNovel') as lightNovelCount;
        `;

            const [data] = await conn.query(query, [user_id, user_id, user_id, user_id, user_id]);
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

    router.get('/stats/month/:user_id/:year', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const { user_id, year } = req.params;
            const query = `
                SELECT 
                    DATE_FORMAT(date, '%Y-%m') as month,
                    COUNT(chapter_id) as chapters
                FROM chapters
                WHERE YEAR(date) = ? AND user_id = ?
                GROUP BY month
                ORDER BY month;
            `;

            const data = await conn.query(query, [year, user_id]);
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

    router.get('/explore/users', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const data = await conn.query('SELECT id, username, pfp FROM users WHERE public = 1');

            res.success(data);
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    return router;
};