const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const secretKey = process.env.JWT_SECRET_KEY;

const validateToken = (pool) => {
    return async (req, res, next) => {
        const sessionToken = req.headers['authorization'];

        if (!sessionToken) {
            return res.error('Session token is required', 401);
        }

        jwt.verify(sessionToken, secretKey, async function (err, decoded) {
            if (err) {
                return res.error('Invalid session token', 401);
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
                    return res.error('Invalid or expired session', 401);
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