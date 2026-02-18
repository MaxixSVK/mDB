const fs = require('fs');
const path = require('path');
const config = require('../../config.json');

const { backupDatabase } = require('./db');
const { backupCDN } = require('./cdn');
const logger = require('../utils/logger');

/**
 * GFS (Grandfather-Father-Son) backup retention strategy
 * 
 * Tiers with mutually exclusive time ranges:
 * - Daily   (0-7 days):    Keep up to 7 backups
 * - Weekly  (7-35 days):   Keep 1 per calendar week, max 4 weeks
 * - Monthly (35-365 days): Keep 1 per calendar month, max 12 months
 * - Expired (365+ days):   Delete all
 * 
 * Always keeps at least 1 backup (the most recent)
 */
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
            .map(file => {
                const filePath = path.join(backupDir, file);
                return {
                    name: file,
                    path: filePath,
                    mtime: fs.statSync(filePath).mtime
                };
            })
            .sort((a, b) => b.mtime - a.mtime);
            
        if (backupFiles.length === 0) {
            return;
        }

        const retention = {
            daily: { maxAge: 7, maxCount: 7 },
            weekly: { minAge: 7, maxAge: 35, maxCount: 4 },
            monthly: { minAge: 35, maxAge: 365, maxCount: 12 }
        };

        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        const toKeep = new Set();

        const getWeekKey = (date) => {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            d.setDate(d.getDate() + 4 - (d.getDay() || 7));
            const yearStart = new Date(d.getFullYear(), 0, 1);
            const weekNum = Math.ceil((((d - yearStart) / oneDay) + 1) / 7);
            return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
        };

        const getMonthKey = (date) => {
            const d = new Date(date);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        };

        const getAgeDays = (mtime) => (now - mtime.getTime()) / oneDay;

        let dailyCount = 0;
        for (const file of backupFiles) {
            const ageDays = getAgeDays(file.mtime);
            if (ageDays <= retention.daily.maxAge) {
                if (dailyCount < retention.daily.maxCount) {
                    toKeep.add(file.name);
                    dailyCount++;
                }
            }
        }

        const weeklyGroups = new Map();
        for (const file of backupFiles) {
            const ageDays = getAgeDays(file.mtime);
            if (ageDays > retention.weekly.minAge && ageDays <= retention.weekly.maxAge) {
                const weekKey = getWeekKey(file.mtime);
                if (!weeklyGroups.has(weekKey) && weeklyGroups.size < retention.weekly.maxCount) {
                    weeklyGroups.set(weekKey, file);
                    toKeep.add(file.name);
                }
            }
        }

        const monthlyGroups = new Map();
        for (const file of backupFiles) {
            const ageDays = getAgeDays(file.mtime);
            if (ageDays > retention.monthly.minAge && ageDays <= retention.monthly.maxAge) {
                const monthKey = getMonthKey(file.mtime);
                if (!monthlyGroups.has(monthKey) && monthlyGroups.size < retention.monthly.maxCount) {
                    monthlyGroups.set(monthKey, file);
                    toKeep.add(file.name);
                }
            }
        }

        if (toKeep.size === 0 && backupFiles.length > 0) {
            toKeep.add(backupFiles[0].name);
        }

        const toDelete = backupFiles.filter(file => !toKeep.has(file.name));

        for (const file of toDelete) {
            fs.unlinkSync(file.path);
            logger.info(`Deleted old ${backupType} backup: ${file.name} (tiered cleanup)`);
        }

        if (toDelete.length > 0 || toKeep.size > 0) {
            logger.info(`${backupType} backup cleanup: kept ${toKeep.size} (daily: ${dailyCount}, weekly: ${weeklyGroups.size}, monthly: ${monthlyGroups.size}), deleted ${toDelete.length}`);
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