const fs = require('fs/promises');
const path = require('path');
const readline = require('readline');
const logger = require('./utils/logger');

function askQuestion(query) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => {
        rl.question(query, answer => {
            rl.close();
            resolve(answer);
        });
    });
}

async function createDefaultConfig(configPath) {
    const defaultConfig = {
        api: {
            port: 3000,
            backup: {
                db: false,
                cdn: false,
                dbInterval: 86400000,
                cdnInterval: 86400000,
                cleanup: false,
                cleanupInterval: 86400000
            },
            email: {
                enabled: false
            }
        },
        web: {
            port: 3500
        }
    };

    try {
        await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 4), 'utf8');
        logger.info('Default config file created');
    } catch (error) {
        logger.error(`Error creating default config file: ${error.message}`);
        process.exit(1);
    }
}

async function checkConfigFormat() {
    const configPath = path.resolve(__dirname, '../config.json');
    let config;

    try {
        await fs.access(configPath);
    } catch {
        logger.warn('Config file not found. Creating default config file...');
        await createDefaultConfig(configPath);
    }

    try {
        const data = await fs.readFile(configPath, 'utf8');
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
        typeof config.api.backup.cleanup === 'boolean' &&
        typeof config.api.backup.cleanupInterval === 'number' &&
        config.api.email &&
        typeof config.api.email.enabled === 'boolean' &&
        typeof config.web === 'object' &&
        typeof config.web.port === 'number';

    if (!isValid) {
        logger.error('Invalid config file format');
        const answer = await askQuestion('Config file format is invalid. Do you want to restore the default config? (y/N): ');
        if (answer.trim().toLowerCase() === 'y') {
            await createDefaultConfig(configPath);
            logger.info('Default config restored. Please review and restart the server.');
            process.exit(0);
        }
    } else {
        logger.info('Config file format is correct');
    }

    return isValid;
}

async function checkRequiredDirectories() {
    const directories = ['backups', 'cdn', 'cdn/web', 'cdn/library', 'cdn/users', 'cdn/users/pfp'];

    for (const directory of directories) {
        const directoryPath = path.resolve(__dirname, `../${directory}`);

        try {
            await fs.access(directoryPath);
        } catch {
            await fs.mkdir(directoryPath, { recursive: true });
            logger.info(`Created directory ${directory}`);
        }
    }

    logger.info('Required directories are present');
}

async function checkRequiredImages() {
    const images = [ 'cdn/web/favicon.png', 'cdn/library/404.png' ];
    for (const image of images) {
        const imagePath = path.resolve(__dirname, `../${image}`);
        try {
            await fs.access(imagePath);
        } catch {
            logger.warn(`Required image file missing: ${image}`);
            //TODO: Download default missing images
        }
    }
}

async function startupCheck() {
    if (!await checkConfigFormat()) {
        process.exit(1);
    }

    await checkRequiredDirectories();
    await checkRequiredImages();
}

module.exports = { startupCheck };