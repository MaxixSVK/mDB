const fs = require('fs');
const path = require('path');
const logger = require('./logger');

function checkConfigFormat() {
    const configPath = path.resolve(__dirname, '../config.json');
    let config;

    try {
        const data = fs.readFileSync(configPath, 'utf8');
        config = JSON.parse(data);
    } catch (error) {
        logger.error(`Error reading config file: ${error.message}`);
        return false;
    }

    const isValid = config &&
        typeof config.port === 'number' &&
        config.backup &&
        typeof config.backup.db === 'boolean' &&
        typeof config.backup.cdn === 'boolean' &&
        typeof config.backup.dbInterval === 'number' &&
        typeof config.backup.cdnInterval === 'number' &&
        typeof config.backup.includeSensitiveTables === 'boolean';

    logger[isValid ? 'info' : 'error'](isValid ? 'Config file format is correct' : 'Invalid config file format');

    return isValid;
}

function checkRequiredFolders() {
    const folders = ['backups', 'cdn', 'cdn/library', 'cdn/users', 'cdn/users/pfp'];

    folders.forEach(folder => {
        const folderPath = path.resolve(__dirname, `../${folder}`);

        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
            logger.info(`Created folder ${folder}`);
        }
    });

    logger.info('All required folders are present');
}

function startupCheck() {
    if (!checkConfigFormat()) {
        process.exit(1);
    }

    checkRequiredFolders();
}

module.exports = { startupCheck };