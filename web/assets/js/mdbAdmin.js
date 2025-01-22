document.addEventListener("DOMContentLoaded", function () {
    checkLogin();
    setupEventListeners();
});

function setupEventListeners() {
    setupButtonEvent('logout', 'click', handleLogout);
    setupButtonEvent('db-backup', 'click', dbBackup);
    setupButtonEvent('cdn-backup', 'click', cdnBackup);
    setupToggleEvent('passwordHeader', 'changePassowrd');
    setupToggleEvent('sessionHeader', 'sessionList');
    setupFormSubmitEvent('cdn-upload-form', handleCDNUpload);
    setupFileInputChangeEvent('cdn-upload', 'file-name');
    setupFileNameClickEvent('file-name');
    setupFormSubmitEvent('changePassowrd', changePassowrd);
    setupButtonEvent('qrGenHeader', 'click', genQRCode);
    setupSearchEvent('search-cdn', renderCDNList, 250);
}

function setupButtonEvent(elementId, eventType, handler) {
    const element = document.getElementById(elementId);
    element.addEventListener(eventType, handler);
}

function setupToggleEvent(headerId, contentId) {
    const header = document.getElementById(headerId);
    header.addEventListener('click', function () {
        const content = document.getElementById(contentId);
        content.classList.toggle('hidden');
    });
}

function setupFormSubmitEvent(formId, handler) {
    const form = document.getElementById(formId);
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        handler();
    });
}

function setupFileInputChangeEvent(inputId, fileNameId) {
    const fileInput = document.getElementById(inputId);
    fileInput.addEventListener('change', function () {
        const fileName = this.files.length > 0 ? this.files[0].name : 'Nothing selected';
        document.getElementById(fileNameId).textContent = fileName;
    });
}

function setupFileNameClickEvent(fileNameId) {
    const fileName = document.getElementById(fileNameId);
    fileName.textContent = 'Nothing selected';
    fileName.addEventListener('click', function () {
        const textToCopy = fileName.textContent;
        const urlRegex = /https?:\/\/[^\s]+/;

        if (urlRegex.test(textToCopy)) {
            console.log(textToCopy);
            navigator.clipboard.writeText(textToCopy);
            showNotification('Link copied to clipboard', 'success');
        }
    });
}

function handleCDNUpload() {
    const form = new FormData();
    const fileInput = document.getElementById('cdn-upload');
    const file = fileInput.files[0];
    if (!file) return showNotification('Please select a file', 'error');
    form.append('image', file);
    uploadCDN(form);
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
                fetchSessions();
                renderCDNList();
            } else {
                handleLogout();
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

function handleLogout() {
    fetch(api + '/account/logout', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'authorization': getCookie('sessionToken')
        },
    }).then(() => {
        document.cookie = 'sessionToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        window.location.href = '/auth';
    });
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
        document.getElementById('pfp').src = api + '/cdn/pfp/' + data.username + '.png';
    } catch (error) {
        console.error('Error fetching user:', error);
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

function refreshContent() {
    const addDataTypeSelect = document.getElementById('add-data-type');
    const editDataTypeSelect = document.getElementById('edit-data-type');
    const deleteDataTypeSelect = document.getElementById('delete-data-type');

    addDataTypeSelect.dispatchEvent(new Event('change'));
    editDataTypeSelect.dispatchEvent(new Event('change'));
    deleteDataTypeSelect.dispatchEvent(new Event('change'));
}

async function fetchSessions() {
    const sessionToken = getCookie('sessionToken');

    try {
        const response = await fetch(api + '/account/sessions', { headers: { 'Authorization': sessionToken } });
        const sessions = await response.json();
        renderSessions(sessions);
    } catch (error) {
        console.error('Error fetching sessions:', error);
    }
}

async function getLocation(ip) {
    const ipList = ip.split(',').map(ip => ip.trim());
    const firstIp = ipList[0];


    if (window.location.hostname !== 'localhost') {
        return ipList[0];
    }

    try {
        const response = await fetch(`http://ip-api.com/json/${firstIp}`);
        const data = await response.json();
        if (data.status === 'success') {
            return `${data.city}, ${data.regionName}, ${data.country}`;
        } else {
            return 'Unknown location';
        }
    } catch (error) {
        console.error('Error fetching location:', error);
        return 'Unknown location';
    }
}

async function renderSessions(sessions) {
    const sessionToken = getCookie('sessionToken');
    const currentSessionID = await fetch(api + '/account/validate', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': sessionToken
        }
    }).then(response => response.json()).then(data => String(data.sessionId)).catch(error => {
        console.error('Error fetching current session ID:', error);
        return null;
    });

    const sessionList = document.getElementById('sessionList');
    sessionList.innerHTML = '';

    for (const session of sessions) {
        const listItem = document.createElement('li');
        listItem.className = 'bg-[#2A2A2A] p-4 md:p-6 mt-4 rounded-md shadow-lg flex justify-between items-center';

        const parser = new UAParser();
        parser.setUA(session.user_agent);
        const uaResult = parser.getResult();
        const userAgentInfo = `${uaResult.browser.name}, ${uaResult.os.name}`;

        const location = await getLocation(session.ip_address);
        const id = String(session.id);

        const isCurrentSession = id === currentSessionID;

        listItem.innerHTML = `
            <div>
                <span class="font-bold text-white">${userAgentInfo} ${isCurrentSession ? '<span class="text-green-600 font-bold">This device</span>' : ''}</span><br>
                <span class="text-sm md:text-md font-medium text-gray-400">${location}</span><br>
                <span class="text-sm md:text-md font-medium text-gray-400">${new Date(session.created_at).toLocaleString()}</span><br>
            </div>
            <button class="destroySessionButton bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg">
                <i class="fas fa-trash-alt"></i>
            </button>
        `;
        listItem.querySelector('.destroySessionButton').addEventListener('click', () => destroySession(session.id));
        sessionList.appendChild(listItem);
    }
}

