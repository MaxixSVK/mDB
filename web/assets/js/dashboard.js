let user;

document.addEventListener("DOMContentLoaded", async function () {
    ({ loggedIn, user } = await checkLogin());

    if (!loggedIn) {
        window.location.href = '/about';
    }

    setupEventListeners();
    displayUser();

    setupCDNUploadReference();

    initDataHandlers('add', 'add-data-type', 'add-data-fields', 'add-data-form', 'new');
    initDataHandlers('edit', 'edit-data-type', 'edit-data-fields', 'edit-data-form', 'update');
    initDataHandlers('delete', 'delete-data-type', 'delete-data-fields', 'delete-data-form', 'delete');
});

function setupEventListeners() {
    document.getElementById('logout').addEventListener('click', logout);

    const cdnUploadForm = document.getElementById('cdn-upload-form');
    cdnUploadForm.addEventListener('submit', function (e) {
        e.preventDefault();
        handleCDNUpload();
    });

    const fileInput = document.getElementById('cdn-upload');
    fileInput.addEventListener('change', function () {
        const fileName = this.files.length > 0 ? this.files[0].name : 'Nothing selected';
        document.getElementById('file-name').textContent = fileName;
    });
}

function setupCDNUploadReference() {
    const referenceSelect = document.getElementById('cdn-data-type');
    const cdnDataFields = document.getElementById('cdn-data-fields');
    referenceSelect.addEventListener('change', async function () {
        cdnDataFields.innerHTML = '';
        if (this.value === 'series') {
            addCDNLibrarySelect(cdnDataFields);
        } else {
            addCDNLibrarySelect(cdnDataFields, true);
        }
    });

    referenceSelect.dispatchEvent(new Event('change'));
}

async function addCDNLibrarySelect(container, books) {
    try {
        addFormDescription(container, 'Select reference');
        const seriesSelect = createSelectElement('cdn_series_id');
        seriesSelect.id = 'cdn_series_id';
        container.appendChild(seriesSelect);

        const userData = await fetchData('/library/user/' + user.username);
        const seriesPromises = userData.series.map(id => fetchData(`/library/series/${id}`));
        const series = await Promise.all(seriesPromises);

        await populateSelect(seriesSelect, series, 'name', 'series_id');

        if (books) {
            const bookSelect = createSelectElement('cdn_book_id');
            bookSelect.id = 'cdn_book_id';
            container.appendChild(bookSelect);

            seriesSelect.addEventListener('change', async () => await handleSelectionChange(container, seriesSelect, bookSelect));
            await handleSelectionChange(container, seriesSelect, bookSelect);
        }
    } catch (error) {
        console.error(error);
    }
}

function handleCDNUpload() {
    const fileInput = document.getElementById('cdn-upload');
    const file = fileInput.files[0];

    if (!file) {
        showNotification('Please select a file', 'error');
        return;
    }

    let refType = document.getElementById('cdn-data-type').value;
    refId = document.getElementById(`cdn_${refType}_id`).value;

    const form = new FormData();
    form.append('image', file);
    form.append('type', refType);
    form.append('id', refId);

    uploadCDN(form);
}

async function uploadCDN(data) {
    try {
        const xhr = new XMLHttpRequest();
        const url = cdn + '/library/upload';
        const token = getCookie('sessionToken');

        xhr.open('POST', url, true);
        xhr.setRequestHeader('Authorization', token);

        xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
                const percentComplete = (event.loaded / event.total) * 100;
                showNotification('Uploading file', 'info', percentComplete);
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                const result = JSON.parse(xhr.responseText);
                showNotification(`File uploaded successfully ${result.filename}`, 'success');
                document.getElementById('cdn-upload').value = '';
                document.getElementById('file-name').textContent = 'Nothing selected';
            } else {
                throw new Error('Network response was not ok');
            }
        });

        xhr.addEventListener('error', () => {
            showNotification('File upload failed', 'error');
        });

        xhr.send(data);
    } catch (error) {
        showNotification('File upload failed', 'error');
    }
}

