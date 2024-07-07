const express = require('express');
const router = express.Router();

module.exports = function(pool) {
    router.get('/data', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const query = `
            SELECT series.series_id, series.seriesName, series.img, 
                   books.book_id, books.name AS bookName, books.startedReading, books.endedReading, 
                   chapters.chapter_id, chapters.name AS chapterName, chapters.date
            FROM series
            LEFT JOIN books ON series.series_id = books.series_id
            LEFT JOIN chapters ON books.book_id = chapters.book_id
            ORDER BY series.series_id, books.book_id, chapters.chapter_id;
        `;
            const rows = await conn.query(query);
    
            const seriesData = {};
            rows.forEach(row => {
                if (!seriesData[row.series_id]) {
                    seriesData[row.series_id] = {
                        series_id: row.series_id,
                        seriesName: row.seriesName,
                        img: row.img,
                        books: {}
                    };
                }
                if (row.book_id && !seriesData[row.series_id].books[row.book_id]) {
                    seriesData[row.series_id].books[row.book_id] = {
                        book_id: row.book_id,
                        name: row.bookName,
                        startedReading: row.startedReading ? formatDateToLocal(row.startedReading) : null,
                        endedReading: row.endedReading ? formatDateToLocal(row.endedReading) : null,
                        chapters: []
                    };
                }
                if (row.chapter_id) {
                    seriesData[row.series_id].books[row.book_id].chapters.push({
                        chapter_id: row.chapter_id,
                        name: row.chapterName,
                        date: row.date ? formatDateToLocal(row.date) : null
                    });
                }
            });
    
            function formatDateToLocal(date) {
                return new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
                    .toISOString()
                    .split("T")[0];
            }
    
            let seriesArray = Object.values(seriesData).map(series => ({
                ...series,
                books: Object.values(series.books)
            }));
    
            if (req.query.clear === 'true') {
                seriesArray = seriesArray.map(series => ({
                    seriesName: series.seriesName,
                    img: series.img,
                    books: series.books.map(book => ({
                        name: book.name,
                        startedReading: book.startedReading,
                        endedReading: book.endedReading,
                        chapters: book.chapters.map(chapter => ({
                            name: chapter.name,
                            date: chapter.date
                        }))
                    }))
                }));
            }
    
            res.send(seriesArray);
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.end();
        }
    });
    
    const apiKey = process.env.API_KEY;
    
    function checkApiKey(req, res, next) {
        if (req.headers['api-key'] === apiKey) {
            next();
        } else {
            res.status(401).send('Invalid API key');
        }
    }
    
    router.post('/admin', checkApiKey , async (req, res) => {
        res.status(200).send('OK');
    });
    
    router.post('/add-data', checkApiKey, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const { type, ...data } = req.body;
    
            let sql = '';
            let params = [];
            let columns = [];
            let placeholders = [];
    
            switch (type) {
                case 'series':
                    if (!data.seriesName) return res.status(400).send('Missing series name');
                    Object.entries(data).forEach(([key, value]) => {
                        if (value !== '') {
                            columns.push(key);
                            placeholders.push('?');
                            params.push(value);
                        }
                    });
                    sql = `INSERT INTO series (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
                    break;
                case 'book':
                    if (!data.name || !data.series_id) return res.status(400).send('Missing book name or series ID');
                    Object.entries(data).forEach(([key, value]) => {
                        if (value !== '') {
                            columns.push(key);
                            placeholders.push('?');
                            params.push(value);
                        }
                    });
                    sql = `INSERT INTO books (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
                    break;
                case 'chapter':
                    if (!data.name || !data.book_id) return res.status(400).send('Missing chapter name or book ID');
                    Object.entries(data).forEach(([key, value]) => {
                        if (value !== '') {
                            columns.push(key);
                            placeholders.push('?');
                            params.push(value);
                        }
                    });
                    sql = `INSERT INTO chapters (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
                    break;
                default:
                    return res.status(400).send('Invalid type specified');
            }
    
            if (params.length > 0) {
                await conn.query(sql, params);
                res.send(`${type} added successfully`);
            } else {
                res.send(`No valid fields provided to add ${type}`);
            }
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.end();
        }
    });
    
    router.put('/update-data/:type/:id', checkApiKey, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const { type, id } = req.params;
            const { seriesName, img, startedReading, endedReading, name, date } = req.body;
    
            let sql = '';
            let params = [];
    
            switch (type) {
                case 'series':
                    sql = 'UPDATE series SET ';
                    if (seriesName !== '') {
                        sql += 'seriesName = ?, ';
                        params.push(seriesName);
                    }
                    if (img !== '') {
                        sql += 'img = ?, ';
                        params.push(img);
                    }
                    sql = sql.slice(0, -2);
                    sql += ' WHERE series_id = ?';
                    params.push(id);
                    break;
                case 'book':
                    sql = 'UPDATE books SET ';
                    if (name !== '') {
                        sql += 'name = ?, ';
                        params.push(name);
                    }
                    if (startedReading !== '') {
                        sql += 'startedReading = ?, ';
                        params.push(startedReading);
                    }
                    if (endedReading !== '') {
                        sql += 'endedReading = ?, ';
                        params.push(endedReading);
                    }
                    sql = sql.slice(0, -2);
                    sql += ' WHERE book_id = ?';
                    params.push(id);
                    break;
                case 'chapter':
                    sql = 'UPDATE chapters SET ';
                    if (name !== '') {
                        sql += 'name = ?, ';
                        params.push(name);
                    }
                    if (date !== '') {
                        sql += 'date = ?, ';
                        params.push(date);
                    }
                    sql = sql.slice(0, -2);
                    sql += ' WHERE chapter_id = ?';
                    params.push(id);
                    break;
                default:
                    return res.status(400).send('Invalid type specified');
            }
    
            if (params.length > 1) { 
                await conn.query(sql, params);
                res.send(`${type} updated successfully`);
            } else {
                res.send(`No valid fields provided to update ${type}`);
            }
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.end();
        }
    });
    
    
    router.delete('/delete-data/:type/:id', checkApiKey, async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const { type, id } = req.params;
    
            switch (type) {
                case 'series':
                    await conn.query('DELETE FROM series WHERE series_id = ?', [id]);
                    break;
                case 'book':
                    await conn.query('DELETE FROM books WHERE book_id = ?', [id]);
                    break;
                case 'chapter':
                    await conn.query('DELETE FROM chapters WHERE chapter_id = ?', [id]);
                    break;
                default:
                    return res.status(400).send('Invalid type specified');
            }
    
            res.send(`${type} deleted successfully`);
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.end();
        }
    });

    router.get('/list-series', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const query = 'SELECT series_id, seriesName FROM series';
            const rows = await conn.query(query);
            res.send(rows);
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.end();
        }
    });
    
    router.get('/list-books/:series_id', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const { series_id } = req.params;
            const query = 'SELECT book_id, startedReading, endedReading, name FROM books WHERE series_id = ?';
            const rows = await conn.query(query, [series_id]);
            res.send(rows);
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.end();
        }
    });

    router.get('/list-chapters/:book_id', async (req, res, next) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const { book_id } = req.params;
            const query = 'SELECT chapter_id, date, name FROM chapters WHERE book_id = ?';
            const rows = await conn.query(query, [book_id]);
            res.send(rows);
        } catch (err) {
            next(err);
        } finally {
            if (conn) conn.end();
        }
    });

    return router;
};