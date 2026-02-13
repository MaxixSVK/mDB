const fs = require('fs');
const path = require('path');
const router = require('express').Router();
const bcrypt = require('bcrypt');
const UAParser = require('ua-parser-js');
require("dotenv").config();

module.exports = function (pool) {
    const config = require('../../config.json');

    const sendEmail = require('../utils/sendEmail');
    const newAccountLog = require('../utils/accountLogs');
    const createSessionToken = require('../utils/createSessionToken');

    router.post('/register', async (req, res, next) => {
        let conn;
        try {
            const { username, email, password, forcebetaregistration } = req.body;
            const passwordHash = await bcrypt.hash(password, 10);
            const userAgent = req.headers['user-agent'];
            const forwarded = req.headers['x-forwarded-for'];
            const ipAddress = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;

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
            const forwarded = req.headers['x-forwarded-for'];
            const ipAddress = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;

            conn = await pool.getConnection();
            const [user] = await conn.query(
                'SELECT id, username, email, password_hash FROM users WHERE username = ? OR email = ?',
                [account, account]
            );

            if (user) {
                const validPassword = await bcrypt.compare(password, user.password_hash);
                if (!validPassword) {
                    newAccountLog(user.id, 'login', false, ipAddress, userAgent, pool);
                    return res.error('Invalid username or password', 401);
                }
            } else {
                return res.error('Invalid username or password', 401);
            }

            const sessionToken = await createSessionToken(user.id, userAgent, ipAddress, pool);
            res.success({ sessionToken });

            newAccountLog(user.id, 'login', true, ipAddress, userAgent, pool);

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