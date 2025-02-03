document.addEventListener("DOMContentLoaded", function () {
    checkLogin();
    document.getElementById('changePassword').addEventListener('submit', function (event) {
        event.preventDefault();
        changePassword();
    });
});

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
                fetchSessions();
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