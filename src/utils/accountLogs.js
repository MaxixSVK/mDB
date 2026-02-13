async function newAccountLog(userId, type, success, ipAddress, userAgent, pool) {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query(
            'INSERT INTO account_logs (user_id, type, success, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
            [userId, type, success, ipAddress, userAgent]
        );
    } catch (err) {
        throw err;
    } finally {
        if (conn) conn.release();
    }
}

module.exports = newAccountLog;