let userId;

document.addEventListener('DOMContentLoaded', async () => {
    ({ userId } = await checkLogin());
    initDataHandlers('add', 'add-data-type', 'add-data-fields', 'add-data-form', 'new');
    initDataHandlers('edit', 'edit-data-type', 'edit-data-fields', 'edit-data-form', 'update');
    initDataHandlers('delete', 'delete-data-type', 'delete-data-fields', 'delete-data-form', 'delete');
});

function initDataHandlers(action, typeSelectId, fieldsDivId, formId, submitAction) {
    const dataTypeSelect = document.getElementById(typeSelectId);
    const dataFieldsDiv = document.getElementById(fieldsDivId);
    const dataForm = document.getElementById(formId);

    dataTypeSelect.addEventListener('change', () => handleDataTypeChange(dataTypeSelect, dataFieldsDiv, action));
    dataTypeSelect.dispatchEvent(new Event('change'));

    dataForm.addEventListener('submit', (e) => handleDataSubmit(e, dataForm, submitAction));
}

async function handleDataTypeChange(selectElement, fieldsDiv, action) {
    const type = selectElement.value;
    fieldsDiv.innerHTML = '';

    switch (type) {
        case 'series':
            if (action !== 'add') {
                await addLibrarySelect(fieldsDiv);
            }
            if (action !== 'delete') {
                addAuthorSelect(fieldsDiv);
                addFormDescription(fieldsDiv, action === 'add' ? 'New DB Data:' : 'DB Data');
                addInputField(fieldsDiv, 'name', 'Series Name');
                addStatusSelect(fieldsDiv);
                addFormatSelect(fieldsDiv);
            }
            if (action === 'edit') showDBdata('series', 'series_id');
            break;
        case 'book':
            if (action === 'add') {
                await addLibrarySelect(fieldsDiv);
            } else {
                await addLibrarySelect(fieldsDiv, true);
            }
            if (action !== 'delete') {
                addFormDescription(fieldsDiv, action === 'add' ? 'New DB Data' : 'DB Data');
                addInputField(fieldsDiv, 'name', 'Book Name');
                addInputField(fieldsDiv, 'isbn', 'ISBN');
                addInputField(fieldsDiv, 'startedReading', 'Started Reading', 'date');
                addInputField(fieldsDiv, 'endedReading', 'Ended Reading', 'date');
            }
            if (action === 'edit') showDBdata('books', 'book_id');
            break;
        case 'chapter':
            if (action === 'add') {
                await addLibrarySelect(fieldsDiv, true);
            } else {
                await addLibrarySelect(fieldsDiv, true, true);
            }
            if (action !== 'delete') {
                addFormDescription(fieldsDiv, action === 'add' ? 'New DB Data' : 'DB Data');
                addInputField(fieldsDiv, 'name', 'Chapter Name');
                addInputField(fieldsDiv, 'date', 'Date', 'date');
            }
            if (action === 'edit') showDBdata('chapters', 'chapter_id');
            break;
    }
}

async function handleDataSubmit(e, form, action) {
    e.preventDefault();
    let formData = new FormData(form);
    let data = Object.fromEntries(formData.entries());

    if (data.type === 'chapter') {
        delete data.series_id;
    }

    let url = api + '/mange-library/' + action;
    let method = 'POST';

    if (action === 'update') {
        const id = data.chapter_id || data.book_id || data.series_id;
        url += '/' + id;
        method = 'PUT';
    } else if (action === 'delete') {
        const id = data.chapter_id || data.book_id || data.series_id;
        url += '/' + data.type + '/' + id;
        method = 'DELETE';
    }

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'authorization': getCookie('sessionToken')
            },
            body: action !== 'delete' ? JSON.stringify(data) : null
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