// --------------------------------
// dashboardData.js content bellow
// --------------------------------

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
                if (await addLibrarySelect(fieldsDiv) === false) return;
            }
            if (action !== 'delete') {
                await addAuthorSelect(fieldsDiv);
                addFormDescription(fieldsDiv, action === 'add' ? 'New DB Data:' : 'DB Data');
                addInputField(fieldsDiv, 'name', 'Series Name');
                addStatusSelect(fieldsDiv);
                addFormatSelect(fieldsDiv);
            }
            if (action === 'edit') {
                addImgSelect(fieldsDiv);
                showDBdata('series', 'series_id');
            }
            break;
        case 'book':
            if (action === 'add') {
                if (await addLibrarySelect(fieldsDiv) === false) return;
            } else {
                if (await addLibrarySelect(fieldsDiv, true) === false) return;
            }
            if (action !== 'delete') {
                addFormDescription(fieldsDiv, action === 'add' ? 'New DB Data' : 'DB Data');
                addInputField(fieldsDiv, 'name', 'Book Name');
                addInputField(fieldsDiv, 'isbn', 'ISBN');
                addInputField(fieldsDiv, 'started_reading', 'Started Reading', 'date');
                addInputField(fieldsDiv, 'ended_reading', 'Ended Reading', 'date');
                addInputField(fieldsDiv, 'current_page', 'Pages Read', 'number');
                addInputField(fieldsDiv, 'total_pages', 'Total Pages', 'number');
            }
            if (action === 'edit') {
                addImgSelect(fieldsDiv);
                showDBdata('books', 'book_id');
            }
            break;
        case 'chapter':
            if (action === 'add') {
                if (await addLibrarySelect(fieldsDiv, true) === false) return;
            } else {
                if (await addLibrarySelect(fieldsDiv, true, true) === false) return;
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

    let url = api + '/library/manage/' + action;
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

        const userData = await fetchData('/library/user/' + user.username);
        const seriesPromises = userData.series.map(id => fetchData(`/library/series/${id}`));
        const series = await Promise.all(seriesPromises);

        await populateSelect(seriesSelect, series, 'name', 'series_id');

        if (container.id !== 'add-data-fields' && series.length === 0) {
            container.parentElement.parentElement.classList.add('hidden');
            return false;
        }

        if (books) {
            const bookSelect = createSelectElement('book_id');
            container.appendChild(bookSelect);

            if (chapters) {
                const chapterSelect = createSelectElement('chapter_id');
                container.appendChild(chapterSelect);

                seriesSelect.addEventListener('change', async () => await handleSelectionChange(container, seriesSelect, bookSelect, chapterSelect));
                return await handleSelectionChange(container, seriesSelect, bookSelect, chapterSelect);
            } else {
                seriesSelect.addEventListener('change', async () => await handleSelectionChange(container, seriesSelect, bookSelect));
                return await handleSelectionChange(container, seriesSelect, bookSelect);
            }
        }
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
}

async function handleSelectionChange(container, seriesSelect, bookSelect, chapterSelect) {
    try {
        const seriesId = seriesSelect.value;
        if (!seriesId) return true;

        const seriesData = await fetchData(`/library/series/${seriesId}`);
        const bookPromises = seriesData.books.map(id => fetchData(`/library/book/${id}`));
        const bookDetails = await Promise.all(bookPromises);

        if (!bookDetails.length) {
            showNotification('No books found for this series', 'warning');
            resetToSeries(container.id);
            return false;
        } else {
            await populateSelect(bookSelect, bookDetails, 'name', 'book_id');
            if (chapterSelect) {
                bookSelect.addEventListener('change', async () => await handleBookChange(container, bookSelect, chapterSelect));
                return await handleBookChange(container, bookSelect, chapterSelect);
            }
            bookSelect.dispatchEvent(new Event('change'));
            return true;
        }
    } catch (error) {
        console.error(error);
        return false;
    }
}

