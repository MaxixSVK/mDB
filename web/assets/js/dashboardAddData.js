document.addEventListener('DOMContentLoaded', addDataInit);

function addDataInit() {
    const addDataTypeSelect = document.getElementById('add-data-type');
    const addDataFieldsDiv = document.getElementById('add-data-fields');
    const addDataForm = document.getElementById('add-data-form');

    addDataTypeSelect.addEventListener('change', () => handleDataTypeChange(addDataTypeSelect, addDataFieldsDiv));
    addDataTypeSelect.dispatchEvent(new Event('change'));

    addDataForm.addEventListener('submit', (e) => handleFormSubmit(e, addDataForm));

    async function handleDataTypeChange(addDataTypeSelect, addDataFieldsDiv) {
        const type = addDataTypeSelect.value;
        addDataFieldsDiv.innerHTML = '';

        switch (type) {
            case 'series':
                addFormDescription(addDataFieldsDiv, 'New DB Data:');
                addInputField(addDataFieldsDiv, 'name', 'Series Name');
                addInputField(addDataFieldsDiv, 'img', 'Image URL');
                addStatusSelect(addDataFieldsDiv);
                addFormatSelect(addDataFieldsDiv);
                break;
            case 'book':
                await addLibrarySelect(addDataFieldsDiv);
                addFormDescription(addDataFieldsDiv, 'New DB Data');
                addInputField(addDataFieldsDiv, 'name', 'Book Name');
                addInputField(addDataFieldsDiv, 'img', 'Image URL');
                addInputField(addDataFieldsDiv, 'startedReading', 'Started Reading', 'date');
                addInputField(addDataFieldsDiv, 'endedReading', 'Ended Reading', 'date');
                break;
            case 'chapter':
                await addLibrarySelect(addDataFieldsDiv, true);
                addFormDescription(addDataFieldsDiv, 'New DB Data');
                addInputField(addDataFieldsDiv, 'name', 'Chapter Name');
                addInputField(addDataFieldsDiv, 'date', 'Date', 'date');
                break;
        }
    }

    async function addLibrarySelect(container, books) {
        try {
            addFormDescription(container, 'Select reference');
            const seriesSelect = createSelectElement('series_id');
            container.appendChild(seriesSelect);

            const seriesIds = await fetchData('/series');
            const seriesPromises = seriesIds.map(id => fetchData(`/series/${id}`));
            const series = await Promise.all(seriesPromises);

            await populateSelect(seriesSelect, series, 'name', 'series_id');

            if (books) {
                const bookSelect = createSelectElement('book_id');
                container.appendChild(bookSelect);

                seriesSelect.addEventListener('change', async () => await handleSeriesChange(seriesSelect, bookSelect));
                await handleSeriesChange(seriesSelect, bookSelect);
            }
        } catch (error) {
            console.error(error);
        }
    }

    async function handleSeriesChange(seriesSelect, bookSelect) {
        const seriesId = seriesSelect.value;
        const books = await fetchData(`/books/${seriesId}`);
        const bookPromises = books.map(id => fetchData(`/book/${id}`));
        const bookDetails = await Promise.all(bookPromises);

        if (!bookDetails.length) {
            showNotification('No books found for this series', 'warning');
            resetToSeries();
        } else {
            await populateSelect(bookSelect, bookDetails, 'name', 'book_id');
            bookSelect.dispatchEvent(new Event('change'));
        }
    }

    async function addFormatSelect(container) {
        const typeSelect = createSelectElement('format');
        container.appendChild(typeSelect);

        try {
            const response = await fetch(api + '/series/formats');
            const allowedFormats = await response.json();

            allowedFormats.forEach(field => {
                const option = new Option(field.name, field.format);
                typeSelect.add(option);
            });
        } catch (error) {
            console.error('Error fetching formats:', error);
        }
    }

    function addStatusSelect(container) {
        const statusSelect = createSelectElement('status');
        container.appendChild(statusSelect);

        const statuses = ['reading', 'stopped', 'finished', 'paused'];
        const statusNames = ['Reading', 'Stopped', 'Finished', 'Paused'];
        statuses.forEach((status, index) => {
            const option = new Option(statusNames[index], status);
            statusSelect.add(option);
        });
    }

    function addInputField(container, name, placeholder, type = 'text') {
        const div = document.createElement('div');
        div.className = 'mb-3';

        const input = document.createElement('input');
        input.type = type;
        input.name = name;
        input.placeholder = placeholder;
        input.className = 'shadow border rounded w-full py-2 px-3 text-white bg-[#191818] leading-tight focus:outline-none focus:shadow-outline';

        div.appendChild(input);
        container.appendChild(div);
    }

    function addFormDescription(container, text) {
        const description = document.createElement('label');
        description.textContent = text;
        description.className = 'block text-white text-sm font-bold mb-2';
        container.appendChild(description);
    }

    function createSelectElement(name) {
        const select = document.createElement('select');
        select.name = name;
        select.required = true;
        select.classList.add('shadow', 'border', 'rounded', 'w-full', 'py-2', 'px-3', 'text-white', 'bg-[#191818]', 'leading-tight', 'focus:outline-none', 'focus:shadow-outline', 'mb-3');
        return select;
    }

    async function populateSelect(select, data, textKey, valueKey) {
        select.innerHTML = '';
        data.forEach(d => {
            const option = new Option(d[textKey], d[valueKey]);
            select.add(option);
        });
    }

    async function fetchData(path) {
        const response = await fetch(api + path);
        return await response.json();
    }

    async function handleFormSubmit(e, form) {
        e.preventDefault();
        let formData = new FormData(form);
        let data = Object.fromEntries(formData.entries());

        if (data.type === 'chapter') {
            delete data.series_id;
        }

        try {
            const response = await fetch(api + '/mange-library/new', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'authorization': getCookie('sessionToken')
                },
                body: JSON.stringify(data)
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.error || 'Unknown error occurred');
            }

            refreshContent();
            showNotification(responseData.data, 'success');
        } catch (e) {
            showNotification(e.message, 'error');
        }
    }
}