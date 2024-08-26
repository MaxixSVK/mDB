const router = require('express').Router();
const bcrypt = require('bcrypt');

const saltRounds = 10;

module.exports = function (pool) {
    router.post('/register', async (req, res, next) => {
        const { username, email, password } = req.body;
        const passwordHash = await bcrypt.hash(password, 10);
        const userAgent = req.headers['user-agent'];
        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        // Temporarily disable registration
        const forceRegistration = req.headers['force-registration'];
        if (forceRegistration !== process.env.FORCE_REGISTRATION) {
            return res.status(403).json({ error: 'Registration is disabled' });
        }
    
        try {
            const connection = await pool.getConnection();
    
            const [existingUsername] = await connection.query(
                'SELECT id FROM users WHERE username = ?',
                [username]
            );
    
            if (existingUsername) {
                return res.status(409).json({ error: 'Username is already in use' });
            }
    
            const [existingEmail] = await connection.query(
                'SELECT id FROM users WHERE email = ?',
                [email]
            );
    
            if (existingEmail) {
                return res.status(409).json({ error: 'Email is already in use' });
            }
    
            const result = await connection.query(
                'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
                [username, email, passwordHash]
            );
    
            const userId = result.insertId.toString();
    
            const sessionToken = await bcrypt.genSalt(saltRounds);
            const tokenWithUserId = `${userId}:${sessionToken}`;
            const hashedToken = await bcrypt.hash(tokenWithUserId, saltRounds);
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
            const connection2 = await pool.getConnection();
            await connection2.query(
                'INSERT INTO sessions (user_id, session_token, expires_at, user_agent, ip_address) VALUES (?, ?, ?, ?, ?)',
                [userId, hashedToken, expiresAt, userAgent, ipAddress]
            );
    
            const [rows2] = await connection2.query(
                'SELECT * FROM sessions WHERE user_id = ? ORDER BY id DESC LIMIT 1',
                [userId]
            );
    
            connection2.release();
            res.status(200).json({ sessionToken: tokenWithUserId + ':' + rows2.id });
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
                return res.status(404).json({ error: 'User not found' });
            }
    
            const user = rows[0];
            const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
            if (!isPasswordValid) {
                return res.status(401).json({ error: 'Invalid password' });
            }
    
            const sessionToken = await bcrypt.genSalt(saltRounds);
            const tokenWithUserId = `${user.id}:${sessionToken}`;
            const hashedToken = await bcrypt.hash(tokenWithUserId, saltRounds);
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
            const connection2 = await pool.getConnection();
            await connection2.query(
                'INSERT INTO sessions (user_id, session_token, expires_at, user_agent, ip_address) VALUES (?, ?, ?, ?, ?)',
                [user.id, hashedToken, expiresAt, userAgent, ipAddress]
            );
    
            const [rows2] = await connection2.query(
                'SELECT * FROM sessions WHERE user_id = ? ORDER BY id DESC LIMIT 1',
                [user.id]
            );
    
            connection2.release();
            res.status(200).json({ sessionToken: tokenWithUserId + ':' + rows2.id });
        } catch (error) {
            next(error);
        }
    });

    return router;
};