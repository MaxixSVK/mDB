async function newlibraryLog(userId, changeType, type, recordId, oldData, newData, pool) {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query(
            'INSERT INTO library_logs (user_id, change_type, table_name, record_id, old_data, new_data) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, changeType, type, recordId, oldData, newData]
        );
    } catch (err) {
        throw err;
    } finally {
        if (conn) conn.release();
    }
}

module.exports = newlibraryLog;
