document.addEventListener("DOMContentLoaded", async function () {
    ({ loggedIn } = await checkLogin(true));
    if (!loggedIn) window.location.href = '/';

    displayUser();

    const configEditor = CodeMirror.fromTextArea(document.getElementById('config-editor'), {
        mode: "application/json",
        lineNumbers: true,
        theme: "material-darker",
        lineWrapping: true,
    });

    setupButtonEvent('db-backup', 'click', dbBackup);
    setupButtonEvent('cdn-backup', 'click', cdnBackup);
    setupButtonEvent('logs-backup', 'click', logsBackup);
    setupButtonEvent('restart-server', 'click', restartServer);
    setupButtonEvent('logout', 'click', logout);

    document.getElementById('config-form').addEventListener('submit', function (event) {
        event.preventDefault();
        saveNewConfig(configEditor);
    });

    getCurrentConfig(configEditor);
});

function setupButtonEvent(elementId, eventType, handler) {
    const element = document.getElementById(elementId);
    element.addEventListener(eventType, handler);
}


function dbBackup() {
    try {
        showNotification('Sending request to backup database, please wait this may take a while', 'info');
        fetch(api + '/server/backup-db', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': getCookie('sessionToken')
            },
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.blob();
            })
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `mdb-db-backup-${new Date().toISOString().split('T')[0]}.sql`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                showNotification('Database backup successful', 'success');
            })
            .catch(error => {
                console.error('Backup failed:', error);
                showNotification('Database backup failed', 'error');
            });
    } catch (error) {
        console.error('Backup failed:', error);
        showNotification('Database backup failed', 'error');
    }
}

async function cdnBackup() {
    try {
        showNotification('Sending request to backup CDN, please wait this may take a while', 'info');
        fetch(cdn + '/backup', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': getCookie('sessionToken')
            },
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.blob();
            })
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `mdb-cdn-backup-${new Date().toISOString().split('T')[0]}.zip`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                showNotification('CDN backup successful', 'success');
            })
            .catch(error => {
                console.error('Backup failed:', error);
                showNotification('CDN backup failed', 'error');
            });
    } catch (error) {
        console.error('Backup failed:', error);
        showNotification('CDN backup failed', 'error');
    }
}

async function logsBackup() {
    try {
        const session = getCookie('sessionToken');
        const response = await fetch(api + '/server/logs?all=true&format=file', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'authorization': session
            },
        });
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'logs.json';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error fetching logs:', error);
    }
}

function restartServer() {
    fetch(api + '/server/restart', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'authorization': getCookie('sessionToken')
        },
    })
        .then(response => {
            if (response.ok) {
                showNotification('Server restart initiated', 'success');
            } else {
                throw new Error('Failed to restart server');
            }
        })
        .catch(error => {
            console.error('Failed to restart server:', error);
            showNotification('Failed to restart server');
        });
}

function getCurrentConfig(configEditor) {
    fetch(api + '/server/config', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'authorization': getCookie('sessionToken')
        },
    })
        .then(response => response.json())
        .then(data => {
            configEditor.setValue(JSON.stringify(data, null, 2));
        })
        .catch(error => console.error('Failed to get current config:', error));
}

async function saveNewConfig(configEditor) {
    const configText = configEditor.getValue();

    try {
        const config = JSON.parse(configText);
        const response = await fetch(api + '/server/config', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'authorization': getCookie('sessionToken')
            },
            body: JSON.stringify(config)
        });

        if (response.ok) {
            showNotification('Configuration saved', 'success');
        } else {
            throw new Error('Failed to save configuration');
        }
    } catch (error) {
        console.error('Failed to save configuration:', error);
        showNotification('Failed to save configuration');
    }
}