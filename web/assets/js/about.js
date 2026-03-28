let user = {};

document.addEventListener("DOMContentLoaded", async function () {
    user = await checkLogin();

    showLoggedInUI();
});

function showLoggedInUI() {
    if (!user) return;

    const authActions = document.getElementById('auth-actions');
    const userActions = document.getElementById('user-actions');

    authActions.classList.add('hidden');
    userActions.classList.remove('hidden');

}