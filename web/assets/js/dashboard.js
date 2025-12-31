//TODO: Better handle new use
//Like handing when there are no series, books, chapters and authors

document.addEventListener("DOMContentLoaded", async function () {
    ({ loggedIn, userId } = await checkLogin());

    if (!loggedIn) {
        window.location.href = '/about';
    }
    
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