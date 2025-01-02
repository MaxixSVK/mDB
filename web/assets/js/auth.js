document.addEventListener("DOMContentLoaded", function () {
    checkLogin();
    setupEventListeners();
});

function setupEventListeners() {
    const loginForm = document.forms['login'];
    loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const loginForm = document.getElementById('login');
        handleLogin({
            username: loginForm.elements['username'].value,
            password: loginForm.elements['password'].value
        });
    });

    const registerForm = document.forms['register'];
    registerForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const registerForm = document.getElementById('register');
        handleRegister({
            username: registerForm.elements['username'].value,
            password: registerForm.elements['password'].value,
            email: registerForm.elements['email'].value,
            forcebetaregistration: registerForm.elements['forcebetaregistration'].value
        });
    });

    const switchToRegister = document.getElementById('switchToRegister');
    switchToRegister.addEventListener('click', function () {
        switchSection('login-section', 'register-section');
    });

    const switchToLogin = document.getElementById('switchToLogin');
    switchToLogin.addEventListener('click', function () {
        switchSection('register-section', 'login-section');
    });
}

async function checkLogin() {
    const sessionCookieName = 'sessionToken=';
    const cookies = document.cookie.split(';').map(cookie => cookie.trim());
    const session = cookies.find(cookie => cookie.startsWith(sessionCookieName))?.substring(sessionCookieName.length) || null;

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
                window.location.href = '/dashboard';
            } else {
                document.cookie = 'sessionToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            }
        } catch (error) {
            console.error('Login failed:', error);
        }
    }
}

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
            console.log(responseData);
            showError('login', responseData.msg);
        }
    } catch (error) {
        console.error('Login failed:', error);
        showError('login', 'An unexpected error occurred. Please try again.');
    }
}

async function handleRegister(registerData) {
    try {
        const response = await fetch(api + '/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(registerData)
        });

        if (response.ok) {
            const responseData = await response.json();
            setCookie('sessionToken', responseData.sessionToken, 365);
            window.location.href = '/dashboard';
        } else {
            const responseData = await response.json();
            showError('register', responseData.msg);
        }
    } catch (error) {
        console.error('Registration failed:', error);
        showError('register', 'An unexpected error occurred. Please try again.');
    }
}

function showError(section, message) {
    const errorDiv = document.getElementById(`${section}-error`);
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
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

function switchSection(hideSectionId, showSectionId) {
    const hideSection = document.getElementById(hideSectionId);
    const showSection = document.getElementById(showSectionId);

    hideSection.classList.add('animate-fadeOut');
    setTimeout(() => {
        hideSection.classList.add('hidden');
        hideSection.classList.remove('animate-fadeOut');
        showSection.classList.remove('hidden');
        showSection.classList.add('animate-fadeIn');
    }, 500);
}