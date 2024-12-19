const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const secretKey = process.env.JWT_SECRET_KEY;

const validateToken = (pool, admin = false) => {
    return async (req, res, next) => {
        const sessionToken = req.headers['authorization'];

        if (!sessionToken) {
            return res.error('Session token is required', 401);
        }

        try {
            const decoded = jwt.verify(sessionToken, secretKey);
            const { userId, sessionId } = decoded;

            const connection = await pool.getConnection();
            const [session] = await connection.query(
                'SELECT session_token FROM sessions WHERE user_id = ? AND id = ? AND expires_at > NOW()',
                [userId, sessionId]
            );
            connection.release();

            if (session.length === 0) {
                return res.error('Invalid or expired session', 401);
            }

            const match = await bcrypt.compare(sessionToken, session.session_token);
            if (!match) {
                return res.error('Invalid or expired session', 401);
            }

            req.userId = userId;
            req.sessionId = sessionId;

            if (admin) {
                const connection = await pool.getConnection();
                const [user] = await connection.query(
                    'SELECT role FROM users WHERE id = ?',
                    [req.userId]
                );
                connection.release();

                if (user.role !== 'admin') {
                    return res.error('Missing admin privileges', 403);
                }
            }
            next();
        } catch (error) {
            return next(error);
        }
    };
};

module.exports = validateToken;