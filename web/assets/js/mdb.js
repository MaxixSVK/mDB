let user, publicUser = {};
let public = false;

document.addEventListener('DOMContentLoaded', async function () {
    const profileMatch = window.location.pathname.match(/^\/user\/([^\/]+)$/);
    user = await checkLogin();

    if (profileMatch) {
        public = true;
        publicUser.username = profileMatch[1];
    } else if (!user) {
        window.location.href = '/about';
    }

    await fetchPublicUserData();

    if (publicUser.error) {
        window.location.href = '/404';
    }

    if (publicUser.public == 0 && publicUser.id !== user?.id) {
        window.location.href = '/404';
    }

    if (public && publicUser.id === user?.id) {
        public = false;
        history.replaceState(null, '', '/');
    } else if (public) {
        showProfileBanner(publicUser.username);
    }

    const pfp = document.getElementById('pfp');
    const nopfp = document.getElementById('nopfp');

    if (user) {
        displayUser(false);
        if (pfp) pfp.addEventListener('click', () => window.location.href = '/dashboard');
        if (nopfp) nopfp.addEventListener('click', () => window.location.href = '/dashboard');
    } else if (nopfp) {
        nopfp.addEventListener('click', () => window.location.href = '/auth');
    }

    fetchMainData();
    setupSearch();
});

function fetchMainData() {
    let statstUrl = '/stats'
    if (public) {
        statstUrl += '/' + publicUser.username;
    }

    document.getElementById('stats').addEventListener('click', function () {
        window.location.href = statstUrl;
    });

    (user && !publicUser.public
        ? fetch(api + '/library/stats/' + publicUser.id, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': getCookie('sessionToken')
            },
        })
        : fetch(api + '/library/stats/' + publicUser.id))
        .then(response => response.json())
        .then(data => {
            if (data.seriesCount === 0) {
                createEmptyLibraryMessage();
                return;
            }
            createStatSection(data);
            createFormatLists();
        });
}

function createEmptyLibraryMessage() {
    document.getElementById('profile-banner').remove();

    const searchInput = document.getElementById('search-input');
    searchInput.disabled = true;
    searchInput.placeholder = 'Nothing to search...';

    document.getElementsByTagName('main')[0].classList.remove('bg-[#191818]');

    const emptyLibrary = document.getElementById('empty-library');
    emptyLibrary.className = 'flex flex-col justify-center items-center h-full';

    emptyLibrary.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'bg-[#1F1F1F] rounded-xl shadow-lg p-8 flex flex-col justify-center';

    const title = document.createElement('h1');
    title.className = 'text-3xl font-bold text-white mb-2 text-center';

    if (public) {
        const usernameSpan = document.createElement('span');
        usernameSpan.style.color = '#FFA500';
        usernameSpan.textContent = publicUser.username;
        title.appendChild(usernameSpan);
        title.appendChild(document.createTextNode("'s Library is Empty"));
    } else {
        title.textContent = 'Your Library is Empty';
    }

    const desc = document.createElement('p');
    desc.className = 'text-gray-300 text-center mb-6';

    const br = document.createElement('br');
    if (public) {
        desc.appendChild(document.createTextNode("This user hasn't added any manga or light novels yet."));
        desc.appendChild(br);
        desc.appendChild(document.createTextNode("Check back later or explore other libraries!"));
    } else {
        desc.appendChild(document.createTextNode("Start building your manga & light novel collection."));
        desc.appendChild(br);
        desc.appendChild(document.createTextNode("Add your first series to get started!"));
    }

    const btnGroup = document.createElement('div');
    btnGroup.className = 'flex flex-col sm:flex-row gap-4 w-full justify-center';

    if (!public) {
        const addBtn = document.createElement('button');
        addBtn.className = 'border-2 border-dashed border-[#FFA500] text-white font-semibold py-3 px-8 rounded-lg text-lg hover:bg-[#FFA500] transition duration-300';
        addBtn.onclick = () => window.location.href = '/dashboard';

        const addIcon = document.createElement('i');
        addIcon.className = 'fas fa-plus mr-2';

        addBtn.appendChild(addIcon);
        addBtn.appendChild(document.createTextNode('Add Series'));
        btnGroup.appendChild(addBtn);
    }

    const exploreBtn = document.createElement('button');
    exploreBtn.className = 'border-2 border-dashed border-white text-white font-semibold py-3 px-8 rounded-lg text-lg hover:bg-white hover:text-black transition duration-300';
    exploreBtn.onclick = () => window.location.href = '/explore';

    const exploreIcon = document.createElement('i');
    exploreIcon.className = 'fas fa-compass mr-2';

    exploreBtn.appendChild(exploreIcon);
    exploreBtn.appendChild(document.createTextNode('Explore Public Libraries'));
    btnGroup.appendChild(exploreBtn);

    const helpContainer = document.createElement('div');
    helpContainer.className = 'mt-8 text-center';

    const helpTextSpan = document.createElement('span');
    helpTextSpan.className = 'text-gray-400 text-sm';
    helpTextSpan.textContent = 'Need help? ';

    const helpLink = document.createElement('a');
    helpLink.href = '/guide';
    helpLink.className = 'text-[#FFA500] hover:underline';
    helpLink.textContent = 'Read the Guide';

    helpTextSpan.appendChild(helpLink);
    helpContainer.appendChild(helpTextSpan);

    container.appendChild(title);
    container.appendChild(desc);
    container.appendChild(btnGroup);
    container.appendChild(helpContainer);

    emptyLibrary.appendChild(container);
}

