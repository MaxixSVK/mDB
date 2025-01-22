document.addEventListener("DOMContentLoaded", function () {
    checkLogin();

    const configEditor = CodeMirror.fromTextArea(document.getElementById('config-editor'), {
        mode: "application/json",
        lineNumbers: true,
        theme: "material-darker",
        lineWrapping: true
    });

    document.getElementById('restart-server').addEventListener('click', restartServer);

    document.getElementById('config-form').addEventListener('submit', function (event) {
        event.preventDefault();
        saveNewConfig(configEditor);
    });

    getCurrentConfig(configEditor);
});

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

            if (!response.ok) {
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

function showNotification(message, type = 'info', progress = null) {
    const container = document.getElementById('notification-container');
    let notification = Array.from(container.children).find(child => child.dataset.message === message);

    if (!notification) {
        notification = document.createElement('div');
        notification.dataset.message = message;
        container.appendChild(notification);
    }

    const progressBar = notification.querySelector('.progress-bar') || document.createElement('div');
    const progressElement = progressBar.querySelector('.progress') || document.createElement('div');

    const baseClasses = 'p-4 rounded-lg shadow-lg flex items-center justify-between relative overflow-hidden transition-transform transform-gpu duration-300 ease-in-out';
    const typeClasses = {
        info: 'bg-blue-600 text-white',
        success: 'bg-green-600 text-white',
        warning: 'bg-yellow-600 text-black',
        error: 'bg-red-600 text-white'
    };

    message = message.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    if (progress !== null) {
        message += ` (${progress.toFixed(2)}%)`;
    }

    notification.className = `${baseClasses} ${typeClasses[type]} translate-y-4 opacity-0`;
    notification.innerHTML = `
        <span class="flex-1">${message}</span>
        <button class="ml-4 text-lg font-bold focus:outline-none" onclick="this.parentElement.remove()">×</button>
    `;

    progressBar.className = 'progress-bar absolute bottom-0 left-0 w-full h-1 bg-opacity-50';
    progressElement.className = 'progress h-full bg-white transition-all duration-[5000ms] ease-linear';
    progressElement.style.width = '100%';

    progressBar.appendChild(progressElement);
    notification.appendChild(progressBar);

    setTimeout(() => {
        notification.classList.remove('translate-y-4', 'opacity-0');
        notification.classList.add('translate-y-0', 'opacity-100');
        setTimeout(() => {
            progressElement.style.width = '0%';
        }, 50);
    }, 10);

    setTimeout(() => {
        notification.classList.add('translate-y-4', 'opacity-0');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}