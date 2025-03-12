const os = require('os');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

async function backupCDN() {
    return new Promise((resolve, reject) => {
        const date = new Date().toISOString();
        const tempDir = os.tmpdir();
        const tempFile = path.join(tempDir, `mdb-cdn-backup-${date}.zip`);

        const output = fs.createWriteStream(tempFile);
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        output.on('close', () => resolve(tempFile));
        archive.on('error', (err) => reject(err));

        archive.pipe(output);
        archive.directory(path.join(__dirname, '../../cdn'), false);
        archive.finalize();
    });
}

module.exports = { backupCDN };