function createFormatLists() {
    const allowedFormats = [
        { format: 'lightNovel', name: 'Light Novel', pluralName: 'Light Novels' },
        { format: 'manga', name: 'Manga', pluralName: 'Manga' }
    ];

    allowedFormats.forEach(a => {
        const existingSection = document.getElementById(a.format);
        if (existingSection) {
            existingSection.remove();
        }

        const section = document.createElement('section');
        section.id = a.format;
        section.className = 'hidden mx-2 md:mx-4';

        const headerRow = document.createElement('div');
        headerRow.className = 'format-header-row mt-4 flex items-center justify-between';

        const header = document.createElement('h2');
        header.className = 'text-2xl text-white font-bold';
        header.textContent = a.pluralName;

        headerRow.appendChild(header);

        if (user && !public) {
            const addSeriesBtn = document.createElement('button');
            addSeriesBtn.type = 'button';
            addSeriesBtn.className = 'w-8 h-8 rounded-full text-white bg-[#1F1F1F] transition duration-200 flex items-center justify-center';
            addSeriesBtn.innerHTML = '<i class="fas fa-plus text-sm"></i>';
            addSeriesBtn.title = 'Create series in ' + a.name;

            addSeriesBtn.addEventListener('click', function () {
                renderSeries(null, a.format);
            });

            headerRow.appendChild(addSeriesBtn);
        }

        section.appendChild(headerRow);
        document.getElementById('series-list').appendChild(section);
    });
    fetchSeriesList();
}

function showFormatList(formatId) {
    const section = document.getElementById(formatId);
    if (section && section.classList.contains('hidden')) {
        section.classList.remove('hidden');
    }
}

function cleanAllFormatLists() {
    hideNoResults();

    const sections = document.querySelectorAll('#series-list section');
    sections.forEach(section => section.classList.add('hidden'));
    sections.forEach(section => {
        Array.from(section.children).forEach(child => {
            if (!child.classList.contains('format-header-row')) {
                child.remove();
            }
        });
    });
}

function getUniqueFormats(seriesData) {
    const formats = seriesData.map(series => series.format);
    return [...new Set(formats)];
}

function fetchSeriesList() {
    const seriesPromises = publicUser.series.map(seriesId =>
        user && !publicUser.public
            ? fetch(api + '/library/series/' + seriesId, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': getCookie('sessionToken')
                },
            }).then(response => response.json())
            : fetch(api + '/library/series/' + seriesId).then(response => response.json())
    );

    Promise.all(seriesPromises)
        .then(seriesData => {
            seriesData.sort((a, b) => a.name.localeCompare(b.name));

            const uniqueFormats = getUniqueFormats(seriesData);
            uniqueFormats.forEach(format => showFormatList(format));

            seriesData.forEach(series => {
                renderSeries(series);
            });
        });
}

function insertSeriesCard(formatSection, card, prependToList = false) {
    if (!prependToList) {
        formatSection.appendChild(card);
        return;
    }

    const firstListItem = Array.from(formatSection.children).find(child => !child.classList.contains('format-header-row'));
    if (firstListItem) {
        formatSection.insertBefore(card, firstListItem);
    } else {
        formatSection.appendChild(card);
    }
}

