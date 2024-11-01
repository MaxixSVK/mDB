const api = 'https://apimdb.maxix.sk/v2';

document.addEventListener('DOMContentLoaded', function () {
    fetchStats();
    fetchSeries();
    setupSearch();
});

function fetchStats() {
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

    if (!lightNovelsList || !mangaList) {
        console.error('Required list elements are missing.');
        return;
    }

    const card = document.createElement('div');
    card.className = 'bg-[#1F1F1F] rounded-md p-4 mb-4 cursor-pointer';

    const header = document.createElement('div');
    header.className = 'flex items-center';

    const img = document.createElement('img');
    img.src = series.img || 'https://apimdb.maxix.sk/cdn/images/404.png';
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

    if (series.seriesType === 'lightNovel') {
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
            bookData.sort((a, b) => a.name.localeCompare(b.startedReading)); // I WANT TO CHANGE HOW THINGS ARE SORTED IN THE FUTURE
            bookData.forEach(book => {
                renderBookCard(book);
            });
        });
}

function renderBookCard(book) {
    const booksList = document.getElementById('books-list-' + book.series_id);

    if (!booksList) {
        console.error('Required list element is missing.');
        return;
    }

    const card = document.createElement('div');
    card.className = 'bg-[#2A2A2A] rounded-md mt-4 flex items-center transition transform duration-500 ease-in-out opacity-0 translate-y-4';

    const img = document.createElement('img');
    img.src = book.img || 'https://apimdb.maxix.sk/cdn/images/404.png';
    img.alt = book.name || 'No image';
    img.className = 'h-24 object-cover rounded-md mr-4';

    const content = document.createElement('div');
    content.className = 'flex-1';

    const title = document.createElement('h2');
    title.className = 'text-white text-lg font-bold';
    title.textContent = book.name;

    const startedReading = document.createElement('p');
    startedReading.className = 'text-gray-400 text-sm';
    startedReading.textContent = `Started Reading: ${book.startedReading}`;

    const endedReading = document.createElement('p');
    endedReading.className = 'text-gray-400 text-sm';
    endedReading.textContent = `Ended Reading: ${book.endedReading}`;

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
            chapterData.sort((a, b) => a.name.localeCompare(b.name));
            renderBookData(bookData, chapterData);
        });
}

function renderBookData(bookData, chapterData) {
    document.body.classList.add('overflow-hidden');

    const container = document.createElement('div');
    container.className = 'fixed bottom-0 left-0 w-full h-2/3 md:h-2/3 bg-[#191818] p-6 transform translate-y-full transition-transform duration-500 ease-in-out flex items-center justify-center border-t-4 border-[#2A2A2A] overflow-y-auto md:overflow-hidden';
    container.id = 'book-details-container';

    const closeButton = document.createElement('button');
    closeButton.className = 'absolute top-4 right-4 text-white hidden md:block';
    closeButton.textContent = 'X';
    closeButton.addEventListener('click', closeBookDetails);

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'flex flex-col md:flex-row h-full';

    const img = document.createElement('img');
    img.src = bookData.img || 'https://apimdb.maxix.sk/cdn/images/404.png';
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
        chapterItem.className = 'p-2 bg-[#2A2A2A] rounded-md max-w-md';
        chapterItem.textContent = chapter.name;
        chaptersList.appendChild(chapterItem);
    });

    textWrapper.appendChild(title);
    textWrapper.appendChild(chaptersList);

    contentWrapper.appendChild(img);
    contentWrapper.appendChild(textWrapper);

    container.appendChild(closeButton);
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
                .then(response => response.json())
                .then(data => {
                    renderSearchResults(data);
                });
        } else {
            statsElement.classList.remove('hidden');
            document.getElementById('series-list').innerHTML = `
            <section id="light-novels-list">
                    <h2 class="text-2xl mb-2 text-white font-bold">Light Novels</h2>
            </section>
            <section id="manga-list" >
                <h2 class="text-2xl mb-2 text-white font-bold">Manga</h2>
            </section>`;
            fetchSeries();
        }
    }, 100));
}

async function renderSearchResults(results) {
    const lightNovelsList = document.getElementById('light-novels-list');
    const mangaList = document.getElementById('manga-list');

    lightNovelsList.innerHTML = '<h2 class="text-2xl mb-2 text-white font-bold">Light Novels</h2>';
    mangaList.innerHTML = '<h2 class="text-2xl mb-2 text-white font-bold">Manga</h2>';

    if (results.msg === "No results found") {
        document.getElementById('series-list').innerHTML = `
            <section class="bg-[#1F1F1F] rounded-md p-8 mb-4 text-white text-center">
                <h2 class="text-2xl mb-2 font-bold">No results found</h2>
                <p class="text-lg mb-4">Oops! We couldn't find any matches for your search.</p>
                <p class="text-lg">Try searching for something else or check your spelling.</p>
            </section>`;
        return;
    }

    let hasLightNovels = false;
    let hasManga = false;

    const fetchPromises = results.map(result => 
        fetch(api + '/series/' + result.series_id)
            .then(response => response.json())
            .then(series => {
                if (series.seriesType === 'lightNovel') {
                    hasLightNovels = true;
                    renderSeriesCard(series);
                } else if (series.seriesType === 'manga') {
                    hasManga = true;
                    renderSeriesCard(series);
                }
            })
    );

    await Promise.all(fetchPromises);

    if (!hasLightNovels) {
        lightNovelsList.innerHTML = '';
    }
    if (!hasManga) {
        mangaList.innerHTML = '';
    }
}