let limit, offset;

document.addEventListener('DOMContentLoaded', function () {
    limit = 10;
    offset = 0;
    checkLogin();
    addEventListeners();
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

            if (response.ok) {
                fetchLogs();
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

function addEventListeners() {
    document.getElementById('load-more').addEventListener('click', function () {
        offset += limit;
        fetchLogs();
    });

    document.getElementById('logs-backup').addEventListener('click', async function () {
        try {
            const session = getCookie('sessionToken');
            const response = await fetch(`${api}/logs?all=true&format=file`, {
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
    });
}

async function fetchLogs() {
    try {
        const session = getCookie('sessionToken');
        const response = await fetch(`${api}/logs?limit=${limit}&offset=${offset}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'authorization': session
            },
        });

        const logs = await response.json();

        if (logs.length === 0) {
            displayNoResults();
        } else {
            displayLogs(logs);
            if (logs.length < limit) {
                displayNoResults();
            }
        }
    } catch (error) {
        console.error('Error fetching logs:', error);
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

function displayLogs(logs) {
    const logContainer = document.getElementById('logs');
    logs.forEach(log => {
        const logElement = createLogElement(log);
        logContainer.appendChild(logElement);
    });
}

function displayNoResults() {
    const logsContainer = document.getElementById('logs');
    logsContainer.innerHTML += `
        <div class="p-4 bg-[#1F1F1F] mx-4 rounded-md text-white text-center">
            End of logs
        </div>
    `;
    document.getElementById('load-more').classList.add('hidden');
}

function createLogElement(log) {
    const logElement = document.createElement('div');
    logElement.className = 'bg-[#1F1F1F] p-6 rounded-lg shadow-md mb-4 mx-4';

    const changeTypeColor = getChangeTypeColor(log.change_type);

    logElement.innerHTML = `
        <div class="flex items-center">
            <div class="text-lg font-bold ${changeTypeColor}">
                ${log.change_type}
            </div>
            <div class="ml-2 text-sm text-gray-400">
                from ${log.table_name.toUpperCase()}
            </div>
        </div>
        <div class="text-gray-400 mb-2">
            <strong>Record ID:</strong> ${log.record_id}
        </div>
        ${log.change_type !== 'INSERT' ? createDataElement(log.old_data) : ''}
        ${log.change_type !== 'DELETE' ? createDataElement(log.new_data) : ''}
        <div class="text-gray-400">
            ${new Date(log.change_date).toLocaleString()}
        </div>
    `;
    return logElement;
}

function getChangeTypeColor(changeType) {
    switch (changeType) {
        case 'INSERT':
            return 'text-green-500';
        case 'UPDATE':
            return 'text-yellow-500';
        case 'DELETE':
            return 'text-red-500';
        default:
            return '';
    }
}

function createDataElement(data) {
    return `
        <div class="text-white mb-2 overflow-x-auto">
            <pre class="bg-[#2A2A2A] p-2 rounded whitespace-pre-wrap md:whitespace-pre">${JSON.stringify(data, null, 2)}</pre>
        </div>
    `;
}