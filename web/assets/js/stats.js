let user, publicUser = {};
let public = false;

document.addEventListener('DOMContentLoaded', async function () {
    const profileMatch = window.location.pathname.match(/^\/stats\/([^\/]+)$/);
    user = await checkLogin();

    if (profileMatch) {
        public = true;
        publicUser.username = profileMatch[1];
    } else if (!user) {
        window.location.href = '/about';
    }

    if (user || profileMatch) {
        await fetchPublicUserData();
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
    initSeriesPanel();
});

async function initSeriesPanel() {
    const panel = document.getElementById('series-panel');
    panel.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'bg-[#1F1F1F] rounded-md border border-[#2A2A2A] p-4 md:p-6 mt-2 md:mt-4 md:mx-0 text-white shadow-lg shadow-black/20';

    const titleRow = document.createElement('div');
    titleRow.className = 'flex items-center justify-between gap-3 mb-3';

    const titleBlock = document.createElement('div');
    const title = document.createElement('h2');
    title.className = 'text-xl md:text-2xl font-bold';
    title.textContent = 'Series overview';
    const subtitle = document.createElement('p');
    subtitle.className = 'text-sm text-gray-400 mt-1';
    subtitle.textContent = 'Select a series to view detailed stats and progress';
    titleBlock.appendChild(title);
    titleBlock.appendChild(subtitle);
    titleRow.appendChild(titleBlock);

    if (!publicUser.series || !publicUser.series.length) {
        const empty = document.createElement('p');
        empty.className = 'text-gray-300';
        empty.textContent = 'No series available for this user.';
        titleRow.appendChild(document.createElement('div'));
        wrapper.appendChild(titleRow);
        wrapper.appendChild(empty);
        panel.appendChild(wrapper);
        return;
    }

    const seriesCache = new Map();
    const select = document.createElement('select');
    select.className = 'w-full px-3 py-2 text-white bg-[#191818] border border-[#2a2a2a] rounded-md focus:outline-none focus:border-white transition-colors duration-200 mb-4';

    const fetchPromises = publicUser.series.map(async id => {
        try {
            const url = api + '/stats/series/' + id;
            const response = (user && !publicUser.public)
                ? await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json', 'Authorization': getCookie('sessionToken') } })
                : await fetch(url);
            if (!response.ok) return null;
            const d = await response.json();
            d.series_id = id;
            seriesCache.set(String(id), d);
            return d;
        } catch (err) {
            console.error('Error fetching series', id, err);
            return null;
        }
    });

    const fetched = (await Promise.all(fetchPromises)).filter(Boolean);
    fetched.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.series_id;
        opt.textContent = s.name || `Series #${s.series_id}`;
        select.appendChild(opt);
    });

    const selectWrap = document.createElement('div');
    selectWrap.className = 'mt-4';
    const selectLabel = document.createElement('p');
    selectLabel.className = 'text-xs uppercase tracking-[0.2em] text-gray-400 mb-2';
    selectLabel.textContent = 'Series';
    selectWrap.appendChild(selectLabel);
    selectWrap.appendChild(select);

    titleRow.appendChild(selectWrap);
    wrapper.appendChild(titleRow);

    select.addEventListener('change', async () => {
        const id = select.value;
        const cached = seriesCache.get(String(id));
        if (cached) {
            renderSeriesDetails(cached, wrapper.querySelector('#series-details'));
            await fetchAndRenderSeries(id, wrapper);
        } else {
            await fetchAndRenderSeries(id, wrapper);
        }
    });

    const details = document.createElement('div');
    details.id = 'series-details';
    details.className = 'mt-5';
    wrapper.appendChild(details);

    panel.appendChild(wrapper);

    const firstId = publicUser.series[0];
    if (firstId) {
        select.value = firstId;
        const cached = seriesCache.get(String(firstId));
        if (cached) renderSeriesDetails(cached, details);
        await fetchAndRenderSeries(firstId, wrapper);
    }
}

async function fetchAndRenderSeries(seriesId, wrapper) {
    const details = wrapper.querySelector('#series-details');
    details.innerHTML = '';

    try {
        const url = api + '/stats/series/' + seriesId;
        const response = (user && !publicUser.public)
            ? await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json', 'Authorization': getCookie('sessionToken') } })
            : await fetch(url);

        if (!response.ok) {
            details.textContent = 'Unable to fetch series stats.';
            return;
        }

        const data = await response.json();
        data.series_id = seriesId;

        if (data.author_id) {
            try {
                const authorUrl = api + '/library/author/' + data.author_id;
                const authorResponse = (user && !publicUser.public)
                    ? await fetch(authorUrl, { method: 'GET', headers: { 'Content-Type': 'application/json', 'Authorization': getCookie('sessionToken') } })
                    : await fetch(authorUrl);

                if (authorResponse.ok) {
                    const authorData = await authorResponse.json();
                    data.author_name = authorData.name;
                }
            } catch (authorErr) {
                console.error('Error fetching author', authorErr);
            }
        }

        renderSeriesDetails(data, details);
    } catch (err) {
        console.error(err);
        details.textContent = 'Error loading series stats.';
    }
}

