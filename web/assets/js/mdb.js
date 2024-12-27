document.addEventListener('DOMContentLoaded', function () {
    checkLogin();
    fetchStats();
    fetchSeries();
    setupSearch();
});

async function checkLogin() {
    const session = getCookie('sessionToken');
    if (session) {
        try {
            const response = await fetch(api + '/account/validate', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'authorization': session
                },
            });

            if (response.ok) {
                const userData = await fetch(api + '/account', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'authorization': session
                    },
                }).then(response => response.json());
                document.getElementById('login').classList.add('hidden');
                document.getElementById('pfp').classList.remove('hidden');
                document.getElementById('pfp').src = api + '/cdn/pfp/' + userData.username + '.png';
                document.getElementById('pfp').addEventListener('click', function () {
                    window.location.href = '/dashboard';
                });
            } else {
                document.cookie = 'sessionToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            }
        } catch (error) {
            console.error('Login failed:', error);
        }
    } else {
        document.getElementById('pfp').classList.add('hidden');
        document.getElementById('login').addEventListener('click', function () {
            window.location.href = '/auth';
        });
    }
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function fetchStats() {
    document.getElementById('stats').addEventListener('click', function () {
        window.location.href = '/stats';
    });
    fetch(api + '/stats')
        .then(response => response.json())
        .then(data => {
            document.getElementById('series-count').textContent = data.seriesCount;
            document.getElementById('book-count').textContent = data.bookCount;
            document.getElementById('chapter-count').textContent = data.chapterCount;
        });
}

function fetchSeries() {
    fetch(api + '/series')
        .then(response => response.json())
        .then(seriesIds => {
            const seriesPromises = seriesIds.map(seriesId =>
                fetch(api + '/series/' + seriesId).then(response => response.json())
            );
            return Promise.all(seriesPromises);
        })
        .then(seriesData => {
            seriesData.sort((a, b) => a.name.localeCompare(b.name));
            seriesData.forEach(series => {
                renderSeriesCard(series);
            });
        });
}

function renderSeriesCard(series) {
    const lightNovelsList = document.getElementById('light-novels-list');
    const mangaList = document.getElementById('manga-list');

    if (series.format === 'lightNovel' && !lightNovelsList.querySelector('h2')) {
        const lightNovelsHeader = document.createElement('h2');
        lightNovelsHeader.className = 'text-2xl mb-2 text-white font-bold';
        lightNovelsHeader.textContent = 'Light Novels';
        lightNovelsList.appendChild(lightNovelsHeader);
    } else if (series.format === 'manga' && !mangaList.querySelector('h2')) {
        const mangaHeader = document.createElement('h2');
        mangaHeader.className = 'text-2xl mb-2 text-white font-bold';
        mangaHeader.textContent = 'Manga';
        mangaList.appendChild(mangaHeader);
    }

    const card = document.createElement('div');
    card.className = 'bg-[#1F1F1F] rounded-md p-4 mb-4 cursor-pointer';

    const header = document.createElement('div');
    header.className = 'flex items-center';

    const img = document.createElement('img');
    img.src = series.img ? series.img + '?lowres=true' : cdn + '/images/404.png?lowres=true';
    img.alt = series.name || 'No image';
    img.className = 'h-24 object-cover rounded-md mr-4';

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
        default: 'text-red-500'
    };
    
    const statusTexts = {
        reading: 'Reading',
        finished: 'Finished',
        stopped: 'Stopped',
        paused: 'Paused',
        default: 'Unknown'
    };
    
    const statusClass = statusClasses[series.status] || statusClasses.default;
    const statusText = statusTexts[series.status] || statusTexts.default;
    
    status.className = statusClass;
    status.textContent = statusText;

    content.appendChild(title);
    content.appendChild(status);

    header.appendChild(img);
    header.appendChild(content);

    card.appendChild(header);

    const bookList = document.createElement('div');
    bookList.id = 'books-list-' + series.series_id;

    bookList.addEventListener('click', function (event) {
        event.stopPropagation();
    });

    card.appendChild(bookList);

    card.addEventListener('click', function () {
        const booksList = document.getElementById('books-list-' + series.series_id);
        if (booksList.hasChildNodes()) {
            Array.from(booksList.children).forEach(child => {
                child.classList.add('opacity-0', 'translate-y-4');
                setTimeout(() => {
                    booksList.removeChild(child);
                }, 250);
            });
        } else {
            fetchBooks(series.series_id);
        }
    });

    if (series.format === 'lightNovel') {
        lightNovelsList.appendChild(card);
    } else {
        mangaList.appendChild(card);
    }
}

