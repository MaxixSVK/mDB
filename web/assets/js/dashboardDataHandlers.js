document.addEventListener('DOMContentLoaded', () => {
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