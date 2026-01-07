document.addEventListener('DOMContentLoaded', async () => {
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
            const base = 'inline-flex items-center justify-center w-16 px-2 py-0.5 rounded-md text-xs font-semibold text-center';
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
            card.className = 'mb-4 md:mb-6 border border-gray-700 rounded-lg overflow-hidden bg-[#191818]';

            const header = document.createElement('div');
            header.className = 'px-4 md:px-6 py-3 border-b border-gray-700 flex items-center justify-between';

            const title = document.createElement('h2');
            title.className = 'text-xl font-bold text-white';
            title.textContent = router;

            const count = document.createElement('span');
            count.className = 'text-sm text-gray-400';
            count.textContent = `${endpoints.length} endpoint${endpoints.length === 1 ? '' : 's'}`;

            header.appendChild(title);
            header.appendChild(count);

            const list = document.createElement('div');
            list.className = 'divide-y divide-gray-800 w-full';

            endpoints
                .forEach(ep => {
                    const row = document.createElement('div');
                    row.className = 'px-4 md:px-6 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2 w-full';

                    const left = document.createElement('div');
                    left.className = 'flex items-center gap-3 min-w-0 flex-1 w-full';

                    const badge = document.createElement('span');
                    badge.className = methodBadgeClass(ep.method);
                    badge.textContent = String(ep.method || '').toUpperCase();

                    const path = document.createElement('code');
                    path.className = 'font-mono text-sm text-white bg-[#1F1F1F] border border-gray-700 rounded-md px-2 py-1 truncate block max-w-full';
                    path.textContent = ep.path || '/';

                    left.appendChild(badge);
                    left.appendChild(path);

                    const right = document.createElement('div');
                    right.className = 'flex items-center gap-2 md:gap-3 shrink-0';

                    const copyBtn = document.createElement('button');
                    copyBtn.className = 'border-2 border-dashed border-[#FFA500] text-white font-medium text-xs py-1 px-2 rounded-md hover:bg-[#FFA500] hover:text-black transition duration-300';
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