function renderSeries(series, targetFormat, prependToList = false) {
    if (!series) {
        const formatSection = document.getElementById(targetFormat);
        let selectedImageFile = null;
        const authors = Array.isArray(publicUser.authors) ? publicUser.authors : [];
        let selectedAuthorId = '';

        const card = document.createElement('div');
        card.className = 'bg-[#1F1F1F] rounded-md p-4 my-4';

        const header = document.createElement('div');
        header.className = 'flex items-center';

        const imgContainer = document.createElement('div');
        imgContainer.className = 'relative mr-4 h-24 w-16 shrink-0';

        const imageInput = document.createElement('input');
        imageInput.type = 'file';
        imageInput.accept = 'image/*';
        imageInput.className = 'hidden';

        const imagePickerButton = document.createElement('button');
        imagePickerButton.type = 'button';
        imagePickerButton.className = 'h-full w-full rounded-md bg-[#191818] border border-[#2a2a2a] flex items-center justify-center text-white hover:border-white transition-colors duration-200 overflow-hidden';
        imagePickerButton.title = 'Upload cover image';
        imagePickerButton.innerHTML = '<i class="fas fa-plus text-xl"></i>';

        imagePickerButton.addEventListener('click', function () {
            imageInput.click();
        });

        imageInput.addEventListener('change', function (event) {
            const file = event.target.files && event.target.files[0];
            if (!file || !file.type.startsWith('image/')) {
                return;
            }

            selectedImageFile = file;

            const previewImage = document.createElement('img');
            previewImage.src = URL.createObjectURL(file);
            previewImage.alt = 'Series cover preview';
            previewImage.className = 'h-full w-full object-cover rounded-md';

            imagePickerButton.innerHTML = '';
            imagePickerButton.appendChild(previewImage);
        });

        imgContainer.appendChild(imagePickerButton);
        imgContainer.appendChild(imageInput);

        const content = document.createElement('div');
        content.className = 'flex-1 space-y-2';

        const authorInput = document.createElement('select');
        authorInput.className = 'w-full px-3 py-2 text-white bg-[#191818] border border-[#2a2a2a] rounded-md focus:outline-none focus:border-white transition-colors duration-200';
        authorInput.disabled = true;

        const loadingAuthorOption = document.createElement('option');
        loadingAuthorOption.value = '';
        loadingAuthorOption.textContent = 'Loading authors...';
        loadingAuthorOption.selected = true;
        loadingAuthorOption.disabled = true;
        authorInput.appendChild(loadingAuthorOption);

        const titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.placeholder = 'Series name';
        titleInput.className = 'w-full px-3 py-2 text-white bg-[#191818] border border-[#2a2a2a] rounded-md focus:outline-none focus:border-white transition-colors duration-200';

        const statusInput = document.createElement('select');
        statusInput.className = 'w-full px-3 py-2 text-white bg-[#191818] border border-[#2a2a2a] rounded-md';

        const statusOptions = [
            { value: 'reading', label: 'Reading' },
            { value: 'finished', label: 'Finished' },
            { value: 'stopped', label: 'Stopped' },
            { value: 'paused', label: 'Paused' }
        ];

        statusOptions.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.label;
            statusInput.appendChild(optionElement);
        });

        const formatInput = document.createElement('select');
        formatInput.className = 'w-full px-3 py-2 text-white bg-[#191818] border border-[#2a2a2a] rounded-md';

        const formatOptions = [
            { value: 'manga', label: 'Manga' },
            { value: 'lightNovel', label: 'Light Novel' }
        ];

        formatOptions.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.label;
            formatInput.appendChild(optionElement);
        });

        formatInput.value = targetFormat;

        content.appendChild(titleInput);
        content.appendChild(authorInput);
        content.appendChild(statusInput);
        content.appendChild(formatInput);

        const noAuthorsMessage = document.createElement('p');
        noAuthorsMessage.className = 'text-sm text-red-400 hidden';
        noAuthorsMessage.textContent = 'No authors found. Create an author before adding a series.';
        content.appendChild(noAuthorsMessage);

        (async () => {
            if (authors.length === 0) {
                authorInput.innerHTML = '';
                const emptyOption = document.createElement('option');
                emptyOption.value = '';
                emptyOption.textContent = 'No authors available';
                emptyOption.selected = true;
                emptyOption.disabled = true;
                authorInput.appendChild(emptyOption);
                authorInput.disabled = true;
                noAuthorsMessage.classList.remove('hidden');
                submitButton.disabled = true;

                while (submitButton.firstChild) {
                    submitButton.removeChild(submitButton.firstChild);
                }
                const blockedIcon = document.createElement('i');
                blockedIcon.className = 'fas fa-ban mr-2';
                submitButton.appendChild(blockedIcon);
                submitButton.appendChild(document.createTextNode('Add an author first'));
                showNotification('No authors available. Create an author before adding a series.', 'warning');
                return;
            }

            authorInput.innerHTML = '';
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Select an author';
            defaultOption.selected = true;
            defaultOption.disabled = true;
            authorInput.appendChild(defaultOption);

            const authorPromises = authors.map(async authorId => fetch(api + '/library/author/' + authorId).then(response => response.json()));
            const authorDetails = await Promise.all(authorPromises);

            authorDetails.forEach(author => {
                const option = document.createElement('option');
                option.value = author.author_id;
                option.textContent = author.name;
                authorInput.appendChild(option);
            });

            authorInput.disabled = false;
            selectedAuthorId = authorInput.value;

            authorInput.addEventListener('change', function () {
                selectedAuthorId = this.value;
            });
        })();

        header.appendChild(imgContainer);
        header.appendChild(content);
        card.appendChild(header);

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'flex gap-2 mt-4 pt-4 border-t border-[#2a2a2a]';

        const submitButton = document.createElement('button');
        submitButton.type = 'button';
        submitButton.className = 'flex-1 border-2 border-dashed border-[#FFA500] text-white font-semibold py-2 px-4 rounded-lg hover:bg-[#FFA500] hover:text-black transition duration-300';

        const submitIcon = document.createElement('i');
        submitIcon.className = 'fas fa-check mr-2';
        submitButton.appendChild(submitIcon);
        submitButton.appendChild(document.createTextNode('Create Series'));

        const cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'flex-1 border-2 border-dashed border-white text-white font-semibold py-2 px-4 rounded-lg hover:bg-white hover:text-black transition duration-300';

        const cancelIcon = document.createElement('i');
        cancelIcon.className = 'fas fa-times mr-2';
        cancelButton.appendChild(cancelIcon);
        cancelButton.appendChild(document.createTextNode('Cancel'));

        submitButton.addEventListener('click', async function () {
            const title = titleInput.value.trim();
            const status = statusInput.value;
            const format = formatInput.value;
            const authorId = selectedAuthorId || authorInput.value;

            if (!title) {
                showNotification('Please enter a series name', 'warning');
                return;
            }

            if (!authorId) {
                showNotification('Please select an author', 'warning');
                return;
            }

            submitButton.disabled = true;

            while (submitButton.firstChild) {
                submitButton.removeChild(submitButton.firstChild);
            }
            const loadingIcon = document.createElement('i');
            loadingIcon.className = 'fas fa-spinner fa-spin mr-2';
            submitButton.appendChild(loadingIcon);
            submitButton.appendChild(document.createTextNode('Creating...'));

            try {
                const data = {
                    author_id: authorId,
                    name: title,
                    status: status,
                    format: format
                };

                const response = await fetch(api + '/library/manage/new/series', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': getCookie('sessionToken')
                    },
                    body: JSON.stringify(data)
                });

                const responseData = await response.json();

                if (!response.ok) {
                    throw new Error(responseData.error || responseData.message || 'Failed to create series');
                }

                const createdSeriesId = responseData.data.series_id;
                if (selectedImageFile && createdSeriesId) {
                    try {
                        await uploadSeriesCoverImage(selectedImageFile, createdSeriesId);
                    } catch (uploadError) {
                        showNotification(uploadError.message, 'warning');
                    }
                }

                showNotification(responseData.msg || 'Series created successfully', 'success');
                card.remove();

                await fetchPublicUserData();

                fetchMainData();
            } catch (error) {
                console.error('Error creating series:', error);
                showNotification(error.message, 'error');
            } finally {
                submitButton.disabled = false;

                while (submitButton.firstChild) {
                    submitButton.removeChild(submitButton.firstChild);
                }
                const resetIcon = document.createElement('i');
                resetIcon.className = 'fas fa-check mr-2';
                submitButton.appendChild(resetIcon);
                submitButton.appendChild(document.createTextNode('Create Series'));
            }
        });

        cancelButton.addEventListener('click', function () {
            card.remove();
        });

        buttonContainer.appendChild(submitButton);
        buttonContainer.appendChild(cancelButton);
        card.appendChild(buttonContainer);

        insertSeriesCard(formatSection, card, true);
        return;
    }

    const formatId = series.format || 'manga';
    const formatSection = document.getElementById(formatId);
    if (!formatSection) {
        return;
    }

    showFormatList(formatId);

    const card = document.createElement('div');
    card.className = 'bg-[#1F1F1F] rounded-md p-4 my-4 cursor-pointer';

    const header = document.createElement('div');
    header.className = 'flex items-center';

    const imgContainer = document.createElement('div');
    imgContainer.className = 'relative mr-4 h-24 w-16 shrink-0';

    const img = document.createElement('img');
    img.src = series.img ? cdn + '/library/s-' + series.series_id + '.png?q=l' : cdn + '/library/404.avif';
    img.alt = series.name || 'No image';
    img.className = 'h-full w-full object-cover rounded-md';

    const bookCountBadge = document.createElement('div');
    bookCountBadge.className = 'absolute -top-2 -right-2 bg-[#2A2A2A]  text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center';
    bookCountBadge.textContent = '...';

    imgContainer.appendChild(img);
    imgContainer.appendChild(bookCountBadge);

    const content = document.createElement('div');
    content.className = 'flex-1';

    const title = document.createElement('h2');
    title.className = 'text-white text-xl font-bold';
    title.textContent = series.name;

    const status = document.createElement('span');
    const statusClasses = {
        reading: 'text-blue-500',
        finished: 'text-green-500',
        stopped: 'text-gray-500',
        paused: 'text-yellow-500',
    };

    const statusTexts = {
        reading: 'Reading',
        finished: 'Finished',
        stopped: 'Stopped',
        paused: 'Paused',
    };

    const statusClass = statusClasses[series.status] || 'text-gray-400';
    const statusText = statusTexts[series.status] || 'Unknown';

    status.className = statusClass + ' text-sm mt-1';
    status.textContent = statusText;

    content.appendChild(title);
    content.appendChild(status);

    const count = Array.isArray(series.books) ? series.books.length : 0;
    bookCountBadge.textContent = count.toString();
    if (count > 99) bookCountBadge.textContent = '99+';

    header.appendChild(imgContainer);
    header.appendChild(content);

    card.appendChild(header);

    const bookList = document.createElement('div');
    const seriesListId = 'books-list-' + series.series_id;
    bookList.id = seriesListId;

    bookList.addEventListener('click', function (event) {
        event.stopPropagation();
    });

    card.appendChild(bookList);

    card.addEventListener('click', function () {
        const booksList = document.getElementById(seriesListId);
        if (!booksList) {
            return;
        }

        if (booksList.hasChildNodes()) {
            Array.from(booksList.children).forEach(child => {
                child.classList.add('opacity-0', 'translate-y-4');
                setTimeout(() => {
                    booksList.removeChild(child);
                }, 250);
            });
        } else if (Array.isArray(series.books) && series.books.length > 0) {
            getBookList(series);
        } else {
            renderNoBook(booksList);
        }
    });

    insertSeriesCard(formatSection, card, prependToList);
}