async function destroySession(sessionId) {
    const sessionToken = getCookie('sessionToken');

    try {
        const currentSessionID = await fetch(api + '/account/validate', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': sessionToken
            }
        }).then(response => response.json()).then(data => String(data.sessionId)).catch(error => {
            console.error('Error fetching current session ID:', error);
            return null;
        });

        await fetch(api + '/account/session-destroy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': sessionToken
            },
            body: JSON.stringify({ sessionId })
        });

        if (String(sessionId) === currentSessionID) {
            localStorage.removeItem('sessionToken');
            window.location.href = '/auth';
            console.log('Redirecting to login page');
        } else {
            fetchSessions();
        }
    } catch (error) {
        console.error('Error destroying session:', error);
    }
}

function dbBackup() {
    try {
        showNotification('Sending request to backup database, please wait this may take a while', 'info');
        fetch(api + '/backup-db', {
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

async function uploadCDN(data) {
    try {
        const xhr = new XMLHttpRequest();
        const url = cdn + '/upload';
        const token = getCookie('sessionToken');

        xhr.open('POST', url, true);
        xhr.setRequestHeader('Authorization', token);

        xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
                const percentComplete = (event.loaded / event.total) * 100;
                showNotification('Uploading file', 'info', percentComplete);
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                const result = JSON.parse(xhr.responseText);
                renderCDNList();
                showNotification(`File uploaded successfully ${result.filename}`, 'success');
                document.getElementById('cdn-upload').value = '';
                document.getElementById('file-name').textContent = 'Nothing selected';
            } else {
                throw new Error('Network response was not ok');
            }
        });

        xhr.addEventListener('error', () => {
            showNotification('File upload failed', 'error');
        });

        xhr.send(data);
    } catch (error) {
        showNotification('File upload failed', 'error');
    }
}

async function fetchCDNList(searchQuery = '') {
    try {
        const response = await fetch(`${cdn}/images/search/${searchQuery}`, {
            headers: {
                'Authorization': getCookie('sessionToken')
            }
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching CDN list:', error);
        return [];
    }
}

function setupSearchEvent(searchId, handler, delay) {
    const searchElement = document.getElementById(searchId);
    searchElement.addEventListener('input', debounce((event) => {
        const searchQuery = event.target.value;
        handler(searchQuery);
    }, delay));
}

async function renderCDNList(searchQuery = '') {
    const cdnList = document.getElementById('cdnList');
    cdnList.innerHTML = '';

    if (searchQuery.trim() === '') {
        const listItem = document.createElement('p');
        listItem.className = 'bg-[#2A2A2A] p-4 md:p-6 mt-4 rounded-md shadow-lg text-white text-center';
        listItem.textContent = 'Please enter a search query';
        cdnList.appendChild(listItem);
        return;
    }

    const list = await fetchCDNList(searchQuery);
    const filteredList = list.filter(item => item.toLowerCase().includes(searchQuery.toLowerCase()));
    const limitedList = filteredList.slice(0, 5);

    if (limitedList.length === 0) {
        const listItem = document.createElement('p');
        listItem.className = 'bg-[#2A2A2A] p-4 md:p-6 mt-4 rounded-md shadow-lg text-white text-center';
        listItem.textContent = 'No files found';
        cdnList.appendChild(listItem);
    }

    limitedList.forEach(item => {
        const listItem = createListItem(item);
        cdnList.appendChild(listItem);
    });
}   

function createListItem(item) {
    const listItem = document.createElement('li');
    listItem.className = 'bg-[#2A2A2A] p-4 md:p-6 mt-4 rounded-md shadow-lg flex justify-between items-center';

    listItem.innerHTML = `
        <span class="font-bold text-white item-text flex-grow truncate overflow-hidden whitespace-nowrap">${item}</span>
        <i class="fas fa-edit text-blue-500 cursor-pointer rename-icon transition duration-200 ease-in-out mr-2"></i>
        <i class="fas fa-trash-alt text-red-500 cursor-pointer delete-icon transition duration-200 ease-in-out"></i>
    `;

    const deleteIcon = listItem.querySelector('.delete-icon');
    const renameIcon = listItem.querySelector('.rename-icon');
    const itemText = listItem.querySelector('.item-text');

    deleteIcon.addEventListener('click', event => handleDeleteIconClick(event, item, listItem));
    renameIcon.addEventListener('click', event => handleRenameIconClick(event, item));
    itemText.addEventListener('click', () => handleItemTextClick(item));

    return listItem;
}

function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

async function handleDeleteIconClick(event, item, listItem) {
    event.stopPropagation();
    const response = await fetch(cdn + `/images/${item}`, {
        method: 'DELETE',
        headers: {
            'Authorization': getCookie('sessionToken')
        },
    });

    if (response.ok) {
        listItem.remove();
        showNotification('File deleted successfully', 'success');
    } else {
        showNotification('File deletion failed', 'error');
    }
}

function handleRenameIconClick(event, item) {
    event.stopPropagation();
    const renameModal = document.getElementById('renameModal');
    const newFilenameInput = document.getElementById('newFilenameInput');
    const renameConfirmButton = document.getElementById('renameConfirmButton');
    const renameCancelButton = document.getElementById('renameCancelButton');

    newFilenameInput.value = item;
    renameModal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    newFilenameInput.focus();

    newFilenameInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            renameConfirmButton.click();
        } else if (e.key === 'Escape') {
            renameModal.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
        }
    });

    renameConfirmButton.onclick = async function () {
        const newFilename = newFilenameInput.value;
        if (newFilename && newFilename !== item) {
            const response = await fetch(cdn + `/images/rename/${item}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': getCookie('sessionToken')
                },
                body: JSON.stringify({ newFilename })
            });

            if (response.ok) {
                showNotification('File renamed successfully', 'success');
                renderCDNList();
            } else {
                showNotification('File rename failed', 'error');
            }
        }
        renameModal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    };

    renameCancelButton.onclick = function () {
        renameModal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    };
}

function handleItemTextClick(item) {
    navigator.clipboard.writeText(`https://apimdb.maxix.sk/cdn/images/${item}`).then(() => {
        showNotification('Link copied to clipboard', 'success');
    }).catch(err => {
        showNotification('Failed to copy link to clipboard', 'error');
        console.error('Failed to copy text: ', err);
    });
}

async function changePassowrd() {
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
        showNotification('Passwords do not match', 'error');
        return;
    }

    try {
        const response = await fetch(api + '/account/change-password', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': getCookie('sessionToken')
            },
            body: JSON.stringify({ oldPassword, newPassword })
        });

        const responseData = await response.json();
        if (!response.ok) {
            throw new Error(responseData.msg);
        }

        showNotification(responseData.msg, 'success');

        document.getElementById('oldPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
    } catch (error) {
        showNotification(error.message || 'Failed to change password', 'error');
    }
}

async function genQRCode() {
    const qrGen = document.getElementById('qrGen');

    qrGen.classList.toggle('hidden');
    const response = await fetch(api + '/auth/generate-qr-pc-m', {
        headers: {
            'Authorization': getCookie('sessionToken')
        }
    });

    if (response.ok) {
        const data = await response.json();
        const qrCodeUrl = data.qrCodeUrl;

        const img = document.createElement('img');
        img.src = qrCodeUrl;
        img.alt = 'QR Code';

        qrGen.appendChild(img);
    } else {
        showNotification('Failed to generate QR code', 'error');
    }
}