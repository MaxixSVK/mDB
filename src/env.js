const { spawn } = require('cross-spawn');
const { spawnSync } = require('child_process');
const os = require('os');

const logger = require('./utils/logger');

function runScript(command, args, name) {
    const proc = spawn(command, args, { stdio: 'inherit' });
    proc.on('close', code => {
        if (code !== 0) {
            logger.error(`${name} exited with code ${code}`);
        }
    });
}

function isMariaDBRunning() {
    if (os.platform() === 'win32') {
        const result = spawnSync('sc', ['query', 'MariaDB'], { encoding: 'utf8' });
        return result.stdout && result.stdout.includes('RUNNING');
    } else {
        const result = spawnSync('systemctl', ['is-active', '--quiet', 'mariadb']);
        return result.status === 0;
    }
}

function getWindowsStartCommand() {
    const { spawnSync } = require('child_process');
    const checkSudo = spawnSync('where', ['sudo'], { encoding: 'utf8' });
    if (checkSudo.status === 0) {
        return { cmd: 'sudo', args: ['net', 'start', 'MariaDB'] };
    } else {
        return { cmd: 'net', args: ['start', 'MariaDB'] };
    }
}

async function ensureMariaDB() {
    if (isMariaDBRunning()) {
        logger.info('MariaDB service is already running.');
        return;
    }
    logger.info('MariaDB service is not running. Starting MariaDB...');
    let startCmd, startArgs;
    if (os.platform() === 'win32') {
        const win = getWindowsStartCommand();
        startCmd = win.cmd;
        startArgs = win.args;
    } else {
        startCmd = 'sudo';
        startArgs = ['service', 'mariadb', 'start'];
    }
    return new Promise((resolve, reject) => {
        const proc = spawn(startCmd, startArgs, { stdio: 'inherit' });
        proc.on('close', code => {
            if (code === 0) {
                logger.info('MariaDB started.');
                resolve();
            } else {
                logger.error('Failed to start MariaDB');
                reject(new Error('Failed to start MariaDB'));
            }
        });
    });
}

(async () => {
    try {
        await ensureMariaDB();
        runScript('node', ['src/index.js'], 'API');
        runScript('node', ['src/webServer.js'], 'Web');
    } catch (err) {
        logger.error(err.message);
        process.exit(1);
    }
})();
