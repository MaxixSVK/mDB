const fs = require('fs');
const path = require('path');
const router = require('express').Router();
const bcrypt = require('bcrypt');

module.exports = function (pool) {
    const validateToken = require('../middleware/checkToken')(pool);
    const requireAdditionalSecurity = require('../middleware/requireAdditionalSecurity')(pool);
    router.use(validateToken);

    const sendEmail = require('../utils/sendEmail');

    router.get('/', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const [user] = await conn.query(
                'SELECT id, username, email, role, public FROM users WHERE id = ?',
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
            const [result] = await conn.query(
                'DELETE FROM sessions WHERE user_id = ? AND id = ?',
                [req.userId, req.body.sessionId]
            );

            if (result.affectedRows === 0) {
                return res.error('Session not found', 404);
            }

            res.success({ msg: 'Session destroyed' });
        } catch (error) {
            next(error);
        } finally {
            if (conn) conn.release();
        }
    });

    router.put('/change-password', requireAdditionalSecurity, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
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

    router.put('/public-status', async (req, res, next) => {
        let conn;
        try {
            const publicValue = req.body.public ? 1 : 0;
            conn = await pool.getConnection();
            await conn.query(
                'UPDATE users SET public = ? WHERE id = ?',
                [publicValue, req.userId]
            );
            res.success({ msg: 'Profile public status updated', public: publicValue });
        } catch (error) {
            next(error);
        } finally {
            if (conn) conn.release();
        }
    });

    router.delete('/delete', requireAdditionalSecurity, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();

            [user] = await conn.query(
                'SELECT username, email FROM users WHERE id = ?',
                [req.userId]
            );

            const deleteQueries = [
                'DELETE FROM logs WHERE user_id = ?',
                'DELETE FROM chapters WHERE user_id = ?',
                'DELETE FROM books WHERE user_id = ?',
                'DELETE FROM series WHERE user_id = ?',
                'DELETE FROM authors WHERE user_id = ?',
                'DELETE FROM sessions WHERE user_id = ?',
                'DELETE FROM users WHERE id = ?'
            ];

            for (const query of deleteQueries) {
                await conn.query(query, [req.userId]);
            }

            await conn.commit();
            res.success({ msg: 'Account deleted successfully' });

            async function sendDeletionEmail() {
                const year = new Date().getFullYear();

                const emailTemplate = fs.readFileSync(path.join(__dirname, '../emailTemplates/delete.html'), 'utf8');
                const emailHtml = emailTemplate
                    .replace('{{username}}', user.username)
                    .replace('{{year}}', year);

                const emailText = `
                Hello ${user.username},

                We're sorry to see you go. Your account has been successfully deleted.

                If you have any questions or need further assistance, feel free to contact our support team.

                ${year} mDatabase`.trim();

                await sendEmail(
                    user.email,
                    'Account Deleted',
                    emailText,
                    emailHtml
                );
            }

            sendDeletionEmail();
        } catch (error) {
            if (conn) await conn.rollback();
            next(error);
        } finally {
            if (conn) conn.release();
        }
    });

    return router;
};