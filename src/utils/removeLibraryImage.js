const fs = require('fs');
const path = require('path');

async function removeLibraryImage(type, id) {
    const filename = type === 'series' ? `s-${id}.png` : `b-${id}.png`;
    const filePath = path.join(__dirname, '../../cdn/library', filename);

    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}

module.exports = removeLibraryImage;