async function uploadSeriesCoverImage(file, seriesId) {
    return new Promise((resolve, reject) => {
        const form = new FormData();
        form.append('image', file);
        form.append('type', 'series');
        form.append('id', seriesId);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', cdn + '/library/upload', true);
        xhr.setRequestHeader('Authorization', getCookie('sessionToken'));

        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
            } else {
                let message = 'Series created, but image upload failed';
                try {
                    const errorData = JSON.parse(xhr.responseText);
                    message = errorData.error || errorData.msg || message;
                } catch (_) {
                }
                reject(new Error(message));
            }
        });

        xhr.addEventListener('error', () => {
            reject(new Error('Series created, but image upload failed'));
        });

        xhr.send(form);
    });
}

function renderNoBook(booksList) {
    const noBooksMsg = document.createElement('div');
    noBooksMsg.className = 'bg-[#232323] text-gray-300 rounded-md p-6 mt-4 text-center w-full flex flex-col items-center';

    const icon = document.createElement('i');
    icon.className = 'fas fa-book text-3xl text-gray-500 mb-2';
    noBooksMsg.appendChild(icon);

    const title = document.createElement('h3');
    title.className = 'text-xl font-bold mb-1 mt-2';
    title.textContent = 'No Books in This Series';
    noBooksMsg.appendChild(title);

    const desc = document.createElement('p');
    desc.className = 'text-md';

    if (public) {
        desc.innerHTML = `This user hasn't added any books to this series yet.<br>Check back later to see updates!`;
    } else {
        desc.innerHTML = `This series doesn't have any books yet.<br>Add your first book to get started!`;
    }

    noBooksMsg.appendChild(desc);

    booksList.appendChild(noBooksMsg);
}

