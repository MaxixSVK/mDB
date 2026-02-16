let user

document.addEventListener('DOMContentLoaded', async function () {
    ({ loggedIn, user } = await checkLogin());

    if (!loggedIn) {
        window.location.href = '/about';
    }

    displayUser()
    addEventListeners();

    displayPublicStatus();
    fetchSessions();
});

function addEventListeners() {
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const category = this.dataset.category;

            document.querySelectorAll('.category-btn').forEach(b => {
                if (b.dataset.category === category) {
                    b.classList.remove('bg-[#1F1F1F]', 'text-gray-300', 'hover:bg-[#2a2a2a]');
                    b.classList.add('border-2', 'border-dashed', 'border-[#FFA500]', 'hover:bg-[#FFA500]', 'hover:text-black');
                    b.classList.add('active');
                } else {
                    b.classList.remove('border-2', 'border-dashed', 'border-[#FFA500]', 'hover:bg-[#FFA500]', 'hover:text-black');
                    b.classList.add('bg-[#1F1F1F]', 'text-gray-300', 'hover:bg-[#2a2a2a]');
                    b.classList.remove('active');
                }
            });

            document.querySelectorAll('.content-panel').forEach(panel => {
                if (panel.id === category) {
                    panel.classList.remove('hidden');
                    panel.classList.add('active');
                } else {
                    panel.classList.add('hidden');
                    panel.classList.remove('active');
                }
            });
        });
    });

    const activeBtn = document.querySelector('.category-btn.active');
    if (activeBtn) {
        activeBtn.click();
    }

    document.getElementById('logout').addEventListener('click', logout);

    document.getElementById('changePassword').addEventListener('submit', function (event) {
        event.preventDefault();
        changePassword();
    });

    document.getElementById('changeEmail').addEventListener('submit', function (event) {
        event.preventDefault();
        changeEmail();
    });

    document.getElementById('deleteAccount').addEventListener('submit', function (event) {
        event.preventDefault();
        deleteAccount();
    });

    document.getElementById('changeUsername').addEventListener('submit', function (event) {
        event.preventDefault();
        changeUsername();
    });

    document.getElementById('changeProfilePicture').addEventListener('submit', function (event) {
        event.preventDefault();
        changeProfilePicture();
    });

    document.getElementById('deleteProfilePicture').addEventListener('click', function () {
        deleteProfilePicture();
    });
}

async function changeUsername() {
    const newUsername = document.getElementById('newUsername').value;
    const password = document.getElementById('usernamePassword').value;

    try {
        const response = await fetch(api + '/account/change-username', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': getCookie('sessionToken')
            },
            body: JSON.stringify({ password, newUsername })
        });

        const responseData = await response.json();
        if (!response.ok) {
            if (responseData.error) {
                showNotification(responseData.error, 'error');
            } else {
                showNotification('Failed to change username', 'error');
            }
            return;
        }

        showNotification(responseData.msg, 'success');
        user.username = newUsername;
        displayUser();
        document.getElementById('newUsername').value = '';
        document.getElementById('usernamePassword').value = '';
    } catch (error) {
        showNotification('Failed to change username', 'error');
    }
}

async function changeProfilePicture() {
    const fileInput = document.getElementById('profilePicture');
    const file = fileInput.files[0];

    if (!file) {
        showNotification('Please select a file', 'error');
        return;
    }

    try {
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch(cdn + '/users/pfp/upload', {
            method: 'POST',
            headers: {
                'Authorization': getCookie('sessionToken')
            },
            body: formData
        });

        const responseData = await response.json();
        if (!response.ok) {
            if (responseData.error) {
                showNotification(responseData.error, 'error');
            } else {
                showNotification('Failed to update profile picture', 'error');
            }
            return;
        }

        showNotification(responseData.msg, 'success');
        displayUser(true, true);
        fileInput.value = '';
    } catch (error) {
        showNotification('Failed to update profile picture', 'error');
    }
}

async function deleteProfilePicture() {
    try {
        const response = await fetch(api + '/account/pfp/reset', {
            method: 'PUT',
            headers: {
                'Authorization': getCookie('sessionToken')
            }
        });
        const responseData = await response.json();
        if (!response.ok) {
            if (responseData.error) {
                showNotification(responseData.error, 'error');
            } else {
                showNotification('Failed to reset profile picture', 'error');
            }
            return;
        }
        showNotification(responseData.msg, 'success');
        user.pfp = false;
        displayUser(true, true);
    } catch (error) {
        showNotification('Failed to reset profile picture', 'error');
    }
}

async function changePassword() {
    const password = document.getElementById('oldPassword').value;
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
            body: JSON.stringify({ password, newPassword })
        });

        const responseData = await response.json();
        if (!response.ok) {
            if (responseData.error) {
                showNotification(responseData.error, 'error');
            } else {
                showNotification('Failed to change password', 'error');
            }
            return;
        }

        showNotification(responseData.msg, 'success');

        document.getElementById('oldPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
    } catch (error) {
        showNotification('Failed to change password', 'error');
    }
}

async function changeEmail() {
    const newEmail = document.getElementById('newEmail').value;
    const password = document.getElementById('emailPassword').value;
    try {
        const response = await fetch(api + '/account/change-email', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': getCookie('sessionToken')
            },
            body: JSON.stringify({ password, newEmail })
        });
        const responseData = await response.json();
        if (!response.ok) {
            if (responseData.error) {
                showNotification(responseData.error, 'error');
            } else {
                showNotification('Failed to change email', 'error');
            }
            return;
        }
        showNotification(responseData.msg, 'success');
        user.email = newEmail;
        displayUser();
        document.getElementById('newEmail').value = '';
        document.getElementById('emailPassword').value = '';
    } catch (error) {
        showNotification('Failed to change email', 'error');
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
            if (responseData.error) {
                showNotification(responseData.error, 'error');
            } else {
                showNotification('Failed to delete account', 'error');
            }
            return;
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

        const isCurrentSession = session.id === user.sessionId;

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
        if (targetSessionId == user.sessionId) {
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

async function displayPublicStatus() {
    const publicToggle = document.getElementById('public-status');
    if (!publicToggle || !user) {
        return;
    }

    const setToggleState = (isPublic) => {
        publicToggle.checked = isPublic;
    };

    setToggleState(Boolean(user.public));

    publicToggle.addEventListener('change', async () => {
        const isPublic = publicToggle.checked;

        try {
            const response = await fetch(api + '/account/public-status', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': getCookie('sessionToken')
                },
                body: JSON.stringify({ public: isPublic })
            });

            const responseData = await response.json();
            if (!response.ok) {
                setToggleState(Boolean(user.public));
                showNotification(responseData.error || 'Failed to update public status', 'error');
                return;
            }

            user.public = responseData.public;
            setToggleState(Boolean(user.public));
            showNotification(responseData.msg, 'success');
        } catch (error) {
            setToggleState(Boolean(user.public));
            showNotification('Failed to update public status', 'error');
        }
    });
}