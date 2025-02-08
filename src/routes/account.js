const router = require('express').Router();
const bcrypt = require('bcrypt');

module.exports = function (pool) {
    const validateToken = require('../middleware/checkToken')(pool);
    router.use(validateToken);

    router.get('/', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const [user] = await conn.query(
                'SELECT id, username, email, role FROM users WHERE id = ?',
                [req.userId]
            );

            res.success(user);
        } catch (error) {
            next(error);
        } finally {
            if (conn) conn.release();
        }
    });

    router.get('/validate', (req, res) => {
        res.success({ userId: req.userId, sessionId: req.sessionId });
    });

    router.get('/logout', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            await conn.query(
                'DELETE FROM sessions WHERE user_id = ? AND id = ?',
                [req.userId, req.sessionId]
            );

            res.success({ msg: 'Logged out' });
        } catch (error) {
            next(error);
        } finally {
            if (conn) conn.release();
        }
    });

    router.get('/logout-all', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            await conn.query(
                'DELETE FROM sessions WHERE user_id = ?',
                [req.userId]
            );

            res.success({ msg: 'Logged out from all devices' });
        } catch (error) {
            next(error);
        } finally {
            if (conn) conn.release();
        }
    });

    router.get('/sessions', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const data = await conn.query(
                'SELECT id, created_at, user_agent, ip_address FROM sessions WHERE user_id = ? AND expires_at > NOW()',
                [req.userId]
            );

            res.success(data);
        } catch (error) {
            next(error);
        } finally {
            if (conn) conn.release();
        }
    });

    router.post('/session-destroy', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            await connection.query(
                'DELETE FROM sessions WHERE user_id = ? AND id = ?',
                [req.userId, req.body.sessionId]
            );

            res.success({ msg: 'Session destroyed' });
        } catch (error) {
            next(error);
        } finally {
            if (conn) conn.release();
        }
    });

    router.put('/change-password', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const [user] = await conn.query(
                'SELECT password_hash FROM users WHERE id = ?',
                [req.userId]
            );

            if (!await bcrypt.compare(req.body.oldPassword, user.password_hash)) {
                return res.error('Invalid old password', 401);
            }

            const hashedPassword = await bcrypt.hash(req.body.newPassword, 10);
            await conn.query(
                'UPDATE users SET password_hash = ? WHERE id = ?',
                [hashedPassword, req.userId]
            );

            res.success({ msg: 'Password changed' });
        } catch (error) {
            next(error);
        } finally {
            if (conn) conn.release();
        }
    });

    return router;
};