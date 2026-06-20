const bcrypt = require('bcrypt');

const requireAdditionalSecurity = (pool) => {
    return async (req, res, next) => {
        const { password } = req.body;

        if (!password) {
            return res.error(400, 'Current password is required for this operation');
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
                return res.error(401, 'Invalid password');
            }

            next();
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.release();
        }
    };
};

module.exports = requireAdditionalSecurity;