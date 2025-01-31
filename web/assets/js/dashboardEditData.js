document.addEventListener('DOMContentLoaded', editDataInit);

function editDataInit() {
    const editDataTypeSelect = document.getElementById('edit-data-type');
    const editDataFields = document.getElementById('edit-data-fields');
    const editDataForm = document.getElementById('edit-data-form');

    editDataTypeSelect.addEventListener('change', () => handleDataTypeChange(editDataTypeSelect, editDataFields));
    editDataTypeSelect.dispatchEvent(new Event('change'));

    editDataForm.addEventListener('submit', (e) => handleFormSubmit(e, editDataForm));

    async function handleDataTypeChange(editDataTypeSelect, editDataFields) {
        const type = editDataTypeSelect.value;
        editDataFields.innerHTML = '';

        switch (type) {
            case 'series':
                await addLibrarySelect(editDataFields);
                addFormDescription(editDataFields, 'DB Data');
                addInputField(editDataFields, 'name', 'Series Name');
                addInputField(editDataFields, 'img', 'Image URL');
                addStatusSelect(editDataFields);
                addFormatSelect(editDataFields);
                showDBdata('series', 'series_id');
                break;
            case 'book':
                await addLibrarySelect(editDataFields, true);
                addFormDescription(editDataFields, 'DB Data');
                addInputField(editDataFields, 'name', 'Book Name');
                addInputField(editDataFields, 'img', 'Image URL');
                addInputField(editDataFields, 'startedReading', 'Started Reading', 'date');
                addInputField(editDataFields, 'endedReading', 'Ended Reading', 'date');
                showDBdata('books', 'book_id');
                break;
            case 'chapter':
                await addLibrarySelect(editDataFields, true, true);
                addFormDescription(editDataFields, 'DB Data');
                addInputField(editDataFields, 'name', 'Chapter Name');
                addInputField(editDataFields, 'date', 'Date', 'date');
                showDBdata('chapters', 'chapter_id');
                break;
        }
    }

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

                    seriesSelect.addEventListener('change', async () => await handleSeriesChange(seriesSelect, bookSelect, chapterSelect));
                    await handleSeriesChange(seriesSelect, bookSelect, chapterSelect);
                } else {
                    seriesSelect.addEventListener('change', async () => await handleSeriesChange(seriesSelect, bookSelect));
                    await handleSeriesChange(seriesSelect, bookSelect);
                }
            }
        } catch (error) {
            console.error(error);
        }
    }

    async function handleSeriesChange(seriesSelect, bookSelect, chapterSelect) {
        const seriesId = seriesSelect.value;
        const books = await fetchData(`/books/${seriesId}`);
        const bookPromises = books.map(id => fetchData(`/book/${id}`));
        const bookDetails = await Promise.all(bookPromises);

        if (!bookDetails.length) {
            showNotification('No books found for this series', 'warning');
            resetToSeries();
        } else {
            await populateSelect(bookSelect, bookDetails, 'name', 'book_id');
            if (chapterSelect) {
                bookSelect.addEventListener('change', async () => await handleBookChange(bookSelect, chapterSelect));
                await handleBookChange(bookSelect, chapterSelect);
            }
            bookSelect.dispatchEvent(new Event('change'));
        }
    }

    async function handleBookChange(bookSelect, chapterSelect) {
        const bookId = bookSelect.value;
        const chapters = await fetchData(`/chapters/${bookId}`);
        const chapterPromises = chapters.map(id => fetchData(`/chapter/${id}`));
        const chapterDetails = await Promise.all(chapterPromises);

        // BUG: If there is valid series and book, but no chapters, the DB data element will be showed more than once
        if (!chapterDetails.length) {
            showNotification('No chapters found for this book', 'warning');
            resetToSeries();
        } else {
            await populateSelect(chapterSelect, chapterDetails, 'name', 'chapter_id');
            chapterSelect.dispatchEvent(new Event('change'));
        }
    }

    function resetToSeries() {
        editDataTypeSelect.value = 'series';
        editDataTypeSelect.dispatchEvent(new Event('change'));
    }

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

        const id = data.chapter_id || data.book_id || data.series_id;

        try {
            const response = await fetch(api + '/mange-library/update/' + id, {
                method: 'PUT',
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