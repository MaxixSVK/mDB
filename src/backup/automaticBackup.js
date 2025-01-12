const fs = require('fs');
const path = require('path');
const config = require('../../config.json');

const { backupDatabase } = require('./db');
const { backupCDN } = require('./cdn');
const logger = require('../logger');

async function performBackup(backupFunction, backupDir, backupType) {
    try {
        logger.info(`Automatic ${backupType} backup started`);
        const tempFile = await backupFunction();
        const backupFile = path.join(backupDir, path.basename(tempFile));
        fs.renameSync(tempFile, backupFile);
        logger.info(`Automatic ${backupType} backup completed`);
    } catch (error) {
        logger.error(`Error during automatic ${backupType} backup:`, error);
    }
}

async function scheduleBackup(backupFunction, backupDir, backupType, interval) {
    await performBackup(backupFunction, backupDir, backupType);
    setInterval(async () => {
        await performBackup(backupFunction, backupDir, backupType);
    }, interval);
}

async function automaticBackup() {
    try {
        const backupDir = path.join(__dirname, `../../backups`);

        if (config.backup.db) {
            logger.info('Automatic DB backup enabled');
            await scheduleBackup(() => backupDatabase(true), backupDir, 'DB', config.backup.dbInterval);
        }

        if (config.backup.cdn) {
            logger.info('Automatic CDN backup enabled');
            await scheduleBackup(backupCDN, backupDir, 'CDN', config.backup.cdnInterval);
        }
    } catch (error) {
        logger.error('Error during initial automatic backup:', error);
    }
}

module.exports = { automaticBackup };