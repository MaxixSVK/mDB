let userId;

document.addEventListener('DOMContentLoaded', async function () {
    const profileMatch = window.location.pathname.match(/^\/stats\/([^\/]+)$/);

    let loggedIn = false;
    let publicProfileUsername;

    ({ loggedIn, userId } = await checkLogin());

    if (profileMatch) {
        publicProfileUsername = profileMatch[1];
        window.publicProfileUsername = publicProfileUsername;

        if (!loggedIn || publicProfileUsername !== userId) {
            showProfileBanner(publicProfileUsername);
        }
    } else if (!loggedIn) {
        window.location.href = '/about';
    }

    if (publicProfileUsername) {
        const response = await fetch(api + '/library/user/' + publicProfileUsername);
        const data = await response.json();

        if (data[0] === userId) {
            window.location.href = '/stats';
            return;
        }

        userId = data[0];
    }

    fetchStats();

    const currentYear = new Date().getFullYear();
    updateYear(currentYear);
    fetchStatsByMonth(currentYear);

    addEventListeners();
});

function showProfileBanner(username) {
    const banner = document.getElementById('profile-banner');
    while (banner.firstChild) {
        banner.removeChild(banner.firstChild);
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'flex items-center justify-center bg-blue-900/80 border border-blue-700 rounded-lg px-4 py-3 shadow text-white';

    const icon = document.createElement('i');
    icon.className = 'fas fa-user-friends mr-3 text-xl';

    const text = document.createElement('span');
    text.className = 'text-lg font-semibold';

    const usernameSpan = document.createElement('span');
    usernameSpan.className = 'text-blue-300';
    usernameSpan.textContent = `@${username}`;

    text.append(
        'You are viewing ',
        usernameSpan,
        "'s public library"
    );

    wrapper.appendChild(icon);
    wrapper.appendChild(text);

    banner.appendChild(wrapper);
    banner.classList.remove('hidden');
}

function addEventListeners() {
    document.getElementById('prev-year').addEventListener('click', function () {
        const year = parseInt(document.getElementById('current-year').textContent, 10) - 1;
        updateYear(year);
        fetchStatsByMonth(year);
    });

    document.getElementById('next-year').addEventListener('click', function () {
        const year = parseInt(document.getElementById('current-year').textContent, 10) + 1;
        updateYear(year);
        fetchStatsByMonth(year);
    });
}

function fetchStats() {
    fetch(api + '/library/stats/' + userId)
        .then(response => response.json())
        .then(data => {
            document.getElementById('series-count').textContent = data.seriesCount;
            document.getElementById('book-count').textContent = data.bookCount;
            document.getElementById('chapter-count').textContent = data.chapterCount;
        });
}

function fetchStatsByMonth(year) {
    fetch(api + '/library/stats/month/' + userId + '/' + year)
        .then(response => response.json())
        .then(data => {
            const canvas = document.getElementById('chart-month');
            const message = document.getElementById('no-data-message');

            if (data.length === 0) {
                canvas.style.display = 'none';
                message.classList.remove('hidden');
                return;
            }

            canvas.style.display = 'block';
            message.classList.add('hidden');

            const allMonths = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));

            const dataMap = data.reduce((acc, item) => {
                const date = new Date(item.month);
                acc[date.getMonth()] = item.chapters;
                return acc;
            }, {});

            const labels = allMonths.map(date => date.toLocaleString('default', { month: 'short' }));
            const chapterCounts = allMonths.map(date => parseInt(dataMap[date.getMonth()] || 0, 10));

            const ctx = canvas.getContext('2d');
            if (window.myChart) {
                window.myChart.destroy();
            }
            window.myChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Chapter Count',
                        data: chapterCounts,
                        backgroundColor: 'rgba(75, 192, 192, 0.5)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 2,
                        fill: false
                    }]
                },
                options: {
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        })
        .catch(error => console.error('Error fetching data:', error));
}

function updateYear(year) {
    document.getElementById('current-year').textContent = year;
}