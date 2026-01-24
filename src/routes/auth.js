const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UAParser = require('ua-parser-js');
const fs = require('fs');
const path = require('path');
require("dotenv").config();

const config = require('../../config.json');

const sendEmail = require('../utils/sendEmail');

const saltRounds = 10;
const secretKey = process.env.JWT_SECRET_KEY;

async function createSessionToken(userId, userAgent, ipAddress, pool) {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);

        const tokenPayload = { userId, sessionId: null };
        const token = jwt.sign(tokenPayload, secretKey, { expiresIn: '365d' });

        await conn.query(
            'INSERT INTO sessions (user_id, session_token, expires_at, user_agent, ip_address) VALUES (?, ?, ?, ?, ?)',
            [userId, token, expiresAt, userAgent, ipAddress]
        );

        const [newDBSession] = await conn.query(
            'SELECT * FROM sessions WHERE user_id = ? ORDER BY id DESC LIMIT 1',
            [userId]
        );

        const sessionId = newDBSession.id;
        const updatedTokenPayload = { userId, sessionId };
        const updatedToken = jwt.sign(updatedTokenPayload, secretKey, { expiresIn: '365d' });
        const hashedUpdatedToken = await bcrypt.hash(updatedToken, saltRounds);

        await conn.query(
            'UPDATE sessions SET session_token = ? WHERE id = ?',
            [hashedUpdatedToken, sessionId]
        );

        await conn.commit();
        return updatedToken;
    } catch (err) {
        if (conn) await conn.rollback();
        throw err;
    } finally {
        if (conn) conn.release();
    }
}

function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress;
}

module.exports = function (pool) {
    router.post('/register', async (req, res, next) => {
        let conn;
        try {
            const { username, email, password, forcebetaregistration } = req.body;
            const passwordHash = await bcrypt.hash(password, 10);
            const userAgent = req.headers['user-agent'];
            const ipAddress = getClientIp(req);

            // Temporarily disable registration
            if (forcebetaregistration !== process.env.FORCE_REGISTRATION) {
                return res.error('Registration is disabled', 403);
            }

            conn = await pool.getConnection();
            await conn.beginTransaction();

            const [existingUsername] = await conn.query(
                'SELECT id FROM users WHERE username = ?',
                [username]
            );

            if (existingUsername) {
                return res.error('Username is already in use', 409);
            }

            const [existingEmail] = await conn.query(
                'SELECT id FROM users WHERE email = ?',
                [email]
            );

            if (existingEmail) {
                return res.error('Email is already in use', 409);
            }

            const result = await conn.query(
                'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
                [username, email, passwordHash]
            );

            await conn.commit();

            const userId = result.insertId.toString();
            const sessionToken = await createSessionToken(userId, userAgent, ipAddress, pool);

            res.success({ sessionToken });

            async function sendRegistrationEmail() {
                const emailSubject = `Welcome to mDB, ${username}!`;
                const year = new Date().getFullYear();

                const textTemplatePath = path.join(__dirname, '../emailTemplates/registration.txt');
                const emailText = fs.readFileSync(textTemplatePath, 'utf8')
                    .replace('{{username}}', username)
                    .replace('{{year}}', year)
                    .replace('{{webUrl}}', 'https://' + process.env.WEB_HOST);

                const htmlTemplatePath = fs.readFileSync(path.join(__dirname, '../emailTemplates/registration.html'), 'utf8');
                const emailHtml = htmlTemplatePath
                    .replace('{{username}}', username)
                    .replace('{{year}}', year)
                    .replace('{{webUrl}}', 'https://' + process.env.WEB_HOST);

                await sendEmail(email, emailSubject, emailText, emailHtml);
            }

            if (config.api.email.enabled) await sendRegistrationEmail();
        } catch (err) {
            if (conn) await conn.rollback();
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    router.post('/login', async (req, res, next) => {
        let conn;
        try {
            const { account, password } = req.body;
            const userAgent = req.headers['user-agent'];
            const ipAddress = getClientIp(req);

            conn = await pool.getConnection();
            const [user] = await conn.query(
                'SELECT id, username, email, password_hash FROM users WHERE username = ? OR email = ?',
                [account, account]
            );

            if (!user) {
                return res.error('Invalid username or password', 401);
            }

            const isPasswordValid = await bcrypt.compare(password, user.password_hash);

            if (!isPasswordValid) {
                return res.error('Invalid username or password', 401);
            }

            const sessionToken = await createSessionToken(user.id, userAgent, ipAddress, pool);
            res.success({ sessionToken });

            async function sendLoginEmail() {
                const emailSubject = `New Login Notification`;
                const year = new Date().getFullYear();
                const loginTime = new Date().toISOString().replace('T', ' ').replace('Z', '') + ' UTC';

                const parser = new UAParser(userAgent);
                const deviceInfo = `${parser.getBrowser().name} on ${parser.getOS().name}`;

                const textTemplatePath = path.join(__dirname, '../emailTemplates/login.txt');
                const emailText = fs.readFileSync(textTemplatePath, 'utf8')
                    .replace('{{username}}', user.username)
                    .replace('{{ipAddress}}', ipAddress)
                    .replace('{{userAgent}}', deviceInfo)
                    .replace('{{loginTime}}', loginTime)
                    .replace('{{year}}', year)
                    .replace('{{webUrl}}', 'https://' + process.env.WEB_HOST);

                const emailTemplate = fs.readFileSync(path.join(__dirname, '../emailTemplates/login.html'), 'utf8');
                const emailHtml = emailTemplate
                    .replace('{{username}}', user.username)
                    .replace('{{ipAddress}}', ipAddress)
                    .replace('{{userAgent}}', deviceInfo)
                    .replace('{{loginTime}}', loginTime)
                    .replace('{{year}}', year)
                    .replace('{{webUrl}}', 'https://' + process.env.WEB_HOST);

                await sendEmail(user.email, emailSubject, emailText, emailHtml);
            }

            if (config.api.email.enabled) await sendLoginEmail();
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    });

    return router;
};