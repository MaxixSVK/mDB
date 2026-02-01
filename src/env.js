const os = require('os');
const { spawn } = require('cross-spawn');
const { spawnSync } = require('child_process');

function runScript(command, args, name) {
    spawn(command, args, { stdio: 'inherit' });
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
        return;
    }
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
                resolve();
            } else {
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
        process.exit(1);
    }
})();
