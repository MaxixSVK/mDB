let user, publicUser = {};
let public = false;

document.addEventListener('DOMContentLoaded', async function () {
    const profileMatch = window.location.pathname.match(/^\/stats\/([^\/]+)$/);
    ({ loggedIn, user } = await checkLogin());

    if (profileMatch) {
        public = true;
        publicUser.username = profileMatch[1];
    } else if (!loggedIn) {
        window.location.href = '/about';
    }

    const mainPageData = loggedIn
        ? await fetch(api + '/library/user/' + (publicUser.username || user.username), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': getCookie('sessionToken')
            },
        })
        : await fetch(api + '/library/user/' + (publicUser.username || user.username));

    publicUser = { ...publicUser, ...await mainPageData.json() };

    if (publicUser.error) {
        window.location.href = '/404';
    }

    if (publicUser.public == 0 && publicUser.id !== user?.id) {
        window.location.href = '/404';
    }

    if (public && publicUser.id === user?.id) {
        public = false;
        history.replaceState(null, '', '/');
    } else if (public) {
        showProfileBanner(publicUser.username);
    }

    fetchStats();

    const currentYear = new Date().getFullYear();
    updateYear(currentYear);
    fetchStatsByMonth(currentYear);

    addEventListeners();
});

function addEventListeners() {
    document.getElementById('prev-year').addEventListener('click', function () {
        const year = parseInt(document.getElementById('current-year').textContent, 10) - 1;
        updateYear(year);
        fetchStatsByMonth(year);
    });

    document.getElementById('next-year').addEventListener('click', function () {
        const year = parseInt(document.getElementById('current-year').textContent, 10) + 1;
        if (year > new Date().getFullYear()) {
            return showNotification('You cannot view stats for future years.', 'error');
        }
        updateYear(year);
        fetchStatsByMonth(year);
    });
}

function fetchStats() {
    (loggedIn
        ? fetch(api + '/library/stats/' + publicUser.id, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': getCookie('sessionToken')
            },
        })
        : fetch(api + '/library/stats/' + publicUser.id))
        .then(response => response.json())
        .then(data => {
            document.getElementById('series-count').textContent = data.seriesCount;
            document.getElementById('book-count').textContent = data.bookCount;
            document.getElementById('chapter-count').textContent = data.chapterCount;
        });
}

function fetchStatsByMonth(year) {
    (loggedIn
        ? fetch(api + '/library/stats/month/' + publicUser.id + '/' + year, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': getCookie('sessionToken')
            },
        })
        : fetch(api + '/library/stats/month/' + publicUser.id + '/' + year))
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