const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const secretKey = process.env.JWT_SECRET_KEY;

const validateToken = (pool, admin = false) => {
    return async (req, res, next) => {
        const sessionToken = req.headers['authorization'];

        if (!sessionToken) {
            return res.status(401).json({ error: 'Session token is required' });
        }

        try {
            const decoded = jwt.verify(sessionToken, secretKey);
            const { userId, sessionId } = decoded;

            const connection = await pool.getConnection();
            const [rows] = await connection.query(
                'SELECT session_token FROM sessions WHERE user_id = ? AND id = ? AND expires_at > NOW()',
                [userId, sessionId]
            );
            connection.release();

            if (rows.length === 0) {
                return res.status(401).json({ error: 'Invalid or expired session' });
            }

            const match = await bcrypt.compare(sessionToken, rows.session_token);
            if (!match) {
                return res.status(401).json({ error: 'Invalid or expired session' });
            }

            req.userId = userId;
            req.sessionId = sessionId;

            if (admin) {
                const connection = await pool.getConnection();
                const [userRows] = await connection.query(
                    'SELECT role FROM users WHERE id = ?',
                    [req.userId]
                );
                connection.release();

                if (userRows.role !== 'admin') {
                    return res.status(403).json({ error: 'Missing admin privileges' });
                }
            }
            next();
        } catch (error) {
            return res.status(401).json({ error: 'Error validating session token' });
        }
    };
};

module.exports = validateToken;