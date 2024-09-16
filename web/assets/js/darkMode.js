const switchMode = document.getElementById('switchMode');
const icon = document.createElement('i');
const html = document.querySelector('html');
const themes = ['dark', 'light', 'system'];

const iconClasses = {
    system: 'fas fa-adjust',
    dark: 'fas fa-moon',
    light: 'fas fa-sun'
};

function getStoredTheme() {
    return localStorage.getItem('theme') || 'system';
}

function setStoredTheme(theme) {
    localStorage.setItem('theme', theme);
}

function updateIcon() {
    const theme = getStoredTheme();
    icon.className = iconClasses[theme] || iconClasses.system;
}

function applyTheme(theme) {
    html.classList.remove('dark', 'light');
    if (theme === 'system') {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    html.classList.add(theme);
}

function cycleTheme() {
    const currentTheme = getStoredTheme();
    const currentIndex = themes.indexOf(currentTheme);
    const newTheme = themes[(currentIndex + 1) % themes.length];
    applyTheme(newTheme);
    setStoredTheme(newTheme);
    updateIcon();
}

function initializeTheme() {
    const theme = getStoredTheme();
    applyTheme(theme);
    updateIcon();
    if (theme === 'system') {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            applyTheme('system');
        });
    }
}

switchMode.appendChild(icon);
switchMode.addEventListener('click', cycleTheme);

initializeTheme();