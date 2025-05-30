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
        const backups = [
            { type: 'DB', enabled: config.api.backup.db, interval: config.api.backup.dbInterval, action: () => backupDatabase(true) },
            { type: 'CDN', enabled: config.api.backup.cdn, interval: config.api.backup.cdnInterval, action: backupCDN }
        ];

        for (const backup of backups) {
            if (backup.enabled) {
                logger.info(`Automatic ${backup.type} backup enabled`);
                await scheduleBackup(backup.action, backupDir, backup.type, backup.interval);
            } else {
                logger.info(`Automatic ${backup.type} backup disabled`);
            }
        }
    } catch (error) {
        logger.error('Error during initial automatic backup:', error);
    }
}

module.exports = { automaticBackup };