async function addLibrarySelect(container, books, chapters) {
    try {
        addFormDescription(container, 'Select reference');
        const seriesSelect = createSelectElement('series_id');
        container.appendChild(seriesSelect);

        const seriesIds = await fetchData('/library/series/u/' + userId);
        const seriesPromises = seriesIds.map(id => fetchData(`/library/series/${id}`));
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

async function addAuthorSelect(container) {
    const authorSelect = createSelectElement('author_id');
    container.appendChild(authorSelect);
    const authors = await fetchData(`/library/authors/${userId}`);
    const authorPromises = authors.map(id => fetchData(`/library/author/${id}`));
    const authorDetails = await Promise.all(authorPromises);

    await populateSelect(authorSelect, authorDetails, 'name', 'author_id', true, "author");
    authorSelect.dispatchEvent(new Event('change'));
}

async function handleSeriesChange(container, seriesSelect, bookSelect, chapterSelect) {
    try {
        const seriesId = seriesSelect.value;
        const books = await fetchData(`/library/books/${seriesId}`);
        const bookPromises = books.map(id => fetchData(`/library/book/${id}`));
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
    } catch (error) {
        console.error(error);
    }
}

async function handleBookChange(container, bookSelect, chapterSelect) {
    try {
        const bookId = bookSelect.value;
        const chapters = await fetchData(`/library/chapters/${bookId}`);
        const chapterPromises = chapters.map(id => fetchData(`/library/chapter/${id}`));
        const chapterDetails = await Promise.all(chapterPromises);

        if (!chapterDetails.length) {
            showNotification('No chapters found for this book', 'warning');
            resetToSeries(container.id);
            showNotification('Detected bug, refreshing page in 3 seconds', 'error');
            setTimeout(() => location.reload(), 3000);
        } else {
            await populateSelect(chapterSelect, chapterDetails, 'name', 'chapter_id');
            chapterSelect.dispatchEvent(new Event('change'));
        }
    } catch (error) {
        console.error(error);
    }
}

async function addFormatSelect(container) {
    try {
        const typeSelect = createSelectElement('format');
        container.appendChild(typeSelect);

        const allowedFormats = await fetchData('/library/series/formats');

        allowedFormats.forEach(field => {
            const option = new Option(field.name, field.format);
            typeSelect.add(option);
        });
    } catch (error) {
        console.error(error);
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
    input.className = 'shadow-sm border rounded-sm w-full py-2 px-3 text-white bg-[#191818] leading-tight focus:outline-hidden focus:shadow-outline';

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
    select.classList.add('shadow-sm', 'border', 'rounded-sm', 'w-full', 'py-2', 'px-3', 'text-white', 'bg-[#191818]', 'leading-tight', 'focus:outline-hidden', 'focus:shadow-outline', 'mb-3');
    return select;
}

async function populateSelect(select, data, textKey, valueKey, addDefaultOption, defaultValueName) {
    select.innerHTML = '';

    if (addDefaultOption) {
        const defaultOption = new Option(`Please select an ${defaultValueName}`, '', true, true);
        defaultOption.disabled = true;
        select.add(defaultOption);
    }

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
    try {
        const selectDL = editDataFields.querySelector(`select[name="${selectName}"]`);
        selectDL.addEventListener('change', async function () {
            const id = this.value;
            await loadOldData(type, id);
        });
        selectDL.dispatchEvent(new Event('change'));
    } catch (error) {
        console.error(error);
    }
}

async function loadOldData(type, id) {
    try {
        const typeMapping = {
            series: {
                endpoint: `/library/series/${id}`,
                fields: ['name', 'format', 'status', 'author_id']
            },
            books: {
                endpoint: `/library/book/${id}`,
                fields: ['name', 'isbn', 'startedReading', 'endedReading']
            },
            chapters: {
                endpoint: `/library/chapter/${id}`,
                fields: ['name', 'date']
            }
        };

        if (typeMapping[type]) {
            const { endpoint, fields } = typeMapping[type];
            const data = await fetchData(endpoint);

            for (const field of fields) {
                const input = editDataFields.querySelector(`input[name="${field}"], select[name="${field}"]`);
                if (input) {
                    let value = data[field] || '';
                    if (input.type === 'date' && value) {
                        const date = new Date(value);
                        const userTimezoneOffset = date.getTimezoneOffset() * 60000;
                        value = new Date(date.getTime() - userTimezoneOffset).toISOString().slice(0, 10);
                    }
                    input.value = value;
                }
            }
        }
    } catch (error) {
        console.error(error);
    }
}