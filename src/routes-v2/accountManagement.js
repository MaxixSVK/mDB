const router = require('express').Router();
const bcrypt = require('bcrypt');

module.exports = function (pool) {
    const validate = require('../auth/tokenValidation')(pool);

    router.get('/validate', validate, (req, res) => {
        res.status(200).send({ userId: req.userId, sessionId: req.sessionId });
    });

    router.get('/', validate, async (req, res, next) => {
        try {
            const connection = await pool.getConnection();
            const rows = await connection.query(
                'SELECT username, email FROM users WHERE id = ?',
                [req.userId]
            );
            connection.release();

            res.status(200).send(rows[0]);
        } catch (error) {
            next(error);
        }
    });

    router.get('/logout', validate, async (req, res, next) => {
        try {
            const connection = await pool.getConnection();
            await connection.query(
                'DELETE FROM sessions WHERE user_id = ? AND id = ?',
                [req.userId, req.sessionId]
            );
            connection.release();
    
            res.status(200).send({ msg: 'Logged out' });
        } catch (error) {
            next(error);
        }
    });

    router.get('/logout-all', validate, async (req, res, next) => {
        try {
            const connection = await pool.getConnection();
            await connection.query(
                'DELETE FROM sessions WHERE user_id = ?',
                [req.userId]
            );
            connection.release();
    
            res.status(200).send({ msg: 'Logged out from all devices' });
        } catch (error) {
            next(error);
        }
    });

    router.get('/sessions', validate, async (req, res, next) => {
        try {
            const connection = await pool.getConnection();
            const rows = await connection.query(
                'SELECT id, created_at, user_agent, ip_address FROM sessions WHERE user_id = ? AND expires_at > NOW()',
                [req.userId]
            );
            connection.release();
    
            res.status(200).json(rows);
        } catch (error) {
            next(error);
        }
    });

    router.post('/session-destroy', validate, async (req, res, next) => {
        try {
            const connection = await pool.getConnection();
            await connection.query(
                'DELETE FROM sessions WHERE user_id = ? AND id = ?',
                [req.userId, req.body.sessionId]
            );
            connection.release();
    
            res.status(200).send({ msg: 'Session destroyed' });
        } catch (error) {
            next(error);
        }
    });

    router.put('/change-password', validate, async (req, res, next) => {
        try {
            const connection = await pool.getConnection();
            const rows = await connection.query(
                'SELECT password_hash FROM users WHERE id = ?',
                [req.userId]
            );

            const user = rows[0];
            if (!await bcrypt.compare(req.body.oldPassword, user.password_hash)) {
                connection.release();
                return res.status(400).send({ msg: 'Invalid old password' });
            }
    
            const hashedPassword = await bcrypt.hash(req.body.newPassword, 10);
            await connection.query(
                'UPDATE users SET password_hash = ? WHERE id = ?',
                [hashedPassword, req.userId]
            );
            connection.release();
    
            res.status(200).send({ msg: 'Password changed' });
        } catch (error) {
            next(error);
        }
    });

    return router;
};