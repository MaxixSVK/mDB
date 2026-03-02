document.addEventListener("DOMContentLoaded", async function () {
    ({ loggedIn } = await checkLogin());

    const authActions = document.getElementById('auth-actions');
    const userActions = document.getElementById('user-actions');

    if (loggedIn) {
        authActions.classList.add('hidden');
        userActions.classList.remove('hidden');
    }
});