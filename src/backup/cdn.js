const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

async function backupCDN() {
    return new Promise((resolve, reject) => {
        const date = new Date().toISOString();
        const tempDir = path.join(__dirname, '../../temp');
        const tempFile = path.join(tempDir, `mdb-cdn-backup-${date}.zip`);

        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const output = fs.createWriteStream(tempFile);
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        output.on('close', () => resolve(tempFile));
        archive.on('error', (err) => reject(err));

        archive.pipe(output);
        archive.directory(path.join(__dirname, '../../uploads'), false);
        archive.finalize();
    });
}

module.exports = { backupCDN };