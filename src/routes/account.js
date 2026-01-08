const fs = require('fs');
const path = require('path');
const router = require('express').Router();
const bcrypt = require('bcrypt');

module.exports = function (pool) {
    const config = require('../../config.json');

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

            user.sessionId = req.sessionId;

            res.success(user);
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    router.post('/logout', async (req, res, next) => {
        let conn;
        try {
            const session = req.body.sessionId || req.sessionId;

            conn = await pool.getConnection();
            const result = await conn.query(
                'DELETE FROM sessions WHERE user_id = ? AND id = ?',
                [req.userId, session]
            );

            if (result.affectedRows === 0) {
                return res.error('Session not found', 404);
            }

            res.success({ msg: 'Session destroyed' });
        } catch (err) {
            next(err);
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
        } catch (err) {
            next(err);
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
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    router.put('/change-username', requireAdditionalSecurity, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();

            const [usernameInUse] = await conn.query(
                'SELECT id FROM users WHERE username = ?',
                [req.body.newUsername]
            );

            if (usernameInUse) {
                return res.error('Username is already in use', 409);
            }

            await conn.query(
                'UPDATE users SET username = ? WHERE id = ?',
                [req.body.newUsername, req.userId]
            );
            res.success({ msg: 'Username changed' });
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    router.put('/change-email', requireAdditionalSecurity, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();

            const [emailInUse] = await conn.query(
                'SELECT id FROM users WHERE email = ?',
                [req.body.newEmail]
            );

            if (emailInUse) {
                return res.error('Email is already in use', 409);
            }

            await conn.query(
                'UPDATE users SET email = ? WHERE id = ?',
                [req.body.newEmail, req.userId]
            );
            res.success({ msg: 'Email changed' });
        } catch (err) {
            next(err);
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
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    router.get('/logs', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const { limit = 10, offset = 0, all = 'false', format = 'file' } = req.query;

            let sql;
            let params;

            if (all === 'true') {
                sql = `SELECT * FROM logs WHERE user_id = ? ORDER BY change_date DESC`;
                params = [req.userId];
            } else {
                sql = `SELECT * FROM logs WHERE user_id = ? ORDER BY change_date DESC LIMIT ? OFFSET ?`;
                params = [req.userId, parseInt(limit), parseInt(offset)];
            }

            const logs = await conn.query(sql, params);

            if (format === 'file') {
                const filePath = path.join(__dirname, 'logs.json');
                fs.writeFileSync(filePath, JSON.stringify(logs, null, 2));
                res.download(filePath, 'logs.json', err => {
                    fs.unlinkSync(filePath);
                });
            } else {
                res.success(logs);
            }
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.end();
        }
    });

    router.delete('/delete', requireAdditionalSecurity, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();

            const [user] = await conn.query(
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
                const email = user.email;
                const emailSubject = 'Your Account Has Been Deleted';
                const year = new Date().getFullYear();

                const textTemplatePath = path.join(__dirname, '../emailTemplates/delete.txt');
                const emailText = fs.readFileSync(textTemplatePath, 'utf8')
                    .replace('{{username}}', user.username)
                    .replace('{{year}}', year);

                const htmlTemplatePath = fs.readFileSync(path.join(__dirname, '../emailTemplates/delete.html'), 'utf8');
                const emailHtml = htmlTemplatePath
                    .replace('{{username}}', user.username)
                    .replace('{{year}}', year);

                await sendEmail(email, emailSubject, emailText, emailHtml);
            }

            if (config.api.email.enabled) await sendDeletionEmail();
        } catch (err) {
            if (conn) await conn.rollback();
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    return router;
};