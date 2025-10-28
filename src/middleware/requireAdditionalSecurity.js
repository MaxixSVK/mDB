const bcrypt = require('bcrypt');

const requireAdditionalSecurity = (pool) => {
    return async (req, res, next) => {
        const { password } = req.body;

        if (!password) {
            return res.error('Current password is required for this operation', 400);
        }

        let conn;
        try {
            conn = await pool.getConnection();
            const [user] = await conn.query(
                'SELECT password_hash FROM users WHERE id = ?',
                [req.userId]
            );

            const isPasswordValid = await bcrypt.compare(password, user.password_hash);
            if (!isPasswordValid) {
                return res.error('Invalid password', 401);
            }

            next();
        } catch (error) {
            next(error);
        } finally {
            if (conn) conn.release();
        }
    };
};

module.exports = requireAdditionalSecurity;