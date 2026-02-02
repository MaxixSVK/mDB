const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require("dotenv").config();

const saltRounds = process.env.SALT_ROUNDS;
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

module.exports = createSessionToken;