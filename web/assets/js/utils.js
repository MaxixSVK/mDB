async function displayUser() {
    try {
        const user = await fetch(api + '/account', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'authorization': getCookie('sessionToken')
            },
        });
        const data = await user.json();

        const userPFP = await fetch(cdn + '/users/pfp/' + data.username + '.png');
        const contentType = userPFP.headers.get('content-type');

        updateUserInfo(data);

        if (contentType && contentType.indexOf('application/json') === -1) {
            updateUserProfilePicture(data.username);
        }

    } catch (error) {
        console.error('Error fetching user:', error);
    }
}

function updateUserInfo(data) {
    document.getElementById('username').textContent = data.username;
    document.getElementById('useremail').textContent = data.email;
}

function updateUserProfilePicture(username) {
    document.getElementById('login').classList.add('hidden');
    document.getElementById('pfp').classList.remove('hidden');
    document.getElementById('pfp').src = cdn + '/users/pfp/' + username + '.png';
}

function logout() {
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

function errorScreen() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="bg-[#131313] font-figtree flex items-center justify-center h-screen">
            <div class="text-center">
                <h1 class="text-9xl font-bold text-white">Error</h1>
                <p class="text-2xl text-gray-400 mb-4">Something Went Wrong</p>
                <p class="text-lg text-gray-500 mb-8">Sorry, an unexpected error has occurred. Please try again later.</p>
                <a href="javascript:location.reload()"
                    class="w-full md:w-auto border-2 border-dashed border-[#FFA500] text-white font-semibold py-3 px-6 rounded-full shadow-lg hover:bg-[#FFA500] hover:text-black transition duration-300 ease-in-out transform hover:scale-105">Refresh</a>
            </div>
        </div>
    `;
}