function getBookList(series) {
    const bookPromises = series.books.map(async entry => {
        const isTuple = Array.isArray(entry);
        const [bookId, chapters] = isTuple ? entry : [entry, undefined];

        const bookData = await (user && !publicUser.public
            ? fetch(api + '/library/book/' + bookId, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': getCookie('sessionToken')
                },
            })
            : fetch(api + '/library/book/' + bookId)
        ).then(res => res.json());

        if (isTuple && chapters !== undefined) {
            bookData.chapters = chapters;
        }

        return bookData;
    });

    Promise.all(bookPromises).then(bookData => {
        const booksList = document.getElementById('books-list-' + series.series_id);
        if (bookData.length === 0) {
            renderNoBook(booksList);
            return;
        }
        bookData.sort((a, b) => a.started_reading.localeCompare(b.started_reading));
        bookData.forEach(book => renderBook(series, book));
    });
}

function renderBook(series, book) {
    const booksList = document.getElementById('books-list-' + series.series_id);

    const card = document.createElement('div');
    card.className = 'bg-[#2A2A2A] rounded-md mt-4 flex items-center transition transform duration-500 ease-in-out opacity-0 translate-y-4';

    const imgContainer = document.createElement('div');
    imgContainer.className = 'relative mr-4';

    const img = document.createElement('img');
    img.src = book.img ? cdn + '/library/b-' + book.book_id + '.png?q=l' : cdn + '/library/404.avif';
    img.alt = book.name || 'No image';
    img.className = 'h-24 object-cover rounded-md';

    const chapterCountBadge = document.createElement('div');
    chapterCountBadge.className = 'absolute -top-2 -right-2 bg-[#2A2A2A]  text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center';
    chapterCountBadge.textContent = '...';

    const count = book.chapters.length;
    chapterCountBadge.textContent = count.toString();
    if (count > 99) chapterCountBadge.textContent = '99+';

    imgContainer.appendChild(img);
    imgContainer.appendChild(chapterCountBadge);

    const content = document.createElement('div');
    content.className = 'flex-1';

    const title = document.createElement('h2');
    title.className = 'text-white text-lg font-bold';
    title.textContent = book.name;

    let startedDate = new Date(book.started_reading).toLocaleDateString();

    const startedReading = document.createElement('p');
    startedReading.className = 'text-gray-400 text-sm';
    startedReading.textContent = `Started on: ${startedDate}`;

    const endedReading = document.createElement('p');
    endedReading.className = 'text-gray-400 text-sm';

    const endedReadingText = book.ended_reading
        ? `Ended on: ${new Date(book.ended_reading).toLocaleDateString()}`
        : 'Still reading';

    endedReading.textContent = endedReadingText;

    content.appendChild(title);
    content.appendChild(startedReading);
    content.appendChild(endedReading);

    card.appendChild(imgContainer);
    card.appendChild(content);

    booksList.appendChild(card);

    requestAnimationFrame(() => {
        card.classList.remove('opacity-0', 'translate-y-4');
    });

    card.addEventListener('click', function () {
        fetchBookDetails(series, book);
    });
}

