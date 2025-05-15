document.addEventListener("DOMContentLoaded", async function () {
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('register-section').classList.add('hidden');

    const params = new URLSearchParams(window.location.search);
    const type = params.get('t');

    if (type === 'reg') {
        document.getElementById('register-section').classList.remove('hidden');
    } else {
        document.getElementById('login-section').classList.remove('hidden');
    }

    ({ loggedIn } = await checkLogin());
    if (loggedIn) window.location.href = '/';
    
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

function switchSection(hideSectionId, showSectionId) {
    const hideSection = document.getElementById(hideSectionId);
    const showSection = document.getElementById(showSectionId);

    hideSection.classList.add('hidden');
    showSection.classList.remove('hidden');
    
    if (window.history.replaceState) {
        const baseUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, baseUrl);
    }
}