const os = require('os');
const { spawn } = require('cross-spawn');
const { spawnSync } = require('child_process');

const { startupCheck } = require('./startupCheck');

function runScript(command, args, name) {
    spawn(command, args, { stdio: 'inherit' });
}

function isDBRunning() {
    if (os.platform() === 'win32') {
        const result = spawnSync('sc', ['query', 'MariaDB'], { encoding: 'utf8' });
        return result.stdout && result.stdout.includes('RUNNING');
    } else {
        const result = spawnSync('systemctl', ['is-active', '--quiet', 'mariadb']);
        return result.status === 0;
    }
}

async function checkDB() {
    if (isDBRunning()) {
        return;
    }
    let startCmd, startArgs;
    if (os.platform() === 'win32') {
        startCmd = 'sudo';
        startArgs = ['net', 'start', 'MariaDB'];
    } else {
        startCmd = 'sudo';
        startArgs = ['service', 'mariadb', 'start'];
    }
    return new Promise((resolve, reject) => {
        const proc = spawn(startCmd, startArgs, { stdio: 'inherit' });
        proc.on('close', code => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error('Failed to start MariaDB'));
            }
        });
    });
}

(async () => {
    try {
        await checkDB();
        await startupCheck();
        runScript('node', ['src/index.js'], 'API');
        runScript('node', ['src/webServer.js'], 'Web');
    } catch (err) {
        process.exit(1);
    }
})();