async function fetchBookDetails(series, book) {
    let chapters = await Promise.all(
        book.chapters.map(chapterId => (user && !publicUser.public
            ? fetch(api + '/library/chapter/' + chapterId, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': getCookie('sessionToken')
                },
            })
            : fetch(api + '/library/chapter/' + chapterId)
        ).then(response => response.json()))
    );

    const author = await (user && !publicUser.public
        ? fetch(api + '/library/author/' + series.author_id, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': getCookie('sessionToken')
            },
        })
        : fetch(api + '/library/author/' + series.author_id)
    ).then(response => response.json());

    series.author_name = author.name || 'Unknown';
    chapters.sort((a, b) => a.date.localeCompare(b.date));

    renderBookDetails(series, book, chapters);
}

function renderBookDetails(series, book, chapters) {
    document.body.classList.add('overflow-hidden');

    const container = document.createElement('div');
    container.className = 'fixed bottom-0 left-0 w-full h-4/5 md:h-2/3 bg-[#191818] p-6 transform translate-y-full transition-transform duration-500 ease-in-out flex items-center justify-center border-t-4 border-[#2A2A2A] overflow-y-auto md:overflow-hidden';
    container.id = 'book-details-container';

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'flex flex-col md:flex-row h-full';

    const img = document.createElement('img');
    img.src = book.img ? cdn + '/library/b-' + book.book_id + '.png' : cdn + '/library/404.avif';
    img.alt = book ? book.name : 'No image';
    img.className = 'object-cover rounded-md mb-4 md:mb-0 md:mr-6 w-full md:w-auto md:max-w-md mx-auto';

    const textWrapper = document.createElement('div');
    textWrapper.className = 'flex-1 flex flex-col h-full';

    const title = document.createElement('h2');
    title.className = 'text-white text-3xl font-bold mb-2';
    title.textContent = book.name;

    const datesWrapper = document.createElement('div');
    datesWrapper.className = 'flex flex-col md:flex-row md:items-center mb-2';

    let startedDate = new Date(book.started_reading).toLocaleDateString();
    let endedDate = book.ended_reading
        ? new Date(book.ended_reading).toLocaleDateString()
        : 'Still reading';

    const readingDates = document.createElement('p');
    readingDates.className = 'text-gray-400 text-sm';
    readingDates.textContent = `${startedDate} - ${endedDate}`;

    const chapterCount = document.createElement('p');
    chapterCount.className = 'text-gray-400 text-sm mt-1 md:mt-0 md:ml-4';
    const chapterText = chapters.length === 1 ? 'chapter' : 'chapters';
    chapterCount.textContent = `${chapters.length} ${chapterText}`;

    datesWrapper.appendChild(readingDates);
    datesWrapper.appendChild(chapterCount);

    const pageStatusWrapper = document.createElement('div');
    pageStatusWrapper.className = 'mb-2 w-full';

    const pageStatusContainer = document.createElement('div');
    pageStatusContainer.className = 'bg-[#2A2A2A] rounded-lg p-2 max-w-md md:max-w-full';

    const currentPage = book.current_page || 0;
    const totalPages = book.total_pages;

    const hasValidPageData = totalPages && totalPages > 0;
    const percentage = hasValidPageData ? Math.round((currentPage / totalPages) * 100) : 0;

    const topSection = document.createElement('div');
    topSection.className = 'flex items-center justify-between';

    const pageStatusTitle = document.createElement('span');
    pageStatusTitle.className = 'text-white';
    pageStatusTitle.textContent = 'Reading Progress';

    const percentageText = document.createElement('span');
    percentageText.className = 'text-white';
    percentageText.textContent = hasValidPageData ? `${percentage}%` : 'No page data';

    topSection.appendChild(pageStatusTitle);
    topSection.appendChild(percentageText);

    const progressBarContainer = document.createElement('div');
    progressBarContainer.className = 'w-full h-1 bg-[#191818] rounded-full overflow-hidden';

    const progressBar = document.createElement('div');
    progressBar.className = 'h-full rounded-full transition-all duration-300 ease-in-out';
    progressBar.style.backgroundColor = '#FFA500';
    progressBar.style.width = `${percentage}%`;

    progressBarContainer.appendChild(progressBar);

    const pageCountText = document.createElement('span');
    pageCountText.className = 'text-gray-400 text-sm whitespace-nowrap';
    pageCountText.textContent = hasValidPageData
        ? `Page ${currentPage} of ${totalPages}`
        : currentPage > 0
            ? `${currentPage} page${currentPage !== 1 ? 's' : ''} read`
            : 'Not tracking pages';

    pageStatusContainer.appendChild(topSection);
    pageStatusContainer.appendChild(progressBarContainer);
    pageStatusContainer.appendChild(pageCountText);
    pageStatusWrapper.appendChild(pageStatusContainer);

    const infoWrapper = document.createElement('div');
    infoWrapper.className = 'flex flex-col md:flex-row md:items-center mb-2 md:mb-0 mt-0 md:mt-2 space-y-4 md:space-y-0 md:space-x-4';

    const authorWrapper = document.createElement('div');
    authorWrapper.className = 'mb-4 md:mb-0 mt-0 md:mt-2';

    const authorLabel = document.createElement('p');
    authorLabel.className = 'text-gray-400 text-sm font-semibold';
    authorLabel.textContent = 'Author:';

    const authorValue = document.createElement('p');
    authorValue.className = 'text-white text-sm';
    authorValue.textContent = series.author_name;

    authorWrapper.appendChild(authorLabel);
    authorWrapper.appendChild(authorValue);
    infoWrapper.appendChild(authorWrapper);

    const isbnWrapper = document.createElement('div');
    isbnWrapper.className = 'mb-4 md:mb-0 mt-0 md:mt-2';

    const isbnLabel = document.createElement('p');
    isbnLabel.className = 'text-gray-400 text-sm font-semibold';
    isbnLabel.textContent = 'ISBN:';

    const isbnValue = document.createElement('p');
    isbnValue.className = 'text-white text-sm';
    isbnValue.textContent = book.isbn || 'Not available';

    isbnWrapper.appendChild(isbnLabel);
    isbnWrapper.appendChild(isbnValue);
    infoWrapper.appendChild(isbnWrapper);

    const chaptersList = document.createElement('ul');
    chaptersList.className = 'text-white space-y-2 overflow-y-auto flex-1 mb-4 md:mb-0 scrollbar scrollbar-thumb-[#2A2A2A] scrollbar-track-[#191818]';

    if (chapters.length !== 0) {
        chapters.forEach(chapter => {
            const chapterItem = document.createElement('li');
            chapterItem.className = 'p-2 bg-[#2A2A2A] rounded-md max-w-md flex justify-between items-center';

            const chapterName = document.createElement('span');
            chapterName.className = 'mr-2';
            chapterName.textContent = chapter.name;

            const chapterDate = document.createElement('span');
            chapterDate.className = 'text-gray-400 text-sm whitespace-nowrap';
            chapterDate.textContent = new Date(chapter.date).toLocaleDateString();

            chapterItem.appendChild(chapterName);
            chapterItem.appendChild(chapterDate);
            chaptersList.appendChild(chapterItem);
        });
    }

    textWrapper.appendChild(title);
    textWrapper.appendChild(datesWrapper);
    textWrapper.appendChild(pageStatusWrapper);
    textWrapper.appendChild(chaptersList);
    textWrapper.appendChild(infoWrapper);

    contentWrapper.appendChild(img);
    contentWrapper.appendChild(textWrapper);

    container.appendChild(contentWrapper);

    document.getElementById('app').appendChild(container);

    document.addEventListener('click', handleOutsideClick, true);

    requestAnimationFrame(() => {
        container.classList.remove('translate-y-full');
    });

    function closeBookDetails() {
        if (container) {
            container.classList.add('translate-y-full');
            setTimeout(() => {
                container.remove();
                document.body.classList.remove('overflow-hidden');
            }, 500);
        }
        document.removeEventListener('click', handleOutsideClick, true);
    }

    function handleOutsideClick(event) {
        event.stopPropagation();
        if (container && !container.contains(event.target)) {
            closeBookDetails();
        }
    }
}

