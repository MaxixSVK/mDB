const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const secretKey = process.env.JWT_SECRET_KEY;

const validateToken = (pool, type) => {
    return async (req, res, next) => {
        const sessionToken = req.headers['authorization'];
        if (!sessionToken) {
            return type === 'auth'
                ? res.error(401, 'Session token is required')
                : next();
        }

        jwt.verify(sessionToken, secretKey, async function (err, decoded) {
            if (err) {
                return res.error(401, 'Invalid session token');
            }

            try {
                const { userId, sessionId } = decoded;
                const connection = await pool.getConnection();
                const [session] = await connection.query(
                    'SELECT session_token FROM sessions WHERE user_id = ? AND id = ? AND expires_at > NOW()',
                    [userId, sessionId]
                );
                connection.release();

                if (!session || !(await bcrypt.compare(sessionToken, session.session_token))) {
                    return res.error(401, 'Expired session');
                }

                req.userId = userId;
                req.sessionId = sessionId;
                req.userAgent = req.headers['user-agent'];
                const forwarded = req.headers['x-forwarded-for'];
                req.ipAddress = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;

                next();
            } catch (err) {
                return next(err);
            }
        });
    };
};

module.exports = validateToken;