const os = require('os');
const fs = require('fs');
const path = require('path');
const { ZipArchive } = require('archiver');

async function backupCDN() {
    return new Promise((resolve, reject) => {
        const tempFile = path.join(
            os.tmpdir(),
            `mdb-cdn-backup-${new Date().toISOString()}.zip`
        );

        const output = fs.createWriteStream(tempFile);
        const archive = new ZipArchive({
            zlib: { level: 9 }
        });

        output.on('close', () => resolve(tempFile));
        output.on('error', reject);
        archive.on('error', reject);

        archive.pipe(output);
        archive.directory(path.join(__dirname, '../../cdn'), false);
        archive.finalize();
    });
}

module.exports = { backupCDN };