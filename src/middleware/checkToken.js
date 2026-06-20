const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const validateToken = (pool, type) => {
    return async (req, res, next) => {
        const sessionToken = req.headers['authorization'];
        if (!sessionToken) {
            return type === 'auth'
                ? res.error(401, 'Session token is required')
                : next();
        }

        jwt.verify(sessionToken, process.env.JWT_SECRET_KEY, async function (err, decoded) {
            if (err) {
                return res.error(401, 'Invalid session token');
            }

            let conn;
            try {
                conn = await pool.getConnection();
                const { userId, sessionId } = decoded;
                const [session] = await conn.query(
                    'SELECT session_token FROM sessions WHERE user_id = ? AND id = ? AND expires_at > NOW()',
                    [userId, sessionId]
                );

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
            } finally {
                if (conn) conn.release();
            }
        });
    };
};

module.exports = validateToken;