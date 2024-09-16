const api = 'https://apimdb.maxix.sk';
// const api = 'http://localhost:7000';

document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.forms['login'];
    loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const LoginForm = document.getElementById('login');
        handleLogin({
            username: LoginForm.elements['username'].value,
            password: LoginForm.elements['password'].value
        });
    });
    document.getElementById('scanQRCode').addEventListener('click', scanQRCode);
});

async function handleLogin(loginData) {
    try {
        const response = await fetch(api + '/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(loginData)
        });

        if (response.ok) {
            const responseData = await response.json();
            setCookie('sessionToken', responseData.sessionToken, 365);
            window.location.href = '/dashboard';
        } else {
            const responseData = await response.json();
            showNotification(responseData.msg, 'error');
        }
    } catch (error) {
        console.error('Login failed:', error);
    }
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

function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    const progressBar = document.createElement('div');
    const progress = document.createElement('div');

    const baseClasses = 'p-4 rounded-lg shadow-lg flex items-center justify-between relative overflow-hidden transition-transform transform-gpu duration-300 ease-in-out';
    const typeClasses = {
        info: 'bg-blue-600 text-white',
        success: 'bg-green-600 text-white',
        warning: 'bg-yellow-600 text-black',
        error: 'bg-red-600 text-white'
    };

    message = message.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    notification.className = `${baseClasses} ${typeClasses[type]} translate-y-4 opacity-0`;
    notification.innerHTML = `
        <span class="flex-1">${message}</span>
        <button class="ml-4 text-lg font-bold focus:outline-none" onclick="this.parentElement.remove()">×</button>
    `;

    progressBar.className = 'absolute bottom-0 left-0 w-full h-1 bg-opacity-50';
    progress.className = 'h-full bg-white transition-all duration-[5000ms] ease-linear';
    progress.style.width = '100%';

    progressBar.appendChild(progress);
    notification.appendChild(progressBar);
    container.appendChild(notification);

    setTimeout(() => {
        notification.classList.remove('translate-y-4', 'opacity-0');
        notification.classList.add('translate-y-0', 'opacity-100');
        setTimeout(() => {
            progress.style.width = '0%';
        }, 50);
    }, 10);

    setTimeout(() => {
        notification.classList.add('translate-y-4', 'opacity-0');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}

async function scanQRCode() {
    // Create a modal container for centering the video
    const modal = document.createElement('div');
    modal.classList.add('fixed', 'inset-0', 'flex', 'items-center', 'justify-center', 'bg-gray-900', 'bg-opacity-75', 'z-50');
    document.body.appendChild(modal);

    // Create a close button
    const closeButton = document.createElement('button');
    closeButton.innerText = 'Close';
    closeButton.classList.add('absolute', 'top-4', 'right-4', 'text-white', 'bg-red-500', 'hover:bg-red-700', 'rounded', 'px-4', 'py-2');
    closeButton.onclick = () => {
        stream.getTracks().forEach(track => track.stop());
        modal.remove();
    };
    modal.appendChild(closeButton);

    const videoContainer = document.createElement('div');
    videoContainer.classList.add('relative', 'w-full', 'max-w-md', 'bg-white', 'rounded-lg', 'shadow-lg', 'p-4');
    modal.appendChild(videoContainer);

    const video = document.createElement('video');
    video.setAttribute('playsinline', 'true');
    video.classList.add('w-full', 'rounded-lg');
    videoContainer.appendChild(video);

    let stream;
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = stream;
        video.play();

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        const scan = async () => {
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);

                if (code) {
                    try {
                        const response = await fetch(api + '/account/validate', {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                                'authorization': code.data
                            }
                        });
                
                        if (!response.ok) {
                            showNotification('QR Code Login failed', 'error');
                            throw new Error('QR Code Login failed');
                        }
                
                        setCookie('sessionToken', code.data, 365);
                        window.location.href = '/dashboard';
                    } catch (error) {
                        console.error('Error during QR Code validation:', error);
                    } finally {
                        stream.getTracks().forEach(track => track.stop());
                        modal.remove();
                    }
                }
            }
            requestAnimationFrame(scan);
        };

        requestAnimationFrame(scan);
    } catch (error) {
        showNotification('error', 'error');
        console.error('QR Code scanning failed:', error);
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        modal.remove();
    }
}