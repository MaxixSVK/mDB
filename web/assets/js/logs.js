let user = {};
let logsLimit, logsOffset;

document.addEventListener('DOMContentLoaded', async function () {
    user = await checkLogin();

    if (!user) {
        window.location.href = '/about';
    }

    logsLimit = 10;
    logsOffset = 0;

    addEventListeners();
    displayUser();
    fetchLogs();
});

function addEventListeners() {
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
        const response = await fetch(api + '/library/manage/logs?limit=' + logsLimit + '&offset=' + logsOffset, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'authorization': session
            },
        });

        const { data: logs } = await response.json();

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
        <div class="p-4 bg-[#1F1F1F] mx-4 rounded-md text-white text-center mb-4">
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
        <div class="flex items-center mb-2">
            <span class="font-bold ${changeTypeColor}">${log.change_type.toUpperCase()} <span class="text-gray-400">entry in ${log.resource_type.toUpperCase()}</span></span>
        </div>
        ${log.change_type !== 'new' ? createDataElement(log.old_data) : ''}
        ${log.change_type !== 'delete' ? createDataElement(log.new_data) : ''}
        <div class="text-gray-400">
            ${new Date(log.created_at).toLocaleString()}
        </div>
    `;
    return logElement;
}

function getChangeTypeColor(changeType) {
    switch (changeType) {
        case 'new':
            return 'text-green-500';
        case 'update':
            return 'text-yellow-500';
        case 'delete':
            return 'text-red-500';
    }
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
}

function createDataElement(data) {
    const formattedData = { ...data };
    if (formattedData.started_reading) formattedData.started_reading = formatDate(formattedData.started_reading);
    if (formattedData.ended_reading) formattedData.ended_reading = formatDate(formattedData.ended_reading);
    if (formattedData.date) formattedData.date = formatDate(formattedData.date);

    return `
        <div class="text-white mb-2 overflow-x-auto">
            <pre class="bg-[#2A2A2A] p-2 rounded-sm whitespace-pre-wrap md:whitespace-pre">${JSON.stringify(formattedData, null, 2)}</pre>
        </div>
    `;
}

async function downloadLogs() {
    try {
        const session = getCookie('sessionToken');
        const response = await fetch(api + '/library/manage/logs?all=true', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'authorization': session
            },
        });
        if (!response.ok) {
            throw new Error(`Failed to download logs (${response.status})`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        try {
            a.href = url;
            a.download = 'logs.json';
            document.body.appendChild(a);
            a.click();
        } finally {
            a.remove();
            window.URL.revokeObjectURL(url);
        }
    } catch (error) {
        console.error('Error fetching logs:', error);
    }
}