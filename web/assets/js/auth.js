const api = 'https://apimdb.maxix.sk/v2';

document.addEventListener("DOMContentLoaded", function () {
    if (document.cookie.includes('sessionToken')) {
        window.location.href = '/dashboard';
    }
    const loginForm = document.forms['login'];
    loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const LoginForm = document.getElementById('login');
        handleLogin({
            username: LoginForm.elements['username'].value,
            password: LoginForm.elements['password'].value
        });
    });
    // document.getElementById('scanQRCode').addEventListener('click', scanQRCode);
    // SUPPORT FOR QR CODE LOGIN WILL BE ADDED IN A FUTURE UPDATE
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
            showError(responseData.msg);
        }
    } catch (error) {
        console.error('Login failed:', error);
        showError('An unexpected error occurred. Please try again.');
    }
}

function showError(message) {
    const errorMessageDiv = document.getElementById('error-message');
    errorMessageDiv.textContent = message;
    errorMessageDiv.classList.remove('hidden');
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