async function handleBookChange(container, bookSelect, chapterSelect) {
    try {
        const bookId = bookSelect.value;
        if (!bookId) return true;

        const bookData = await fetchData(`/library/book/${bookId}`);
        const chapterPromises = bookData.chapters.map(id => fetchData(`/library/chapter/${id}`));
        const chapterDetails = await Promise.all(chapterPromises);

        if (!chapterDetails.length) {
            showNotification('No chapters found for this book', 'warning');
            resetToSeries(container.id);
            return false;
        } else {
            await populateSelect(chapterSelect, chapterDetails, 'name', 'chapter_id');
            chapterSelect.dispatchEvent(new Event('change'));
            return true;
        }
    } catch (error) {
        console.error(error);
        return false;
    }
}

async function addAuthorSelect(container) {
    const authorSelect = createSelectElement('author_id');
    container.appendChild(authorSelect);
    const authors = await fetchData(`/library/user/authors/${user.id}`);
    
    if (authors.error) {
        document.getElementById('add-data-form').parentElement.classList.add('hidden');
        document.getElementById('edit-data-form').parentElement.classList.add('hidden');
        document.getElementById('delete-data-form').parentElement.classList.add('hidden');
        return;
    }

    const authorPromises = authors.map(id => fetchData(`/library/author/${id}`));
    const authorDetails = await Promise.all(authorPromises);

    await populateSelect(authorSelect, authorDetails, 'name', 'author_id', true, "author");
    authorSelect.dispatchEvent(new Event('change'));
}

async function addFormatSelect(container) {
    try {
        const typeSelect = createSelectElement('format');
        container.appendChild(typeSelect);

        const allowedFormats = [
            { format: 'lightNovel', name: 'Light Novel', pluralName: 'Light Novels' },
            { format: 'manga', name: 'Manga', pluralName: 'Manga' }
        ];

        allowedFormats.forEach(field => {
            const option = new Option(field.name, field.format);
            typeSelect.add(option);
        });
    } catch (error) {
        console.error(error);
    }
}

function addImgSelect(container) {
    const imgSelect = createSelectElement('img');
    container.appendChild(imgSelect);
    const imgOptions = [
        { name: 'No Image', value: '0' },
        { name: 'Use mDB CDN', value: '1' }
    ];
    imgOptions.forEach(optionData => {
        const option = new Option(optionData.name, optionData.value);
        option.disabled = optionData.disabled || false;
        imgSelect.add(option);
    });
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
    'delete-data-fields': 'delete-data-type',
    'cdn-data-fields': 'cdn-data-type'
};

function resetToSeries(id) {
    const typeSelect = document.getElementById(selectMapping[id]);
    typeSelect.value = 'series';
    typeSelect.dispatchEvent(new Event('change'));
}

function refreshContent() {
    ['add', 'edit', 'delete'].forEach(action => {
        const typeSelect = document.getElementById(`${action}-data-type`);
        if (typeSelect) typeSelect.dispatchEvent(new Event('change'));
        const formParent = document.getElementById(`${action}-data-form`).parentElement;
        if (formParent.classList.contains('hidden')) {
            formParent.classList.remove('hidden');
        }
    });
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
                fields: ['name', 'format', 'status', 'author_id', 'img']
            },
            books: {
                endpoint: `/library/book/${id}`,
                fields: ['name', 'isbn', 'started_reading', 'ended_reading', 'img', 'current_page', 'total_pages']
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
                    let value = data[field] !== undefined && data[field] !== null ? data[field] : '';
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

// ----------------------------------
// dashboardAuthors.js content bellow
// ----------------------------------

const authorForm = document.getElementById('author-management-form');
const authorFormType = document.getElementById('author-type');

authorFormType.addEventListener('change', function () {
    if (this.value != 'new') {
        showNotification('This function is not available yet.', 'error');
    }
    this.value = 'new';
});

authorForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    const formData = new FormData(this);
    const authorName = formData.get('author-name');
    const authorBio = formData.get('author-bio');

    try {
        const response = await fetch(api + '/library/manage/author/new', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'authorization': getCookie('sessionToken')
            },
            body: JSON.stringify({
                name: authorName,
                bio: authorBio,
            })
        });

        if (response.ok) {
            showNotification('Author created successfully!', 'success');
            refreshContent();
        } else {
            showNotification('Failed to create author.', 'error');
        }
    } catch (error) {
        showNotification('An error occurred while creating the author.', 'error');
    }
});
