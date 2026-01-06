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

function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

async function checkLogin() {
    const session = getCookie('sessionToken');
    if (session) {
        try {
            const response = await fetch(api + '/account', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'authorization': session
                },
            });

            if (response.ok) {
                const user = await response.json();

                return { loggedIn: true, userId: user.id, sessionId: user.sessionId };
            } else {
                logout();
                return { loggedIn: false };
            }
        } catch (err) {
            console.error('Login failed:', err);
            return { loggedIn: false };
        }
    } else {
        return { loggedIn: false };
    }
}

async function displayUser(userInfo = true) {
    try {
        const user = await fetch(api + '/account', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'authorization': getCookie('sessionToken')
            },
        });
        const data = await user.json();

        const userPFP = await fetch(cdn + '/users/pfp/' + data.id + '.png');
        const contentType = userPFP.headers.get('content-type');

        if (userInfo) updateUserInfo(data);

        if (contentType && contentType.indexOf('application/json') === -1) {
            document.getElementById('nopfp').classList.add('hidden');
            document.getElementById('pfp').classList.remove('hidden');
            document.getElementById('pfp').src = cdn + '/users/pfp/' + data.id + '.png?q=l';
        }

    } catch (error) {
        console.error('Error fetching user:', error);
    }
}

function updateUserInfo(data) {
    document.getElementById('username').textContent = data.username;
    document.getElementById('useremail').textContent = data.email;
}

async function logout(deletedAccount) {
    if (deletedAccount !== true) {
        await fetch(api + '/account/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'authorization': getCookie('sessionToken')
            },
        });
    }

    document.cookie = 'sessionToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    window.location.href = deletedAccount ? '/' : '/auth';
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
        <button class="ml-4 text-lg font-bold focus:outline-hidden" onclick="this.parentElement.remove()">×</button>
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

function showProfileBanner(username) {
    const banner = document.getElementById('profile-banner');
    while (banner.firstChild) {
        banner.removeChild(banner.firstChild);
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'flex items-center justify-center bg-blue-900/80 border border-blue-700 rounded-lg px-4 py-3 shadow text-white';

    const icon = document.createElement('i');
    icon.className = 'fas fa-user-friends mr-3 text-xl';

    const text = document.createElement('span');
    text.className = 'text-lg font-semibold';

    const usernameSpan = document.createElement('span');
    usernameSpan.className = 'text-blue-300';
    usernameSpan.textContent = `@${username}`;

    text.append(
        'You are viewing ',
        usernameSpan,
        "'s public library"
    );

    wrapper.appendChild(icon);
    wrapper.appendChild(text);

    banner.appendChild(wrapper);
    banner.classList.remove('hidden');
}