function fetchBooks(seriesId) {
    fetch(api + '/books/' + seriesId)
        .then(response => response.json())
        .then(bookIds => {
            const bookPromises = bookIds.map(bookId =>
                fetch(api + '/book/' + bookId).then(response => response.json())
            );
            return Promise.all(bookPromises);
        })
        .then(bookData => {
            bookData.sort((a, b) => a.startedReading.localeCompare(b.startedReading));
            bookData.forEach(book => {
                renderBookCard(book);
            });
        });
}

function renderBookCard(book) {
    const booksList = document.getElementById('books-list-' + book.series_id);

    const card = document.createElement('div');
    card.className = 'bg-[#2A2A2A] rounded-md mt-4 flex items-center transition transform duration-500 ease-in-out opacity-0 translate-y-4';

    const img = document.createElement('img');
    img.src = book.img ? book.img + '?lowres=true' : cdn + '/images/404.png?lowres=true';
    img.alt = book.name || 'No image';
    img.className = 'h-24 object-cover rounded-md mr-4';

    const content = document.createElement('div');
    content.className = 'flex-1';

    const title = document.createElement('h2');
    title.className = 'text-white text-lg font-bold';
    title.textContent = book.name;

    let startedDate = new Date(book.startedReading).toLocaleDateString();

    const startedReading = document.createElement('p');
    startedReading.className = 'text-gray-400 text-sm';
    startedReading.textContent = `Started Reading: ${startedDate}`;

    const endedReading = document.createElement('p');
    endedReading.className = 'text-gray-400 text-sm';
    
    if (book.endedReading) {
        const endedDate = new Date(book.endedReading).toLocaleDateString();
        endedReading.textContent = `Ended Reading: ${endedDate}`;
    } else {
        endedReading.textContent = 'Still reading';
    }

    content.appendChild(title);
    content.appendChild(startedReading);
    content.appendChild(endedReading);

    card.appendChild(img);
    card.appendChild(content);

    booksList.appendChild(card);

    requestAnimationFrame(() => {
        card.classList.remove('opacity-0', 'translate-y-4');
    });

    card.addEventListener('click', function () {
        fetchBookData(book.book_id);
    });
}

function fetchBookData(bookid) {
    const bookPromise = fetch(api + '/book/' + bookid).then(response => response.json());
    const chaptersPromise = fetch(api + '/chapters/' + bookid)
        .then(response => response.json())
        .then(chapterIds => {
            const chapterPromises = chapterIds.map(chapterId =>
                fetch(api + '/chapter/' + chapterId).then(response => response.json())
            );
            return Promise.all(chapterPromises);
        });

    Promise.all([bookPromise, chaptersPromise])
        .then(([bookData, chapterData]) => {
            chapterData.sort((a, b) => a.name.localeCompare(b.date));
            renderBookData(bookData, chapterData);
        });
}

