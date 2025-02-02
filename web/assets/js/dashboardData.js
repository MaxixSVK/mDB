async function addLibrarySelect(container, books, chapters) {
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

            if (chapters) {
                const chapterSelect = createSelectElement('chapter_id');
                container.appendChild(chapterSelect);

                seriesSelect.addEventListener('change', async () => await handleSeriesChange(container, seriesSelect, bookSelect, chapterSelect));
                await handleSeriesChange(container, seriesSelect, bookSelect, chapterSelect);
            } else {
                seriesSelect.addEventListener('change', async () => await handleSeriesChange(container, seriesSelect, bookSelect));
                await handleSeriesChange(container, seriesSelect, bookSelect);
            }
        }
    } catch (error) {
        console.error(error);
    }
}

async function handleSeriesChange(container, seriesSelect, bookSelect, chapterSelect) {
    const seriesId = seriesSelect.value;
    const books = await fetchData(`/books/${seriesId}`);
    const bookPromises = books.map(id => fetchData(`/book/${id}`));
    const bookDetails = await Promise.all(bookPromises);

    if (!bookDetails.length) {
        showNotification('No books found for this series', 'warning');
        resetToSeries(container.id);
    } else {
        await populateSelect(bookSelect, bookDetails, 'name', 'book_id');
        if (chapterSelect) {
            bookSelect.addEventListener('change', async () => await handleBookChange(container, bookSelect, chapterSelect));
            await handleBookChange(container, bookSelect, chapterSelect);
        }
        bookSelect.dispatchEvent(new Event('change'));
    }
}

async function handleBookChange(container, bookSelect, chapterSelect) {
    const bookId = bookSelect.value;
    const chapters = await fetchData(`/chapters/${bookId}`);
    const chapterPromises = chapters.map(id => fetchData(`/chapter/${id}`));
    const chapterDetails = await Promise.all(chapterPromises);

    // BUG: If there is valid series and book, but no chapters, the DB data element will be showed more than once
    if (!chapterDetails.length) {
        showNotification('No chapters found for this book', 'warning');
        resetToSeries(container.id);
        // TEMP: This is a temporary fix to prevent the bug from happening
        showNotification('Detected bug, refreshing page in 3 seconds', 'error');
        setTimeout(() => location.reload(), 3000);
    } else {
        await populateSelect(chapterSelect, chapterDetails, 'name', 'chapter_id');
        chapterSelect.dispatchEvent(new Event('change'));
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

const selectMapping = {
    'add-data-fields': 'add-data-type',
    'edit-data-fields': 'edit-data-type',
    'delete-data-fields': 'delete-data-type'
};

function resetToSeries(id) {
    const typeSelect = document.getElementById(selectMapping[id]);
    typeSelect.value = 'series';
    typeSelect.dispatchEvent(new Event('change'));
}

function refreshContent() {
    const addDataTypeSelect = document.getElementById('add-data-type');
    const editDataTypeSelect = document.getElementById('edit-data-type');
    const deleteDataTypeSelect = document.getElementById('delete-data-type');

    addDataTypeSelect.dispatchEvent(new Event('change'));
    editDataTypeSelect.dispatchEvent(new Event('change'));
    deleteDataTypeSelect.dispatchEvent(new Event('change'));
}

const editDataFields = document.getElementById('edit-data-fields');

async function showDBdata(type, selectName) {
    const selectDL = editDataFields.querySelector(`select[name="${selectName}"]`);
    selectDL.addEventListener('change', async function () {
        const id = this.value;
        loadOldData(type, id);
    });
    selectDL.dispatchEvent(new Event('change'));
}

async function loadOldData(type, id) {
    const typeMapping = {
        series: {
            endpoint: `/series/${id}`,
            fields: {
                'name': 'name',
                'img': 'img',
                'format': 'format',
                'status': 'status'
            }
        },
        books: {
            endpoint: `/book/${id}`,
            fields: {
                'name': 'name',
                'img': 'img',
                'startedReading': 'startedReading',
                'endedReading': 'endedReading'
            }
        },
        chapters: {
            endpoint: `/chapter/${id}`,
            fields: {
                'name': 'name',
                'date': 'date'
            }
        }
    };

    if (typeMapping[type]) {
        const { endpoint, fields } = typeMapping[type];
        const data = await fetchData(endpoint);

        for (const [field, key] of Object.entries(fields)) {
            const input = editDataFields.querySelector(`input[name="${field}"], select[name="${field}"]`);
            if (input) {
                let value = data[key] || '';
                if (input.type === 'date' && value) {
                    const date = new Date(value);
                    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
                    value = new Date(date.getTime() - userTimezoneOffset).toISOString().slice(0, 10);
                }
                input.value = value;
            }
        }
    }
}
