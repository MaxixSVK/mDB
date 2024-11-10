const api = 'https://apimdb.maxix.sk';

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

    const registerForm = document.forms['register'];
    registerForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const RegisterForm = document.getElementById('register');
        handleRegister({
            username: RegisterForm.elements['username'].value,
            password: RegisterForm.elements['password'].value,
            email: RegisterForm.elements['email'].value,
            forcebetaregistration: RegisterForm.elements['forcebetaregistration'].value
        });
    });
    
    const switchToRegister = document.getElementById('switchToRegister');
    switchToRegister.addEventListener('click', function () {
        const loginSection = document.getElementById('login-section');
        const registerSection = document.getElementById('register-section');
        
        loginSection.classList.add('animate-fadeOut');
        setTimeout(() => {
            loginSection.classList.add('hidden');
            loginSection.classList.remove('animate-fadeOut');
            registerSection.classList.remove('hidden');
            registerSection.classList.add('animate-fadeIn');
        }, 500);
    });
    
    const switchToLogin = document.getElementById('switchToLogin');
    switchToLogin.addEventListener('click', function () {
        const loginSection = document.getElementById('login-section');
        const registerSection = document.getElementById('register-section');
        
        registerSection.classList.add('animate-fadeOut');
        setTimeout(() => {
            registerSection.classList.add('hidden');
            registerSection.classList.remove('animate-fadeOut');
            loginSection.classList.remove('hidden');
            loginSection.classList.add('animate-fadeIn');
        }, 500);
    });

    // TODO: SUPPORT FOR QR CODE LOGIN
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
            showError(responseData.msg);
        }
    } catch (error) {
        console.error('Registration failed:', error);
        showError('An unexpected error occurred. Please try again.');
    }
}

// TODO: REMAKE APROACH AND DESIGN
function showError(message) {
    document.getElementById('notification-container').innerHTML = `
        <div class="bg-red-500 text-white px-4 py-3 rounded relative" role="alert">
            <span class="block sm:inline">${message}</span>
        </div>
    `;
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