function setupSearch() {
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', debounce(handleSearchInput, 250));

    function handleSearchInput() {
        const searchTerm = searchInput.value.trim();
        if (searchTerm.length > 0) {
            performSearch(searchTerm);
        } else {
            hideNoResults();
            hideStats();
            cleanAllFormatLists();
            fetchMainData();
        }
    }
}

function performSearch(searchTerm) {
    (user && !publicUser.public
        ? fetch(api + '/library/user/search/' + publicUser.id + '/' + searchTerm, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': getCookie('sessionToken')
            },
        })
        : fetch(api + '/library/user/search/' + publicUser.id + '/' + searchTerm))
        .then(response => response.json())
        .then(data => {
            hideStats()
            cleanAllFormatLists();

            if (data.length !== 0) {
                fetchSearchSeries(data);
            } else {
                showNoResults()
            }
        });
}

function fetchSearchSeries(searchResults) {
    searchResults.forEach(seriesArr => {
        const [series_id, booksArr] = seriesArr;

        (user && !publicUser.public
            ? fetch(api + '/library/series/' + series_id, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': getCookie('sessionToken')
                },
            })
            : fetch(api + '/library/series/' + series_id))
            .then(response => response.json())
            .then(series => {
                series.books = booksArr;
                renderSeries(series);
            });
    });
}

