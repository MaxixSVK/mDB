document.addEventListener('DOMContentLoaded', deleteDataInit);

function deleteDataInit() {
    const deleteDataTypeSelect = document.getElementById('delete-data-type');
    const deleteDataFields = document.getElementById('delete-data-fields');
    const deleteDataForm = document.getElementById('delete-data-form');

    deleteDataTypeSelect.addEventListener('change', async () => { handleDataTypeChange(deleteDataTypeSelect, deleteDataFields) });
    deleteDataTypeSelect.dispatchEvent(new Event('change'));

    deleteDataForm.addEventListener('submit', (e) => { handleFormSubmit(e, deleteDataForm) });

    async function handleDataTypeChange(deleteDataTypeSelect, deleteDataFields) {
        const type = deleteDataTypeSelect.value;
        deleteDataFields.innerHTML = '';

        switch (type) {
            case 'series':
                await addSeriesSelect();
                break;
            case 'books':
                await addSeriesSelect(true);
                break;
            case 'chapters':
                await addSeriesSelect(true, true);
                break;
        }
    }

    async function addSeriesSelect(books = false, chapters = false) {
        try {
            deleteDataFields.innerHTML = '';
            addFormDescription(deleteDataFields, 'Select reference');
    
            const seriesSelect = createSelectElement('series_id');
            deleteDataFields.appendChild(seriesSelect);
    
            const series = await fetchData('/list-series');
            await populateSelect(seriesSelect, series, 'name', 'series_id');
    
            if (books) {
                const bookSelect = createSelectElement('book_id');
                deleteDataFields.appendChild(bookSelect);
    
                seriesSelect.addEventListener('change', async () => await handleSeriesChange(seriesSelect, bookSelect, chapters));
                await handleSeriesChange(seriesSelect, bookSelect, chapters); 
            }
        } catch (error) {
            console.error(error);
        }
    }
    
    async function handleSeriesChange(seriesSelect, bookSelect, chapters) {
        const seriesId = seriesSelect.value;
        const books = await fetchData(`/list-books/${seriesId}`);
        if (!books.length) {
            showNotification('No books found for this series', 'warning');
            resetToSeries();
        } else {
            await populateSelect(bookSelect, books, 'name', 'book_id');
            if (chapters) {
                handleBookChange(bookSelect);
            }
        }
    }
    
    async function handleBookChange(bookSelect) {
        let chapterSelect = deleteDataFields.querySelector('select[name="chapter_id"]');
        if (!chapterSelect) {
            chapterSelect = createSelectElement('chapter_id');
            bookSelect.insertAdjacentElement('afterend', chapterSelect);
        }
    
        bookSelect.addEventListener('change', async function () {
            const bookId = this.value;
            const chapters = await fetchData(`/list-chapters/${bookId}`);
            if (!chapters.length) {
                resetToSeries();
                showNotification('No chapters found for this book', 'warning');
            } else {
                await populateSelect(chapterSelect, chapters, 'name', 'chapter_id');
            }
        });
        bookSelect.dispatchEvent(new Event('change'));
    }

    function resetToSeries() {
        deleteDataTypeSelect.value = 'series';
        deleteDataTypeSelect.dispatchEvent(new Event('change'));
    }

    function addFormDescription(container, text) {
        const description = document.createElement('label');
        description.textContent = text;
        description.className = 'block text-gray-700 dark:text-gray-200 text-sm font-bold mb-2';
        container.appendChild(description);
    }

    function createSelectElement(name) {
        const select = document.createElement('select');
        select.name = name;
        select.required = true;
        select.classList.add('shadow', 'border', 'rounded', 'w-full', 'py-2', 'px-3', 'text-gray-700', 'dark:text-gray-300', 'dark:bg-gray-800', 'leading-tight', 'focus:outline-none', 'focus:shadow-outline', 'mb-3');
        return select;
    }

    async function fetchData(path) {
        const response = await fetch(api + path);
        return await response.json();
    }

    async function populateSelect(select, data, textKey, valueKey) {
        select.innerHTML = '';
        data.forEach(d => {
            const option = new Option(d[textKey], d[valueKey]);
            select.add(option);
        });
    }

    async function handleFormSubmit(e, form) {
        e.preventDefault();

        const deleteDataTypeSelect = document.getElementById('delete-data-type');
        const deleteDataFields = document.getElementById('delete-data-fields');
        const type = deleteDataTypeSelect.value;

        let id;
        if (type === 'chapters') {
            const chapterSelect = deleteDataFields.querySelector('select[name="chapter_id"]');
            id = chapterSelect ? chapterSelect.value : null;
        } else if (type === 'books') {
            const bookSelect = deleteDataFields.querySelector('select[name="book_id"]');
            id = bookSelect ? bookSelect.value : null;
        } else {
            const seriesSelect = deleteDataFields.querySelector('select[name="series_id"]');
            id = seriesSelect ? seriesSelect.value : null;
        }

        try {
            const response = await fetch(api + `/delete-data/${type}/${id}`, {
                method: 'DELETE',
                headers: {
                    'authorization': getCookie('sessionToken')
                }
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.msg || 'Failed to update data');
            }

            refreshContent()
            showNotification(responseData.msg, 'success');
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

}
