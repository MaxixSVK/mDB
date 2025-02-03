document.addEventListener("DOMContentLoaded", function () {
    checkLogin();

    const configEditor = CodeMirror.fromTextArea(document.getElementById('config-editor'), {
        mode: "application/json",
        lineNumbers: true,
        theme: "material-darker",
        lineWrapping: true
    });

    setupButtonEvent('db-backup', 'click', dbBackup);
    setupButtonEvent('cdn-backup', 'click', cdnBackup);
    setupButtonEvent('restart-server', 'click', restartServer);

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

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

async function checkLogin() {
    const session = getCookie('sessionToken');
    if (session) {
        try {
            const response = await fetch(api + '/account/validate', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'authorization': session
                },
            });

            if (response.ok) {
                displayUser();
            } else {
                document.cookie = 'sessionToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                window.location.href = '/auth';
            }
        } catch (error) {
            console.error('Login failed:', error);
        }
    } else {
        window.location.href = '/auth';
    }
}

async function displayUser() {
    try {
        const response = await fetch(api + '/account', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'authorization': getCookie('sessionToken')
            },
        });
        const data = await response.json();
        document.getElementById('username').textContent = data.username
        document.getElementById('useremail').textContent = data.email
        document.getElementById('login').classList.add('hidden');
        document.getElementById('pfp').classList.remove('hidden');
        document.getElementById('pfp').src = cdn + '/users/pfp/' + data.username + '.png';
    } catch (error) {
        console.error('Error fetching user:', error);
    }
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