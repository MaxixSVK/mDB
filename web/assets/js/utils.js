let api, cdn, dev = null;

const CACHE_KEY = 'mdb.config';
const CACHE_TTL_MS = 600000;

async function waitForApi() {
    let cached = null;
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.timestamp && (Date.now() - parsed.timestamp) < CACHE_TTL_MS) {
            cached = parsed.data;
        }
    }

    const data = cached || await fetch('/api').then(res => res.json());

    if (!cached) {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
    }

    dev = data.env === 'dev';
    api = `${dev ? 'http' : 'https'}://${data.url}`;
    cdn = api + '/cdn';

    if (dev) {
        fetch(api)
            .then(response => response.json())
            .then(data => {
                createWarningDiv(`You are using development API. Version: ${data.version}`);
            })
    }

    return { api, cdn };
};

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
    await waitForApi();

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

                return user;
            } else {
                logout();
            }
        } catch (err) {
            console.error('Error checking token:', err);
        }
    }
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

async function fetchPublicUserData() {
    const username = publicUser.username || user?.username;

    const response = user && !publicUser.public
        ? await fetch(api + '/library/user/' + username, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': getCookie('sessionToken')
            },
        })
        : await fetch(api + '/library/user/' + username);

    const data = await response.json();
    publicUser = { ...publicUser, ...data };
}

function showNotification(message, type = 'info', progress = null) {
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'fixed top-4 right-4 space-y-4 z-50';
        document.body.appendChild(container);
    }
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

async function displayUser(userInfo = true, bypassCache = false) {
    try {
        const user = await fetch(api + '/account', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'authorization': getCookie('sessionToken')
            },
        });
        const userData = await user.json();

        if (userInfo) {
            document.getElementById('username').textContent = userData.username;
            document.getElementById('useremail').textContent = userData.email;
        }

        if (!userData.pfp) {
            document.getElementById('pfp').classList.add('hidden');
            document.getElementById('nopfp').classList.remove('hidden');
            return;
        }

        document.getElementById('nopfp').classList.add('hidden');
        document.getElementById('pfp').classList.remove('hidden');
        const cacheBuster = bypassCache ? '&t=' + Date.now() : '';
        document.getElementById('pfp').src = cdn + '/users/pfp/u-' + userData.id + '.png?q=l' + cacheBuster;
    } catch (error) {
        console.error('Error fetching user:', error);
    }
}

function showProfileBanner(username) {
    const banner = document.getElementById('profile-banner');

    const wrapper = document.createElement('div');
    wrapper.className = 'mx-2 md:mx-4 mt-4 flex items-center gap-3 bg-[#1F1F1F] border border-[#2a2a2a] rounded-md px-4 py-3 text-white hover:border-[#FFA500] transition-colors duration-200 cursor-pointer';
    wrapper.onclick = () => window.location.href = `/user/${username}`;

    const text = document.createElement('span');
    text.className = 'text-xl font-semibold text-gray-300';

    const usernameSpan = document.createElement('span');
    usernameSpan.className = 'text-xl text-[#FFA500] font-bold';
    usernameSpan.textContent = username;

    text.append(
        'Viewing ',
        usernameSpan,
        "'s library"
    );

    wrapper.appendChild(text);

    banner.appendChild(wrapper);
    banner.classList.remove('hidden');
}

const createWarningDiv = (message) => {
    const warningDiv = document.createElement('div');
    warningDiv.className = 'fixed top-0 left-0 right-0 bg-red-600 text-white text-center p-4 z-10';
    warningDiv.innerText = message;

    document.body.insertBefore(warningDiv, document.body.firstChild);

    document.body.style.paddingTop = `${warningDiv.offsetHeight}px`;
};

function createStatSection(data) {
    const statsElement = document.getElementById('stats');
    statsElement.className = 'bg-[#1F1F1F] rounded-md p-4 md:p-6 mt-2 mx-2 md:mt-4 md:mx-4 text-white cursor-pointer';
    statsElement.textContent = '';

    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-3 gap-2 md:gap-6';

    function createStatCard(id, value, label) {
        const card = document.createElement('div');
        card.className = 'text-center bg-[#2A2A2A] p-2 md:p-4 rounded-md';

        const count = document.createElement('h3');
        count.id = id;
        count.className = 'text-2xl md:text-3xl font-bold';
        count.textContent = value;

        const text = document.createElement('p');
        text.className = 'text-md md:text-lg';
        text.textContent = label;

        card.appendChild(count);
        card.appendChild(text);
        return card;
    }

    grid.appendChild(createStatCard('series-count', data.seriesCount, 'Series'));
    grid.appendChild(createStatCard('book-count', data.bookCount, 'Books'));
    grid.appendChild(createStatCard('chapter-count', data.chapterCount, 'Chapters'));

    statsElement.appendChild(grid);
}