const router = require('express').Router();

module.exports = function (pool) {
    const validateToken = require('../middleware/checkToken')(pool, 'viewOnly');
    router.use(validateToken);

    router.get('{/:user_id}', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const user_id = req.params.user_id || req.userId;

            const [user] = await conn.query('SELECT public FROM users WHERE id = ?', [user_id]);
            if (!user) {
                return res.error('User not found', 404);
            }
            if (!user.public && req.userId !== user_id) {
                return res.error('You do not have access to view this data', 403);
            }

            const query = `
            SELECT 
            (SELECT COUNT(series_id) FROM series WHERE user_id = ?) as series,
            (SELECT COUNT(book_id) FROM books WHERE user_id = ?) as book,
            (SELECT COUNT(chapter_id) FROM chapters WHERE user_id = ?) as chapter;
            `;

            const [data] = await conn.query(query, [user_id, user_id, user_id, user_id, user_id]);
            const stats = {
                series: Number(data.series),
                book: Number(data.book),
                chapter: Number(data.chapter),
            };

            res.success(stats);
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    router.get('/status{/:user_id}', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const user_id = req.params.user_id || req.userId;

            const [user] = await conn.query('SELECT public FROM users WHERE id = ?', [user_id]);
            if (!user) {
                return res.error('User not found', 404);
            }
            if (!user.public && req.userId !== user_id) {
                return res.error('You do not have access to view this data', 403);
            }

            const query = `
            SELECT 
            (SELECT COUNT(series_id) FROM series WHERE user_id = ? AND status = 'reading') as reading,
            (SELECT COUNT(series_id) FROM series WHERE user_id = ? AND status = 'finished') as finished,
            (SELECT COUNT(series_id) FROM series WHERE user_id = ? AND status = 'stopped') as stopped,
            (SELECT COUNT(series_id) FROM series WHERE user_id = ? AND status = 'paused') as paused;
            `;

            const [data] = await conn.query(query, [user_id, user_id, user_id, user_id]);
            const stats = {
                reading: Number(data.reading),
                finished: Number(data.finished),
                stopped: Number(data.stopped),
                paused: Number(data.paused)
            };

            res.success(stats);
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
            const series_id = req.params.series_id;

            const [seriesUser] = await conn.query('SELECT user_id FROM series WHERE series_id = ?', [series_id]);
            if (!seriesUser) {
                return res.error('Series not found', 404);
            }

            const [user] = await conn.query('SELECT public FROM users WHERE id = ?', [seriesUser.user_id]);
            if (!user.public && req.userId !== seriesUser.user_id) {
                return res.error('You do not have access to view this data', 403);
            }

            const seriesQuery = 'SELECT name, format, status, img, author_id FROM series WHERE series_id = ?';
            const [series] = await conn.query(seriesQuery, [series_id]);

            const statsQuery = `
            SELECT 
            (SELECT COUNT(book_id) FROM books WHERE series_id = ?) as books,
            (SELECT COUNT(chapters.chapter_id)
             FROM chapters
             JOIN books ON chapters.book_id = books.book_id
             WHERE books.series_id = ?) as chapters,
            (SELECT COALESCE(SUM(total_pages), 0) FROM books WHERE series_id = ?) as pages,
            (SELECT COALESCE(SUM(current_page), 0) FROM books WHERE series_id = ?) as pages_read;
            `;

            const [statsData] = await conn.query(statsQuery, [series_id, series_id, series_id, series_id]);
            const stats = {
                ...series,
                books: Number(statsData.books),
                chapters: Number(statsData.chapters),
                pages: Number(statsData.pages),
                pages_read: Number(statsData.pages_read),
            };

            res.success(stats);
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    return router;
};