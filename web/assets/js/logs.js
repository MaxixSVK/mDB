let userId, logsLimit, logsOffset;

document.addEventListener('DOMContentLoaded', async function () {
    logsLimit = 10;
    logsOffset = 0;

    ({ loggedIn, userId } = await checkLogin());

    if (!loggedIn) {
        window.location.href = '/about';
    }

    addEventListeners();
    displayUser();
    fetchLogs();
});

function addEventListeners() {
    document.getElementById('logout').addEventListener('click', logout);

    document.getElementById('load-more').addEventListener('click', function () {
        logsOffset += logsLimit;
        fetchLogs();
    });

    document.getElementById('downloadLogsButton').addEventListener('click', function () {
        downloadLogs();
    });
}

async function fetchLogs() {
    try {
        const session = getCookie('sessionToken');
        const response = await fetch(api + '/account/logs?limit=' + logsLimit + '&offset=' + logsOffset, {
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
            if (logs.length < logsLimit) {
                displayNoResults();
            }
        }
    } catch (error) {
        console.error('Error fetching logs:', error);
    }
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

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
}

function createDataElement(data) {
    const formattedData = { ...data };
    if (formattedData.started_reading) formattedData.started_reading = formatDate(formattedData.started_reading);
    if (formattedData.ended_reading) formattedData.ended_reading = formatDate(formattedData.ended_reading);

    return `
        <div class="text-white mb-2 overflow-x-auto">
            <pre class="bg-[#2A2A2A] p-2 rounded-sm whitespace-pre-wrap md:whitespace-pre">${JSON.stringify(formattedData, null, 2)}</pre>
        </div>
    `;
}

async function downloadLogs() {
    try {
        const session = getCookie('sessionToken');
        const response = await fetch(api + '/account/logs?all=true&format=file', {
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