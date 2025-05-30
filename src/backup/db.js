const os = require('os');
const path = require('path');
const { exec } = require('child_process');

async function backupDatabase(includeSensitiveTables) {
    return new Promise((resolve, reject) => {
        const date = new Date().toISOString();
        const tempDir = os.tmpdir();
        const tempFile = path.join(tempDir, `mdb-db-backup-${date}.sql`);

        const excludedTables = ['users', 'sessions'];
        const ignoreTables = includeSensitiveTables ? '' : excludedTables.map(table => `--ignore-table=${process.env.DB_NAME}.${table}`).join(' ');

        const command = `mariadb-dump -u ${process.env.DB_USER} -p${process.env.DB_PASSWORD} ${process.env.DB_NAME} ${ignoreTables} > ${tempFile}`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                return reject(error);
            }
            resolve(tempFile);
        });
    });
}

module.exports = { backupDatabase };