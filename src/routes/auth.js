const router = require('express').Router();
const nodemailer = require("nodemailer");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UAParser = require('ua-parser-js');
const fs = require('fs');
const path = require('path');
require("dotenv").config();

const config = require('../../config.json');

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
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        if (conn) conn.release();
    }
}

async function sendEmail(to, subject, text, html) {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: "mDB Team <" + process.env.EMAIL_USER + ">",
        to,
        subject,
        text,
        html,
        headers: {
            'Auto-Submitted': 'auto-generated',
        },
    };

    return transporter.sendMail(mailOptions);
}

module.exports = function (pool) {
    router.post('/register', async (req, res, next) => {
        let conn;
        try {
            const { username, email, password, forcebetaregistration } = req.body;
            const passwordHash = await bcrypt.hash(password, 10);
            const userAgent = req.headers['user-agent'];
            const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

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

                const emailText = `
                Welcome to mDB, ${username}!

                Thank you for registering with mDB, your personal db for manga and light novels.
                Happy reading!

                Start exploring mDB: https://mdb.maxix.sk

                ${year} mDatabase
                `.trim();

                const emailTemplate = fs.readFileSync(path.join(__dirname, '../emailTemplates/registration.html'), 'utf8');
                const emailHtml = emailTemplate
                    .replace('{{username}}', username)
                    .replace('{{year}}', year);

                await sendEmail(email, emailSubject, emailText, emailHtml);
            }

            if (config.api.email.enabled) await sendRegistrationEmail();
        } catch (error) {
            await conn.rollback();
            next(error);
        } finally {
            if (conn) conn.release();
        }
    });

    router.post('/login', async (req, res, next) => {
        let conn;
        try {
            const { username, password } = req.body;
            const userAgent = req.headers['user-agent'];
            const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

            conn = await pool.getConnection();
            const [user] = await conn.query(
                'SELECT id, username, email, password_hash FROM users WHERE username = ?',
                [username]
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

                const emailText = `
                Hello ${user.username},
    
                We noticed a login to your mDB account from a new device or location:
                - IP Address: ${ipAddress}
                - Device: ${deviceInfo}
                - Time: ${loginTime}
    
                If this was you, no further action is required. If you did not log in, please reset your password immediately to secure your account.
    
                ${year} mDatabase
                `.trim();

                const emailTemplate = fs.readFileSync(path.join(__dirname, '../emailTemplates/login.html'), 'utf8');
                const emailHtml = emailTemplate
                    .replace('{{username}}', user.username)
                    .replace('{{ipAddress}}', ipAddress)
                    .replace('{{userAgent}}', deviceInfo)
                    .replace('{{loginTime}}', loginTime)
                    .replace('{{year}}', year);

                await sendEmail(user.email, emailSubject, emailText, emailHtml);
            }

            if (config.api.email.enabled) await sendLoginEmail();
        } catch (error) {
            next(error);
        } finally {
            if (conn) conn.release();
        }
    });

    return router;
};