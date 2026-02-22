const os = require('os');
const fs = require('fs');
const path = require('path');
const router = require('express').Router();
const bcrypt = require('bcrypt');
const archiver = require('archiver');

module.exports = function (pool) {
    const config = require('../../config.json');

    const validateToken = require('../middleware/checkToken')(pool);
    router.use(validateToken);

    const requireAdditionalSecurity = require('../middleware/requireAdditionalSecurity')(pool);
    const sendEmail = require('../utils/sendEmail');
    const newAccountLog = require('../utils/accountLogs');
    const getUserFiles = require('../utils/getUserFiles');

    router.get('/', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const [user] = await conn.query(
                'SELECT id, username, email, public, pfp FROM users WHERE id = ?',
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

            newAccountLog(req.userId, 'logout', true, req.ipAddress, req.userAgent, pool);
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

            newAccountLog(req.userId, 'change_password', true, req.ipAddress, req.userAgent, pool);
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

            newAccountLog(req.userId, 'change_username', true, req.ipAddress, req.userAgent, pool);
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

            newAccountLog(req.userId, 'change_email', true, req.ipAddress, req.userAgent, pool);
            res.success({ msg: 'Email changed' });
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    router.put('/pfp/reset', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            await conn.query(
                'UPDATE users SET pfp = FALSE WHERE id = ?',
                [req.userId]
            );

            const fileName = `u-${req.userId}.png`;
            const filePath = path.join(__dirname, '../../cdn/users/pfp', fileName);

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            res.success({ msg: 'Profile picture reset to default' });
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

    router.get('/logs/auth', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const logs = await conn.query(
                'SELECT type, success, ip_address, user_agent, created_at FROM account_logs WHERE user_id = ? ORDER BY created_at DESC',
                [req.userId]
            );

            res.success(logs);
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    router.get('/logs/changes', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const logs = await conn.query(
                'SELECT type, success, ip_address, user_agent, created_at FROM account_logs WHERE user_id = ? AND type IN ("change_password", "change_email", "change_username") ORDER BY created_at DESC',
                [req.userId]
            );

            res.success(logs);
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    router.get('/export', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();

            const [user] = await conn.query(
                'SELECT username, email, public, pfp, created_at FROM users WHERE id = ?',
                [req.userId]
            );

            const sessions = await conn.query(
                'SELECT created_at, expires_at, user_agent, ip_address FROM sessions WHERE user_id = ?',
                [req.userId]
            );

            const accountLogs = await conn.query(
                'SELECT type, success, ip_address, user_agent, created_at FROM account_logs WHERE user_id = ? ORDER BY created_at DESC',
                [req.userId]
            );

            const libraryLogs = await conn.query(
                'SELECT change_type, table_name, record_id, old_data, new_data, created_at FROM library_logs WHERE user_id = ? ORDER BY created_at DESC',
                [req.userId]
            );

            const authors = await conn.query(
                'SELECT author_id, name, bio FROM authors WHERE user_id = ?',
                [req.userId]
            );

            const series = await conn.query(
                'SELECT series_id, author_id, name, img, format, status FROM series WHERE user_id = ?',
                [req.userId]
            );

            const books = await conn.query(
                'SELECT book_id, series_id, name, isbn, started_reading, ended_reading, img, current_page, total_pages FROM books WHERE user_id = ?',
                [req.userId]
            );

            const chapters = await conn.query(
                'SELECT chapter_id, book_id, name, date FROM chapters WHERE user_id = ?',
                [req.userId]
            );

            const files = await getUserFiles(req.userId, pool);

            const exportData = {
                exportDate: new Date().toISOString(),
                exportVersion: '1.0',
                user: user,
                sessions: sessions,
                accountLogs: accountLogs,
                libraryLogs: libraryLogs,
                library: {
                    authors: authors,
                    series: series,
                    books: books,
                    chapters: chapters
                },
            };

            const tempDir = os.tmpdir();
            const zipFileName = `export-user-${req.userId}-${Date.now()}.zip`;
            const zipFilePath = path.join(tempDir, zipFileName);

            const archive = archiver('zip', {
                zlib: { level: 9 }
            });

            const output = fs.createWriteStream(zipFilePath);

            archive.pipe(output);
            archive.append(JSON.stringify(exportData, null, 2), { name: 'data.json' });

            if (user.pfp) {
                const pfpPath = path.join(__dirname, '../../cdn/users/pfp', `u-${req.userId}.png`);
                if (fs.existsSync(pfpPath)) {
                    archive.file(pfpPath, { name: 'files/profile-picture.png' });
                }
            }

            if (files.series && Array.isArray(files.series)) {
                for (const seriesId of files.series) {
                    const seriesImgPath = path.join(__dirname, '../../cdn/library', `s-${seriesId}.png`);
                    if (fs.existsSync(seriesImgPath)) {
                        archive.file(seriesImgPath, { name: `files/series/s-${seriesId}.png` });
                    }
                }
            }

            if (files.books && Array.isArray(files.books)) {
                for (const bookId of files.books) {
                    const bookImgPath = path.join(__dirname, '../../cdn/library', `b-${bookId}.png`);
                    if (fs.existsSync(bookImgPath)) {
                        archive.file(bookImgPath, { name: `files/books/b-${bookId}.png` });
                    }
                }
            }

            archive.on('error', (err) => {
                throw err;
            });

            await new Promise((resolve, reject) => {
                output.on('close', resolve);
                output.on('error', reject);
                archive.finalize();
            });

            //TODO: Find a way to send file to the client
            res.success({ msg: 'Export completed' });
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
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

            const userFiles = await getUserFiles(req.userId, pool);
            const deleteQueries = [
                'DELETE FROM account_logs WHERE user_id = ?',
                'DELETE FROM library_logs WHERE user_id = ?',
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

            if (userFiles.series && Array.isArray(userFiles.series)) {
                for (const seriesId of userFiles.series) {
                    const seriesImgPath = path.join(__dirname, '../../cdn/library', `s-${seriesId}.png`);
                    if (fs.existsSync(seriesImgPath)) {
                        fs.unlinkSync(seriesImgPath);
                    }
                }
            }

            if (userFiles.books && Array.isArray(userFiles.books)) {
                for (const bookId of userFiles.books) {
                    const bookImgPath = path.join(__dirname, '../../cdn/library', `b-${bookId}.png`);
                    if (fs.existsSync(bookImgPath)) {
                        fs.unlinkSync(bookImgPath);
                    }
                }
            }

            const pfpPath = path.join(__dirname, '../../cdn/users/pfp', `u-${req.userId}.png`);
            if (fs.existsSync(pfpPath)) {
                fs.unlinkSync(pfpPath);
            }

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