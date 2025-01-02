document.addEventListener('DOMContentLoaded', function () {
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
        updateYear(year);
        fetchStatsByMonth(year);
    });
}

function fetchStats() {
    fetch(api + '/stats')
        .then(response => response.json())
        .then(data => {
            document.getElementById('series-count').textContent = data.seriesCount;
            document.getElementById('book-count').textContent = data.bookCount;
            document.getElementById('chapter-count').textContent = data.chapterCount;
        });
}

function fetchStatsByMonth(year) {
    fetch(api + '/stats/month/' + year)
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
                acc[date.getMonth()] = item.chapterCount;
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