function showNoResults() {
    document.getElementsByTagName('main')[0].classList.remove('bg-[#191818]');

    const noResultsElement = document.getElementById('no-results');
    noResultsElement.className = 'flex flex-col justify-center items-center h-full';

    while (noResultsElement.firstChild) {
        noResultsElement.removeChild(noResultsElement.firstChild);
    }

    const container = document.createElement('div');
    container.className = 'bg-[#1F1F1F] rounded-xl shadow-lg p-8 flex flex-col justify-center';

    const title = document.createElement('h1');
    title.className = 'text-3xl font-bold text-white mb-2 text-center';
    title.textContent = 'No Results Found';

    const description = document.createElement('p');
    description.className = 'text-gray-300 text-center';
    description.appendChild(document.createTextNode('We could not find anything matching your search.'));
    description.appendChild(document.createElement('br'));
    description.appendChild(document.createTextNode('Try a different keyword or check your spelling.'));

    const helpContainer = document.createElement('div');
    helpContainer.className = 'mt-4 text-center';

    const helpText = document.createElement('span');
    helpText.className = 'text-gray-400 text-sm';
    helpText.appendChild(document.createTextNode('Need help searching? '));

    const helpLink = document.createElement('a');
    helpLink.href = '/guide';
    helpLink.className = 'text-[#FFA500] hover:underline';
    helpLink.textContent = 'Read the Guide';

    helpText.appendChild(helpLink);
    helpContainer.appendChild(helpText);

    container.appendChild(title);
    container.appendChild(description);
    container.appendChild(helpContainer);

    noResultsElement.appendChild(container);
}

function hideNoResults() {
    document.getElementsByTagName('main')[0].classList.add('bg-[#191818]');

    const noResultsElement = document.getElementById('no-results');

    noResultsElement.className = '';
    while (noResultsElement.firstChild) {
        noResultsElement.removeChild(noResultsElement.firstChild);
    }
}

function hideStats() {
    const statsElement = document.getElementById('stats');

    statsElement.className = '';
    while (statsElement.firstChild) {
        statsElement.removeChild(statsElement.firstChild);
    }
}

function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}
