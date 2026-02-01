const fs = require('fs');
const path = require('path');
const config = require('../../config.json');

const { backupDatabase } = require('./db');
const { backupCDN } = require('./cdn');
const logger = require('../utils/logger');

async function tieredBackupCleanup(backupDir, backupType) {
    try {
        if (!fs.existsSync(backupDir)) {
            return;
        }

        const files = fs.readdirSync(backupDir);
        const backupFiles = files
            .filter(file => 
                file.startsWith(`mdb-${backupType.toLowerCase()}-backup-`) && 
                (file.endsWith('.sql') || file.endsWith('.zip'))
            )
            .map(file => ({
                name: file,
                path: path.join(backupDir, file),
                mtime: fs.statSync(path.join(backupDir, file)).mtime
            }))
            .sort((a, b) => b.mtime - a.mtime);
            
        if (backupFiles.length === 0) {
            return;
        }

        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        const oneWeek = 7 * oneDay;
        const oneMonth = 30 * oneDay;

        const toKeep = new Set();
        const toDelete = [];

        const dailyBackups = backupFiles.filter(file => 
            now - file.mtime.getTime() <= 3 * oneDay
        );
        dailyBackups.forEach(file => toKeep.add(file.name));

        const weeklyBackups = backupFiles.filter(file => {
            const age = now - file.mtime.getTime();
            return age > 3 * oneDay && age <= 7 * oneWeek;
        });
        
        const weeklyGroups = new Map();
        weeklyBackups.forEach(file => {
            const weekNumber = Math.floor((now - file.mtime.getTime()) / oneWeek);
            if (!weeklyGroups.has(weekNumber)) {
                weeklyGroups.set(weekNumber, file);
                toKeep.add(file.name);
            }
        });

        const monthlyBackups = backupFiles.filter(file => {
            const age = now - file.mtime.getTime();
            return age > 7 * oneWeek;
        });

        const monthlyGroups = new Map();
        monthlyBackups.forEach(file => {
            const monthNumber = Math.floor((now - file.mtime.getTime()) / oneMonth);
            if (!monthlyGroups.has(monthNumber)) {
                monthlyGroups.set(monthNumber, file);
                toKeep.add(file.name);
            }
        });

        backupFiles.forEach(file => {
            if (!toKeep.has(file.name)) {
                toDelete.push(file);
            }
        });

        for (const file of toDelete) {
            fs.unlinkSync(file.path);
            logger.info(`Deleted old ${backupType} backup: ${file.name} (tiered cleanup)`);
        }

        if (toDelete.length > 0) {
            logger.info(`${backupType} backup cleanup: kept ${toKeep.size} backups, deleted ${toDelete.length} backups`);
        }

    } catch (error) {
        logger.error(`Error during tiered cleanup of ${backupType} backups:`, error);
    }
}

async function performCleanup(backupDir) {
    try {
        logger.info('Scheduled backup cleanup started');
        await tieredBackupCleanup(backupDir, 'DB');
        await tieredBackupCleanup(backupDir, 'CDN');
        logger.info('Scheduled backup cleanup completed');
    } catch (error) {
        logger.error('Error during scheduled backup cleanup:', error);
    }
}

async function scheduleCleanup(backupDir, interval) {
    await performCleanup(backupDir);
    setInterval(async () => {
        await performCleanup(backupDir);
    }, interval);
}

async function performBackup(backupFunction, backupDir, backupType) {
    try {
        logger.info(`Automatic ${backupType} backup started`);
        const tempFile = await backupFunction();
        const backupFile = path.join(backupDir, path.basename(tempFile));
        
        fs.copyFileSync(tempFile, backupFile);
        fs.unlinkSync(tempFile);
        
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

        if (config.api.backup.cleanup) {
            logger.info('Automatic backup cleanup enabled');
            await scheduleCleanup(backupDir, config.api.backup.cleanupInterval);
        } else {
            logger.info('Automatic backup cleanup disabled');
        }
    } catch (error) {
        logger.error('Error during initial automatic backup:', error);
    }
}

module.exports = { automaticBackup };