function renderSeriesDetails(data, container) {
    container.innerHTML = '';

    const seriesId = data.series_id;
    const imageSrc = data.img && seriesId ? cdn + '/library/s-' + seriesId + '.png' : cdn + '/library/404.avif';

    const shell = document.createElement('div');
    shell.className = 'overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#191818]';

    const hero = document.createElement('div');
    hero.className = 'grid gap-0 md:grid-cols-[220px_1fr]';

    const imagePane = document.createElement('div');
    imagePane.className = 'relative bg-[#101010] border-b border-[#2A2A2A] md:border-b-0 md:border-r border-[#2A2A2A]';

    const imgEl = document.createElement('img');
    imgEl.src = imageSrc;
    imgEl.alt = data.name || 'Series image';
    imgEl.className = 'w-full h-full min-h-[260px] object-cover';

    const imageOverlay = document.createElement('div');
    imageOverlay.className = 'absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent';

    imagePane.appendChild(imgEl);
    imagePane.appendChild(imageOverlay);

    const infoPane = document.createElement('div');
    infoPane.className = 'p-4 md:p-5 flex flex-col gap-4';

    const header = document.createElement('div');
    header.className = 'flex flex-col gap-3 md:flex-row md:items-start md:justify-between';

    const textBlock = document.createElement('div');

    const name = document.createElement('h3');
    name.className = 'text-2xl md:text-3xl font-bold leading-tight';
    name.textContent = data.name || 'Unknown';

    const metaRow = document.createElement('div');
    metaRow.className = 'mt-3 flex flex-wrap gap-2';

    const formatBadge = document.createElement('span');
    formatBadge.className = 'px-3 py-1 rounded-full bg-[#2A2A2A] text-sm text-gray-200 border border-[#3A3A3A]';
    formatBadge.textContent = (data.format || 'unknown').replace(/([A-Z])/g, ' $1').replace(/^./, char => char.toUpperCase());

    const statusBadge = document.createElement('span');
    const statusColors = {
        reading: 'bg-blue-600/20 text-blue-300 border-blue-500/30',
        finished: 'bg-green-600/20 text-green-300 border-green-500/30',
        stopped: 'bg-red-600/20 text-red-300 border-red-500/30',
        paused: 'bg-yellow-600/20 text-yellow-300 border-yellow-500/30'
    };
    statusBadge.className = `px-3 py-1 rounded-full text-sm border ${statusColors[data.status] || 'bg-[#2A2A2A] text-gray-200 border-[#3A3A3A]'}`;
    statusBadge.textContent = data.status
        ? data.status.charAt(0).toUpperCase() + data.status.slice(1)
        : 'Unknown';

    metaRow.appendChild(formatBadge);
    metaRow.appendChild(statusBadge);

    textBlock.appendChild(name);
    textBlock.appendChild(metaRow);

    const author = document.createElement('p');
    author.className = 'text-sm text-gray-400';
    author.textContent = data.author_name ? `Author: ${data.author_name}` : 'Author: unavailable';

    header.appendChild(textBlock);
    header.appendChild(author);

    const statsGrid = document.createElement('div');
    statsGrid.className = 'grid grid-cols-2 lg:grid-cols-4 gap-3';

    function statCard(label, value) {
        const card = document.createElement('div');
        card.className = 'rounded-lg border border-[#2A2A2A] bg-[#1F1F1F] p-4 text-center';
        const v = document.createElement('div');
        v.className = 'text-2xl md:text-3xl font-bold text-white';
        v.textContent = value;
        const l = document.createElement('div');
        l.className = 'text-xs uppercase tracking-[0.18em] text-gray-400 mt-1';
        l.textContent = label;
        card.appendChild(v);
        card.appendChild(l);
        return card;
    }

    statsGrid.appendChild(statCard('Books', data.books || 0));
    statsGrid.appendChild(statCard('Chapters', data.chapters || 0));
    statsGrid.appendChild(statCard('Pages', data.pages || 0));
    statsGrid.appendChild(statCard('Pages Read', data.pages_read || 0));

    const progressWrap = document.createElement('div');
    progressWrap.className = 'rounded-lg border border-[#2A2A2A] bg-[#1F1F1F] p-4';

    const progressHeader = document.createElement('div');
    progressHeader.className = 'flex items-center justify-between gap-3 mb-3';

    const progressLabel = document.createElement('p');
    progressLabel.className = 'text-sm font-semibold text-white';
    progressLabel.textContent = 'Reading progress';

    const progressValue = document.createElement('p');
    progressValue.className = 'text-sm text-gray-400';
    const progressPercent = data.pages ? Math.min(100, Math.round((Number(data.pages_read || 0) / Number(data.pages)) * 100)) : 0;
    progressValue.textContent = `${progressPercent}% complete`;

    progressHeader.appendChild(progressLabel);
    progressHeader.appendChild(progressValue);

    const track = document.createElement('div');
    track.className = 'h-2 rounded-full bg-[#2A2A2A] overflow-hidden';

    const fill = document.createElement('div');
    fill.className = 'h-full rounded-full bg-[#FFA500]';
    fill.style.width = `${progressPercent}%`;

    track.appendChild(fill);
    progressWrap.appendChild(progressHeader);
    progressWrap.appendChild(track);

    infoPane.appendChild(header);
    infoPane.appendChild(statsGrid);
    infoPane.appendChild(progressWrap);

    hero.appendChild(imagePane);
    hero.appendChild(infoPane);
    shell.appendChild(hero);
    container.appendChild(shell);
}

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
    (user && !publicUser.public
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
            createStatSection(data)
        });
}

function fetchStatsByMonth(year) {
    (user && !publicUser.public
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