function renderBookData(bookData, chapterData) {
    document.body.classList.add('overflow-hidden');

    const container = document.createElement('div');
    container.className = 'fixed bottom-0 left-0 w-full h-2/3 md:h-2/3 bg-[#191818] p-6 transform translate-y-full transition-transform duration-500 ease-in-out flex items-center justify-center border-t-4 border-[#2A2A2A] overflow-y-auto md:overflow-hidden';
    container.id = 'book-details-container';

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'flex flex-col md:flex-row h-full';

    const img = document.createElement('img');
    img.src = bookData.img || cdn + '/images/404.png';
    img.alt = bookData.name || 'No image';
    img.className = 'object-cover rounded-md mb-4 md:mb-0 md:mr-6 w-full md:w-auto md:max-w-md mx-auto';

    const textWrapper = document.createElement('div');
    textWrapper.className = 'flex-1 flex flex-col h-full';

    const title = document.createElement('h2');
    title.className = 'text-white text-3xl font-bold mb-4';
    title.textContent = bookData.name;

    const chaptersList = document.createElement('ul');
    chaptersList.className = 'text-white space-y-2 overflow-y-auto flex-1 mb-4 md:mb-0';

    chapterData.forEach(chapter => {
        const chapterItem = document.createElement('li');
        chapterItem.className = 'p-2 bg-[#2A2A2A] rounded-md max-w-md flex justify-between items-center';

        const chapterName = document.createElement('span');
        chapterName.className = 'mr-2';
        chapterName.textContent = chapter.name;

        const chapterDate = document.createElement('span');
        chapterDate.className = 'text-gray-400 text-sm';
        chapterDate.textContent = new Date(chapter.date).toLocaleDateString();

        chapterItem.appendChild(chapterName);
        chapterItem.appendChild(chapterDate);
        chaptersList.appendChild(chapterItem);
    });

    textWrapper.appendChild(title);
    textWrapper.appendChild(chaptersList);

    contentWrapper.appendChild(img);
    contentWrapper.appendChild(textWrapper);

    container.appendChild(contentWrapper);

    document.body.appendChild(container);

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

function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

function setupSearch() {
    const searchInput = document.getElementById('search-input');
    const statsElement = document.getElementById('stats');

    searchInput.addEventListener('input', debounce(function () {
        const searchTerm = searchInput.value.trim();
        if (searchTerm.length > 0) {
            statsElement.classList.add('hidden');
            fetch(api + '/search/' + searchTerm)
                .then(response => {
                    if (response.status === 404) {
                        showNoResultsMessage();
                        throw new Error('No results found');
                    }
                    return response.json();
                })
                .then(data => {
                    renderSearchResults(data);
                })
                .catch(error => {
                    console.error(error);
                });
        } else {
            statsElement.classList.remove('hidden');
            resetSearchResults();
            fetchSeries();
        }
    }, 250));
}

function resetSearchResults() {
    const seriesList = document.getElementById('series-list');
    seriesList.innerHTML = `
        <section id="light-novels-list">
            <h2 class="text-2xl mb-2 text-white font-bold">Light Novels</h2>
        </section>
        <section id="manga-list">
            <h2 class="text-2xl mb-2 text-white font-bold">Manga</h2>
        </section>`;
}

function showNoResultsMessage() {
    const seriesList = document.getElementById('series-list');
    seriesList.innerHTML = `
        <section class="bg-[#1F1F1F] rounded-md p-8 mb-4 text-white text-center">
            <h2 class="text-2xl mb-2 font-bold">No results found</h2>
            <p class="text-lg mb-4">Oops! We couldn't find any matches for your search.</p>
            <p class="text-lg">Try searching for something else or check your spelling.</p>
        </section>`;
}

function renderSearchResults(results) {
    let lightNovelsList = document.getElementById('light-novels-list');
    let mangaList = document.getElementById('manga-list');

    if (!lightNovelsList || !mangaList) {
        resetSearchResults();
        lightNovelsList = document.getElementById('light-novels-list');
        mangaList = document.getElementById('manga-list');
    }

    lightNovelsList.innerHTML = '';
    mangaList.innerHTML = '';

    if (results.msg === "No results found") {
        showNoResultsMessage();
        return;
    }

    results.forEach(result => {
        fetch(api + '/series/' + result.series_id)
            .then(response => response.json())
            .then(series => {
                renderSearchSeriesCard(series, result.books);
            });
    });
}

function renderSearchSeriesCard(series, books) {
    const lightNovelsList = document.getElementById('light-novels-list');
    const mangaList = document.getElementById('manga-list');

    if (series.format === 'lightNovel' && !lightNovelsList.querySelector('h2')) {
        const lightNovelsHeader = document.createElement('h2');
        lightNovelsHeader.className = 'text-2xl mb-2 text-white font-bold';
        lightNovelsHeader.textContent = 'Light Novels';
        lightNovelsList.appendChild(lightNovelsHeader);
    } else if (series.format === 'manga' && !mangaList.querySelector('h2')) {
        const mangaHeader = document.createElement('h2');
        mangaHeader.className = 'text-2xl mb-2 text-white font-bold';
        mangaHeader.textContent = 'Manga';
        mangaList.appendChild(mangaHeader);
    }

    const card = document.createElement('div');
    card.className = 'bg-[#1F1F1F] rounded-md p-4 mb-4 cursor-pointer';

    const header = document.createElement('div');
    header.className = 'flex items-center';

    const img = document.createElement('img');
    img.src = series.img ? series.img + '?lowres=true' : cdn + '/images/404.png?lowres=true';
    img.alt = series.name || 'No image';
    img.className = 'h-24 object-cover rounded-md mr-4';

    const content = document.createElement('div');
    content.className = 'flex-1';

    const title = document.createElement('h2');
    title.className = 'text-white text-xl font-bold';
    title.textContent = series.name;

    const status = document.createElement('span');
    status.className = series.finished === 1 ? 'text-green-500' : 'text-red-500';
    status.textContent = series.finished === 1 ? 'Finished' : 'Still reading';

    content.appendChild(title);
    content.appendChild(status);

    header.appendChild(img);
    header.appendChild(content);

    card.appendChild(header);

    const bookList = document.createElement('div');
    bookList.id = 'books-list-' + series.series_id;

    bookList.addEventListener('click', function (event) {
        event.stopPropagation();
    });

    card.appendChild(bookList);

    card.addEventListener('click', function () {
        if (bookList.hasChildNodes()) {
            Array.from(bookList.children).forEach(child => {
                child.classList.add('opacity-0', 'translate-y-4');
                setTimeout(() => {
                    bookList.removeChild(child);
                }, 250);
            });
        } else {
            fetchSearchBooks(books);
        }
    });

    if (series.format === 'lightNovel') {
        lightNovelsList.appendChild(card);
    } else {
        mangaList.appendChild(card);
    }
}

function fetchSearchBooks(data) {
    const bookPromises = data.map(book =>
        fetch(api + '/book/' + book.book_id)
            .then(response => response.json())
            .then(bookData => {
                bookData.chapters = book.chapters;
                return bookData;
            })
    );
    Promise.all(bookPromises)
        .then(bookData => {
            bookData.sort((a, b) => a.startedReading.localeCompare(b.startedReading));
            renderBooksSequentially(bookData);
        });
}

async function renderBooksSequentially(bookData) {
    for (const book of bookData) {
        await renderSearchBookCard(book);
    }
}

async function renderSearchBookCard(book) {
    const booksList = document.getElementById('books-list-' + book.series_id);

    const card = document.createElement('div');
    card.className = 'bg-[#2A2A2A] rounded-md mt-4 flex items-center transition transform duration-500 ease-in-out opacity-0 translate-y-4';

    const img = document.createElement('img');
    img.src = book.img ? book.img + '?lowres=true' : cdn + '/images/404.png?lowres=true';
    img.alt = book.name || 'No image';
    img.className = 'h-24 object-cover rounded-md mr-4';

    const content = document.createElement('div');
    content.className = 'flex-1';

    const title = document.createElement('h2');
    title.className = 'text-white text-lg font-bold';
    title.textContent = book.name;

    let startedDate = new Date(book.startedReading).toLocaleDateString();

    const startedReading = document.createElement('p');
    startedReading.className = 'text-gray-400 text-sm';
    startedReading.textContent = `Started Reading: ${startedDate}`;

    const endedReading = document.createElement('p');
    endedReading.className = 'text-gray-400 text-sm';
    
    if (book.endedReading) {
        const endedDate = new Date(book.endedReading).toLocaleDateString();
        endedReading.textContent = `Ended Reading: ${endedDate}`;
    } else {
        endedReading.textContent = 'Still reading';
    }

    content.appendChild(title);
    content.appendChild(startedReading);
    content.appendChild(endedReading);

    card.appendChild(img);
    card.appendChild(content);

    booksList.appendChild(card);

    requestAnimationFrame(() => {
        card.classList.remove('opacity-0', 'translate-y-4');
    });

    card.addEventListener('click', function () {
        fetchSearchBookData(book.chapters);
    });
}

async function fetchSearchBookData(chapterList) {
    const chapterPromises = chapterList.map(chapter =>
        fetch(api + '/chapter/' + chapter.chapter_id).then(response => response.json())
    );
    const chapterData = await Promise.all(chapterPromises);
    renderSearchBookData(chapterData)
}

async function renderSearchBookData(chapterData) {
    document.body.classList.add('overflow-hidden');

    let searchBook;
    await fetch(api + '/book/' + chapterData[0].book_id)
        .then(response => response.json())
        .then(book => {
            searchBook = book;
        });

    const container = document.createElement('div');
    container.className = 'fixed bottom-0 left-0 w-full h-2/3 md:h-2/3 bg-[#191818] p-6 transform translate-y-full transition-transform duration-500 ease-in-out flex items-center justify-center border-t-4 border-[#2A2A2A] overflow-y-auto md:overflow-hidden';
    container.id = 'book-details-container';

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'flex flex-col md:flex-row h-full';

    const img = document.createElement('img');
    img.src = searchBook.img || cdn + '/images/404.png';
    img.alt = searchBook.name || 'No image';
    img.className = 'object-cover rounded-md mb-4 md:mb-0 md:mr-6 w-full md:w-auto md:max-w-md mx-auto';

    const textWrapper = document.createElement('div');
    textWrapper.className = 'flex-1 flex flex-col h-full';

    const title = document.createElement('h2');
    title.className = 'text-white text-3xl font-bold mb-4';
    title.textContent = searchBook.name;

    const chaptersList = document.createElement('ul');
    chaptersList.className = 'text-white space-y-2 overflow-y-auto flex-1 mb-4 md:mb-0';

    chapterData.forEach(chapter => {
        const chapterItem = document.createElement('li');
        chapterItem.className = 'p-2 bg-[#2A2A2A] rounded-md max-w-md flex justify-between items-center';

        const chapterName = document.createElement('span');
        chapterName.className = 'mr-2';
        chapterName.textContent = chapter.name;

        const chapterDate = document.createElement('span');
        chapterDate.className = 'text-gray-400 text-sm';
        chapterDate.textContent = new Date(chapter.date).toLocaleDateString();

        chapterItem.appendChild(chapterName);
        chapterItem.appendChild(chapterDate);
        chaptersList.appendChild(chapterItem);
    });

    textWrapper.appendChild(title);
    textWrapper.appendChild(chaptersList);

    contentWrapper.appendChild(img);
    contentWrapper.appendChild(textWrapper);

    container.appendChild(contentWrapper);

    document.body.appendChild(container);

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