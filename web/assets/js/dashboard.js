//TODO: Better handle new use
//Like handing when there are no series, books, chapters and authors

document.addEventListener("DOMContentLoaded", async function () {
    ({ loggedIn, userId } = await checkLogin());
    if (!loggedIn) window.location.href = '/about';
    setupEventListeners();
    displayUser();

    setupCDNUploadReference();
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

    const fileName = document.getElementById('file-name');
    fileName.textContent = 'Nothing selected';
    fileName.addEventListener('click', function () {
        const textToCopy = fileName.textContent;
        const urlRegex = /https?:\/\/[^\s]+/;

        if (urlRegex.test(textToCopy)) {
            navigator.clipboard.writeText(textToCopy);
            showNotification('Link copied to clipboard', 'success');
        }
    });

    const searchElement = document.getElementById('search-cdn');
    searchElement.addEventListener('input', debounce((event) => {
        const searchQuery = event.target.value;
        renderCDNList(searchQuery);
    }, 250));
    searchElement.dispatchEvent(new Event('input'));
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
        container.appendChild(seriesSelect);

        const seriesIds = await fetchData('/library/series/u/' + userId);
        const seriesPromises = seriesIds.map(id => fetchData(`/library/series/${id}`));
        const series = await Promise.all(seriesPromises);

        await populateSelect(seriesSelect, series, 'name', 'series_id');

        if (books) {
            const bookSelect = createSelectElement('cdn_book_id');
            container.appendChild(bookSelect);

            seriesSelect.addEventListener('change', async () => await handleSeriesChange(container, seriesSelect, bookSelect));
            await handleSeriesChange(container, seriesSelect, bookSelect);
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

    const referenceType = document.getElementById('cdn-data-type').value;
    let refFilename

    if (referenceType === 'series') {
        const seriesId = document.getElementsByName('cdn_series_id')[0].value;
        refFilename = `s-${seriesId}.png`;
    } else {
        const bookId = document.getElementsByName('cdn_book_id')[0].value;
        refFilename = `b-${bookId}.png`;
    }

    const form = new FormData();
    form.append('image', file);
    form.append('refFilename', refFilename);

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
                renderCDNList();
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

async function fetchCDNList(searchQuery = '') {
    try {
        const response = await fetch(cdn + `/library/search/${searchQuery}`, {
            headers: {
                'Authorization': getCookie('sessionToken')
            }
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching CDN list:', error);
        return [];
    }
}

async function renderCDNList(searchQuery = '') {
    const cdnList = document.getElementById('cdnList');
    cdnList.innerHTML = '';

    if (searchQuery.trim() === '') {
        const listItem = document.createElement('p');
        listItem.className = 'bg-[#2A2A2A] p-4 md:p-6 mt-4 rounded-md shadow-lg text-white text-center';
        listItem.textContent = 'Please enter a search query';
        cdnList.appendChild(listItem);
        return;
    }

    const list = await fetchCDNList(searchQuery);
    const filteredList = list.filter(item => item.toLowerCase().includes(searchQuery.toLowerCase()));
    const limitedList = filteredList.slice(0, 5);

    if (limitedList.length === 0) {
        const listItem = document.createElement('p');
        listItem.className = 'bg-[#2A2A2A] p-4 md:p-6 mt-4 rounded-md shadow-lg text-white text-center';
        listItem.textContent = 'No files found';
        cdnList.appendChild(listItem);
    }

    limitedList.forEach(item => {
        const listItem = createListItem(item);
        cdnList.appendChild(listItem);
    });
}

function createListItem(item) {
    const listItem = document.createElement('li');
    listItem.className = 'bg-[#2A2A2A] p-4 md:p-6 mt-4 rounded-md shadow-lg flex justify-between items-center';

    listItem.innerHTML = `
        <span class="font-bold text-white item-text grow truncate overflow-hidden whitespace-nowrap">${item}</span>
        <i class="fas fa-trash-alt text-red-500 cursor-pointer delete-icon transition duration-200 ease-in-out"></i>
    `;

    const deleteIcon = listItem.querySelector('.delete-icon');
    const itemText = listItem.querySelector('.item-text');

    deleteIcon.addEventListener('click', event => handleDeleteIconClick(event, item, listItem));
    itemText.addEventListener('click', () => handleItemTextClick(item));

    return listItem;
}

function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

async function handleDeleteIconClick(event, item, listItem) {
    event.stopPropagation();
    const response = await fetch(cdn + `/library/delete/${item}`, {
        method: 'DELETE',
        headers: {
            'Authorization': getCookie('sessionToken')
        },
    });

    if (response.ok) {
        listItem.remove();
        showNotification('File deleted successfully', 'success');
    } else {
        showNotification('File deletion failed', 'error');
    }
}

function handleItemTextClick(item) {
    navigator.clipboard.writeText(cdn + '/library/' + item).then(() => {
        showNotification('Link copied to clipboard', 'success');
    }).catch(err => {
        showNotification('Failed to copy link to clipboard', 'error');
        console.error('Failed to copy text: ', err);
    });
}