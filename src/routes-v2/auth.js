const router = require('express').Router();
const bcrypt = require('bcrypt');
const QRCode = require('qrcode');
const jwt = require('jsonwebtoken');

const saltRounds = 10;
const secretKey = process.env.JWT_SECRET_KEY;

async function createSessionToken(userId, userAgent, ipAddress, pool) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    
    try {
        const tokenPayload = { userId, sessionId: null };
        const token = jwt.sign(tokenPayload, secretKey, { expiresIn: '365d' });
    
        await connection.query(
            'INSERT INTO sessions (user_id, session_token, expires_at, user_agent, ip_address) VALUES (?, ?, ?, ?, ?)',
            [userId, token, expiresAt, userAgent, ipAddress]
        );
    
        const [rows] = await connection.query(
            'SELECT * FROM sessions WHERE user_id = ? ORDER BY id DESC LIMIT 1',
            [userId]
        );
    
        const sessionId = rows.id;
        const updatedTokenPayload = { userId, sessionId };
        const updatedToken = jwt.sign(updatedTokenPayload, secretKey, { expiresIn: '365d' });
        const hashedUpdatedToken = await bcrypt.hash(updatedToken, saltRounds);
    
        await connection.query(
            'UPDATE sessions SET session_token = ? WHERE id = ?',
            [hashedUpdatedToken, sessionId]
        );
    
        await connection.commit();

        return updatedToken;
    } catch (error) {
        await connection.rollback();
        throw error; 
    } finally {
        connection.release();
    }
}


module.exports = function (pool) {
    const validate = require('../auth/tokenValidation')(pool);

    router.post('/register', async (req, res, next) => {
        const { username, email, password } = req.body;
        const passwordHash = await bcrypt.hash(password, 10);
        const userAgent = req.headers['user-agent'];
        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        // Temporarily disable registration
        const forcebeTaRegistration = req.headers['forcebetaregistration'];
        if (forcebeTaRegistration !== process.env.FORCE_REGISTRATION) {
            return res.status(403).send({ msg: 'Registration is disabled' });
        }

        try {
            const connection = await pool.getConnection();

            const [existingUsername] = await connection.query(
                'SELECT id FROM users WHERE username = ?',
                [username]
            );

            if (existingUsername) {
                return res.status(409).send({ msg: 'Username is already in use' });
            }

            const [existingEmail] = await connection.query(
                'SELECT id FROM users WHERE email = ?',
                [email]
            );

            if (existingEmail) {
                return res.status(409).send({ msg: 'Email is already in use' });
            }

            const result = await connection.query(
                'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
                [username, email, passwordHash]
            );

            const userId = result.insertId.toString();
            const sessionToken = await createSessionToken(userId, userAgent, ipAddress, pool);

            res.status(200).send({ sessionToken });
        } catch (error) {
            next(error);
        }
    });

    router.post('/login', async (req, res, next) => {
        const { username, password } = req.body;
        const userAgent = req.headers['user-agent'];
        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        try {
            const connection = await pool.getConnection();
            const rows = await connection.query(
                'SELECT id, password_hash FROM users WHERE username = ?',
                [username]
            );
            connection.release();

            if (rows.length === 0) {
                return res.status(404).send({ msg: 'User not found' });
            }

            const user = rows[0];
            const isPasswordValid = await bcrypt.compare(password, user.password_hash);

            if (!isPasswordValid) {
                return res.status(401).send({ msg: 'Invalid password' });
            }

            const sessionToken = await createSessionToken(user.id, userAgent, ipAddress, pool);

            res.status(200).send({ sessionToken });
        } catch (error) {
            next(error);
        }
    });

    router.get('/generate-qr-pc-m', validate, async (req, res, next) => {
        const userId = req.userId;
        const userAgent = req.headers['user-agent'];
        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        try {
            const sessionToken = await createSessionToken(userId, userAgent, ipAddress, pool);
            const qrCodeUrl = await QRCode.toDataURL(sessionToken);
            res.status(200).send({ qrCodeUrl });
        } catch (error) {
            next(error);
        }
    });

    return router;
};