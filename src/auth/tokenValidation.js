const bcrypt = require('bcrypt');

const validateToken = (pool, admin = false) => {
    return async (req, res, next) => {
        const sessionToken = req.headers['authorization'];

        if (!sessionToken) {
            return res.status(401).json({ error: 'Session token is required' });
        }

        try {
            const parts = sessionToken.split(':');
            const extractedUserId = parts[0];
            const sessionId = parts[parts.length - 1];
            const tokenPart = parts.slice(1, parts.length - 1).join(':');

            const connection = await pool.getConnection();
            const rows = await connection.query(
                'SELECT session_token FROM sessions WHERE user_id = ? AND id = ? AND expires_at > NOW()',
                [extractedUserId, sessionId]
            );
            connection.release();

            if (rows.length === 0) {
                return res.status(401).json({ error: 'Invalid or expired session' });
            }

            const match = await bcrypt.compare(`${extractedUserId}:${tokenPart}`, rows[0].session_token);
            if (!match) {
                return res.status(401).json({ error: 'Invalid or expired session' });
            }

            req.userId = extractedUserId;
            req.sessionId = sessionId;

            if (admin) {
                const connection = await pool.getConnection();
                const rows = await connection.query(
                    'SELECT role FROM users WHERE id = ?',
                    [req.userId]
                );
                connection.release();

                if (rows[0].role !== 'admin') {
                    return res.status(403).json({ error: 'Unauthorized' });
                }
            }
            next();
        } catch (error) {
            next(error);
        }
    };
};

module.exports = validateToken;