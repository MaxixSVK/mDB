let userId, sessionId

document.addEventListener('DOMContentLoaded', async function () {
    ({ loggedIn, userId, sessionId } = await checkLogin());

    if (!loggedIn) {
        window.location.href = '/about';
    }

    addEventListeners();
    displayUser();
});

function addEventListeners() {
    document.getElementById('changePassword').addEventListener('submit', function (event) {
        event.preventDefault();
        changePassword();
    });

    document.getElementById('deleteAccount').addEventListener('submit', function (event) {
        event.preventDefault();
        deleteAccount();
    });

    document.getElementById('logout').addEventListener('click', logout);

    document.getElementById('changePasswordToggle').addEventListener('click', () =>
        toggleUIVisibility('changePasswordContent', 'changePasswordIcon')
    );

    document.getElementById('changeEmailToggle').addEventListener('click', () =>
        toggleUIVisibility('changeEmailContent', 'changeEmailIcon')
    );

    document.getElementById('deleteAccountToggle').addEventListener('click', () =>
        toggleUIVisibility('deleteAccountContent', 'deleteAccountIcon')
    );

    document.getElementById('sessionsToggle').addEventListener('click', () => {
        toggleUIVisibility('sessionsContent', 'sessionsIcon');
        fetchSessions();
    });
}

function toggleUIVisibility(contentId, iconId) {
    const content = document.getElementById(contentId);
    const icon = document.getElementById(iconId);

    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        icon.classList.add('rotate-180');
    } else {
        content.classList.add('hidden');
        icon.classList.remove('rotate-180');
    }
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
        showNotification('Failed to change password', 'error');
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
        showNotification('Failed to delete account', 'error');
    }
}

async function fetchSessions() {
    const sessionToken = getCookie('sessionToken');

    const response = await fetch(api + '/account/sessions', {
        headers: { 'Authorization': sessionToken }
    });

    const sessions = await response.json();
    renderSessions(sessions);
}

async function renderSessions(sessions) {
    const sessionList = document.getElementById('sessionList');
    sessionList.innerHTML = '';

    for (const session of sessions) {
        const listItem = document.createElement('li');
        listItem.className = 'bg-[#2A2A2A] p-3 md:p-4 mt-3 rounded-md transition duration-300 ease-in-out flex justify-between items-center gap-4';

        const parser = new UAParser();
        parser.setUA(session.user_agent);
        const uaResult = parser.getResult();
        const userAgentInfo = `${uaResult.browser.name}, ${uaResult.os.name}`;

        const isCurrentSession = session.id === sessionId;

        listItem.innerHTML = `
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-semibold text-white text-sm">${userAgentInfo}</span>
                        ${isCurrentSession ? '<span class="text-[#FFA500] text-sm font-bold">Current</span>' : ''}
                    </div>
                    <div class="flex flex-col md:flex-row md:items-center md:gap-3 mt-1">
                        <span class="text-gray-400 text-xs flex items-center gap-1">
                            <i class="fas fa-network-wired text-[10px]"></i>
                            ${session.ip_address}
                        </span>
                        <span class="text-gray-400 text-xs flex items-center gap-1">
                            <i class="fas fa-clock text-[10px]"></i>
                            ${new Date(session.created_at).toLocaleString()}
                        </span>
                    </div>
                </div>
                <button class="destroySessionButton border-2 border-dashed border-red-500 hover:bg-red-500 text-white hover:text-black font-semibold py-2 px-4 rounded-lg transmition duration-300">
                    <i class="fas fa-trash-alt"></i>
                </button>
            `;
        listItem.querySelector('.destroySessionButton').addEventListener('click', () => destroySession(session.id));
        sessionList.appendChild(listItem);
    }
}

async function destroySession(targetSessionId) {
    const sessionToken = getCookie('sessionToken');

    try {
        if (targetSessionId == sessionId) {
            logout();
            return;
        }

        await fetch(api + '/account/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': sessionToken
            },
            body: JSON.stringify({ sessionId: targetSessionId })
        });

        fetchSessions();
    } catch (error) {
        showNotification('Failed to destroy session', 'error');
    }
}