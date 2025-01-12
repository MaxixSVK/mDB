const fs = require('fs');
const path = require('path');
const config = require('../../config.json');

const { backupDatabase } = require('./db');
const { backupCDN } = require('./cdn');
const logger = require('../logger');

async function automaticBackup() {
    try {
        const backupDir = path.join(__dirname, `../../backups`);
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
            logger.info(`Backup directory created: ${backupDir}`);
        }

        if (config.backup.db) {
            logger.info('Automatic backup enabled');
            logger.info('Initial automatic backup started');
            const tempFile = await backupDatabase();
            const backupFile = path.join(backupDir, path.basename(tempFile));

            fs.renameSync(tempFile, backupFile);
            logger.info('Initial automatic backup completed');

            setInterval(async () => {
                try {
                    logger.info('Automatic backup started');
                    const tempFile = await backupDatabase();
                    const backupFile = path.join(backupDir, path.basename(tempFile));
                    fs.renameSync(tempFile, backupFile);
                    logger.info('Automatic backup completed');
                } catch (error) {
                    logger.error('Error during automatic backup:', error);
                }
            }, config.backup.dbInterval);
        }

        if (config.backup.cdn) {
            logger.info('Automatic CDN backup enabled');
            logger.info('Initial automatic CDN backup started');
            const tempFile = await backupCDN();
            const backupFile = path.join(backupDir, path.basename(tempFile));

            fs.renameSync(tempFile, backupFile);
            logger.info('Initial automatic CDN backup completed');

            setInterval(async () => {
                try {
                    logger.info('Automatic CDN backup started');
                    const tempFile = await backupCDN();
                    const backupFile = path.join(backupDir, path.basename(tempFile));
                    fs.renameSync(tempFile, backupFile);
                    logger.info('Automatic CDN backup completed');
                } catch (error) {
                    logger.error('Error during automatic CDN backup:', error);
                }
            }, config.backup.cdnInterval);
        }
    } catch (error) {
        logger.error('Error during initial automatic backup:', error);
    }
}

module.exports = { automaticBackup };