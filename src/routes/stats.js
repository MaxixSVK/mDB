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

    router.get('/format{/:user_id}', async (req, res, next) => {
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
            (SELECT COUNT(series_id) FROM series WHERE user_id = ? AND format = 'manga') as manga,
            (SELECT COUNT(series_id) FROM series WHERE user_id = ? AND format = 'lightNovel') as lightNovel;
            `

            const [data] = await conn.query(query, [user_id, user_id]);
            const stats = {
                manga: Number(data.manga),
                lightNovel: Number(data.lightNovel)
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