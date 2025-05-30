const fs = require('fs');
const path = require('path');
const logger = require('./logger');

function createDefaultConfig(configPath) {
    const defaultConfig = {
        api: {
            port: 3000,
            backup: {
                db: false,
                cdn: false,
                dbInterval: 86400000,
                cdnInterval: 86400000
            },
            email: {
                enabled: false
            }
        },
        web: {
            port: 3001
        }
    };

    try {
        fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 4), 'utf8');
        logger.info('Default config file created');
    } catch (error) {
        logger.error(`Error creating default config file: ${error.message}`);
        process.exit(1);
    }
}

function checkConfigFormat() {
    const configPath = path.resolve(__dirname, '../config.json');
    let config;

    if (!fs.existsSync(configPath)) {
        logger.warn('Config file not found. Creating default config file...');
        createDefaultConfig(configPath);
    }

    try {
        const data = fs.readFileSync(configPath, 'utf8');
        config = JSON.parse(data);
    } catch (error) {
        logger.error(`Error reading config file: ${error.message}`);
        return false;
    }

    const isValid = config &&
        typeof config.api === 'object' &&
        typeof config.api.port === 'number' &&
        config.api.backup &&
        typeof config.api.backup.db === 'boolean' &&
        typeof config.api.backup.cdn === 'boolean' &&
        typeof config.api.backup.dbInterval === 'number' &&
        typeof config.api.backup.cdnInterval === 'number' &&
        config.api.email &&
        typeof config.api.email.enabled === 'boolean' &&
        typeof config.web === 'object' &&
        typeof config.web.port === 'number';

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