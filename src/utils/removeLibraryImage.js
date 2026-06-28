const fs = require('fs');
const path = require('path');

async function removeLibraryImage(userId, type, id, pool) {
    const newlibraryLog = require('../utils/libraryLogs');

    const filename = type === 'series' ? `s-${id}.png` : `b-${id}.png`;
    const filePath = path.join(__dirname, '../../cdn/library', filename);

    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }

    await newlibraryLog(userId, 'delete', 'images', id, { file: filename }, null, pool);
}

module.exports = removeLibraryImage;