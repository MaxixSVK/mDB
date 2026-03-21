document.addEventListener('DOMContentLoaded', async () => {
    await checkLogin();

    try {
        const data = await fetch(api + '/docs').then(res => res.json());

        const endpointsSection = document.getElementById('api-endpoints');

        const groupedByRouter = {};
        (data.endpoints || []).forEach(ep => {
            const key = ep.router || 'general';
            groupedByRouter[key] ||= [];
            groupedByRouter[key].push(ep);
        });

        const methodBadgeClass = (method) => {
            const m = String(method || '').toUpperCase();
            const base = 'inline-flex items-center justify-center px-4 py-1 rounded-md text-xs font-semibold text-center shrink-0 w-full md:w-16';
            switch (m) {
                case 'GET':
                    return `${base} bg-green-600 text-white`;
                case 'POST':
                    return `${base} bg-blue-600 text-white`;
                case 'PUT':
                    return `${base} bg-yellow-600 text-white`;
                case 'DELETE':
                    return `${base} bg-red-600 text-white`;
                default:
                    return `${base} bg-gray-700 text-white`;
            }
        };

        Object.keys(groupedByRouter).forEach(router => {
            const endpoints = groupedByRouter[router];

            const card = document.createElement('section');
            card.className = 'text-white py-2 bg-[#1F1F1F] m-4 mb:m-8 rounded-md';

            const header = document.createElement('div');
            header.className = 'px-4 pt-2 md:px-6 flex items-center justify-between';

            const title = document.createElement('h2');
            title.className = 'text-xl font-bold text-white';
            title.textContent = router;

            const count = document.createElement('span');
            count.className = 'text-sm text-gray-400';
            count.textContent = `${endpoints.length} endpoint${endpoints.length === 1 ? '' : 's'}`;

            header.appendChild(title);
            header.appendChild(count);

            const list = document.createElement('div');

            endpoints
                .forEach(ep => {
                    const row = document.createElement('div');
                    row.className = 'px-4 md:px-6 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2 bg-[#2A2A2A] rounded-md transition duration-300 m-4';

                    const left = document.createElement('div');
                    left.className = 'flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-3 min-w-0 flex-1 w-full';

                    const badge = document.createElement('span');
                    badge.className = methodBadgeClass(ep.method);
                    badge.textContent = String(ep.method || '').toUpperCase();

                    const path = document.createElement('code');
                    path.className = 'font-mono text-sm text-white border border-gray-400 rounded-md px-2 py-1 truncate flex-1 min-w-0 w-full md:w-auto';
                    path.textContent = ep.path || '/';

                    left.appendChild(badge);
                    left.appendChild(path);

                    const right = document.createElement('div');
                    right.className = 'flex items-center gap-2 md:gap-3 shrink-0 w-full md:w-auto';

                    const copyBtn = document.createElement('button');
                    copyBtn.className = 'border-2 border-dashed border-[#FFA500] text-white font-medium text-xs py-1 px-2 rounded-md hover:bg-[#FFA500] hover:text-black transition duration-300 w-full md:w-auto';
                    copyBtn.innerHTML = '<i class="fas fa-copy mr-1"></i>Copy';
                    copyBtn.addEventListener('click', async () => {
                        try {
                            await navigator.clipboard.writeText(api + ep.path);
                            showNotification('Copied endpoint to clipboard', 'success');
                        } catch (_) {
                            showNotification('Failed to copy endpoint', 'error');
                        }
                    });

                    right.appendChild(copyBtn);

                    row.appendChild(left);
                    row.appendChild(right);
                    list.appendChild(row);
                });

            card.appendChild(header);
            card.appendChild(list);
            endpointsSection.appendChild(card);
        });
    } catch (err) {
        console.error('Failed to load API docs:', err);
        try { showNotification('Failed to load API docs', 'error'); } catch (_) { }
    }
});
