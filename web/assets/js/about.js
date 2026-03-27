let user = {};

document.addEventListener("DOMContentLoaded", async function () {
    user = await checkLogin();

    const authActions = document.getElementById('auth-actions');
    const userActions = document.getElementById('user-actions');

    if (user) {
        authActions.classList.add('hidden');
        userActions.classList.remove('hidden');
    }
});