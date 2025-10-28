document.addEventListener("DOMContentLoaded", async function () {
    ({ loggedIn } = await checkLogin());
    if (!loggedIn) window.location.href = '/about';
    displayUser();
    fetchSessions();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('changePassword').addEventListener('submit', function (event) {
        event.preventDefault();
        changePassword();
    });

    document.getElementById('deleteAccount').addEventListener('submit', function (event) {
        event.preventDefault();
        deleteAccount();
    });

    document.getElementById('logout').addEventListener('click', logout);

    document.getElementById('changePasswordToggle').addEventListener('click', function () {
        const content = document.getElementById('changePasswordContent');
        const icon = document.getElementById('changePasswordIcon');

        if (content.classList.contains('hidden')) {
            content.classList.remove('hidden');
            icon.classList.add('rotate-180');
        } else {
            content.classList.add('hidden');
            icon.classList.remove('rotate-180');
        }
    });

    document.getElementById('changeEmailToggle').addEventListener('click', function () {
        const content = document.getElementById('changeEmailContent');
        const icon = document.getElementById('changeEmailIcon');

        if (content.classList.contains('hidden')) {
            content.classList.remove('hidden');
            icon.classList.add('rotate-180');
        } else {
            content.classList.add('hidden');
            icon.classList.remove('rotate-180');
        }
    });

    document.getElementById('deleteAccountToggle').addEventListener('click', function () {
        const content = document.getElementById('deleteAccountContent');
        const icon = document.getElementById('deleteAccountIcon');

        if (content.classList.contains('hidden')) {
            content.classList.remove('hidden');
            icon.classList.add('rotate-180');
        } else {
            content.classList.add('hidden');
            icon.classList.remove('rotate-180');
        }
    });

    document.getElementById('sessionsToggle').addEventListener('click', function () {
        const content = document.getElementById('sessionsContent');
        const icon = document.getElementById('sessionsIcon');

        if (content.classList.contains('hidden')) {
            content.classList.remove('hidden');
            icon.classList.add('rotate-180');
        } else {
            content.classList.add('hidden');
            icon.classList.remove('rotate-180');
        }
    });
}

async function changePassword() {
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

async function renderSessions(sessions) {
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

        const sessionList = document.getElementById('sessionList');
        sessionList.innerHTML = '';

        for (const session of sessions) {
            const listItem = document.createElement('li');
            listItem.className = 'bg-[#2A2A2A] p-4 md:p-6 mt-4 rounded-md shadow-lg flex justify-between items-center';

            const parser = new UAParser();
            parser.setUA(session.user_agent);
            const uaResult = parser.getResult();
            const userAgentInfo = `${uaResult.browser.name}, ${uaResult.os.name}`;

            const ipList = session.ip_address.split(',').map(ip => ip.trim());
            const location = ipList[0];
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
    } catch (error) {
        console.error('Error rendering sessions:', error);
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

async function deleteAccount() {
    const password = document.getElementById('deletePassword').value;

    try {
        const response = await fetch(api + '/account/delete', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': getCookie('sessionToken')
            },
            body: JSON.stringify({ password })
        });

        const responseData = await response.json();
        if (!response.ok) {
            throw new Error(responseData.msg);
        }

        showNotification(responseData.msg, 'success');
        logout(true);
    } catch (error) {
        showNotification(error.message || 'Failed to delete account', 'error');
    }
}
