async function getUserFiles(userId, pool) {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query(
            `SELECT 
                u.pfp,
                COALESCE((SELECT JSON_ARRAYAGG(series_id) FROM series WHERE user_id = ?), JSON_ARRAY()) as series,
                COALESCE((SELECT JSON_ARRAYAGG(book_id) FROM books WHERE user_id = ?), JSON_ARRAY()) as books
            FROM users u
            WHERE u.id = ?`,
            [userId, userId, userId]
        );
        return rows[0];
    } catch (err) {
        throw err;
    } finally {
        if (conn) conn.release();
    }
}

module.exports = getUserFiles;