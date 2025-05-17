let userId;

document.addEventListener('DOMContentLoaded', async function () {
    ({ loggedIn, userId } = await checkLogin());
    if (!loggedIn) window.location.href = '/about';

    displayUser(false);
    fetchStats();
    
    document.getElementById('pfp').addEventListener('click', function () {
        window.location.href = '/dashboard';
    });
    document.getElementById('nopfp').addEventListener('click', function () {
        window.location.href = '/dashboard';
    });
});

function fetchStats() {
    document.getElementById('stats').addEventListener('click', function () {
        window.location.href = '/stats';
    });
    fetch(api + '/library/stats/' + userId)
        .then(response => response.json())
        .then(data => {
            if (data.seriesCount === 0) {
                toggleVisibility(document.getElementsByTagName('main')[0], true);
                toggleVisibility(document.getElementById('empty-library'));
                return;
            }
            document.getElementById('series-count').textContent = data.seriesCount;
            document.getElementById('book-count').textContent = data.bookCount;
            document.getElementById('chapter-count').textContent = data.chapterCount;
            setupSearch();
            createFormatLists();
        });
}

function createFormatLists() {
    fetch(api + '/library/series/formats')
        .then(response => response.json()
            .then(data => {
                data.forEach(a => {
                    const existingSection = document.getElementById(a.format);
                    if (existingSection) {
                        existingSection.remove();
                    }

                    const section = document.createElement('section');
                    section.id = a.format;
                    section.className = 'hidden';

                    const header = document.createElement('h2');
                    header.className = 'text-2xl mb-2 text-white font-bold';
                    header.textContent = a.pluralName;

                    section.appendChild(header);
                    document.getElementById('series-list').appendChild(section);
                });
                fetchSeriesList();
            })
        );
}

function showFormatList(formatId) {
    const section = document.getElementById(formatId);
    if (section && section.classList.contains('hidden')) {
        section.classList.remove('hidden');
    }
}

function cleanAllFormatLists() {
    const sections = document.querySelectorAll('#series-list section');
    sections.forEach(section => section.classList.add('hidden'));
    sections.forEach(section => document.querySelectorAll('#' + section.id + ' > div').forEach(div => div.remove()));
}

function getUniqueFormats(seriesData) {
    const formats = seriesData.map(series => series.format);
    return [...new Set(formats)];
}

function fetchSeriesList() {
    fetch(api + '/library/series/u/' + userId)
        .then(response => response.json())
        .then(seriesIds => {
            const seriesPromises = seriesIds.map(seriesId =>
                fetch(api + '/library/series/' + seriesId).then(response => response.json())
            );
            return Promise.all(seriesPromises);
        })
        .then(seriesData => {
            seriesData.sort((a, b) => a.name.localeCompare(b.name));

            const uniqueFormats = getUniqueFormats(seriesData);
            uniqueFormats.forEach(format => showFormatList(format));

            seriesData.forEach(series => {
                renderSeries(series);
            });
        });
}

function renderSeries(series, isSearch) {
    const formatSection = document.getElementById(series.format);

    if (isSearch) {
        showFormatList(series.format);
    }

    const card = document.createElement('div');
    card.className = 'bg-[#1F1F1F] rounded-md p-4 mb-4 cursor-pointer';

    const header = document.createElement('div');
    header.className = 'flex items-center';

    const img = document.createElement('img');
    img.src = series.img ? cdn + '/library/s-' + series.series_id + '.png?q=l' : cdn + '/library/404.png?q=l';
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
    };

    const statusTexts = {
        reading: 'Reading',
        finished: 'Finished',
        stopped: 'Stopped',
        paused: 'Paused',
    };

    const statusClass = statusClasses[series.status];
    const statusText = statusTexts[series.status];

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
            fetchBookList(series.books || series.series_id, isSearch);
        }
    });

    formatSection.appendChild(card);
}

function fetchBookList(data, isSearch) {
    const fetchBookData = (bookId) => fetch(api + '/library/book/' + bookId).then(response => response.json());

    if (isSearch) {
        const bookPromises = data.map(book =>
            fetchBookData(book.book_id).then(bookData => {
                bookData.chapters = book.chapters;
                return bookData;
            })
        );

        Promise.all(bookPromises)
            .then(bookData => {
                bookData.sort((a, b) => a.startedReading.localeCompare(b.startedReading));
                bookData.forEach(book => renderBook(book, true));
            });
    } else {
        fetch(api + '/library/books/' + data)
            .then(response => response.json())
            .then(bookIds => Promise.all(bookIds.map(fetchBookData)))
            .then(bookData => {
                // TODO: if there are no books, show a message saying there are no books in this series
                bookData.sort((a, b) => a.startedReading.localeCompare(b.startedReading));
                bookData.forEach(book => renderBook(book));
            });
    }
}

function renderBook(book, isSearch) {
    const booksList = document.getElementById('books-list-' + book.series_id);

    const card = document.createElement('div');
    card.className = 'bg-[#2A2A2A] rounded-md mt-4 flex items-center transition transform duration-500 ease-in-out opacity-0 translate-y-4';

    const img = document.createElement('img');
    img.src = book.img ? cdn + '/library/b-' + book.book_id + '.png?q=l' : cdn + '/library/404.png?q=l';
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
    startedReading.textContent = `Started on: ${startedDate}`;

    const endedReading = document.createElement('p');
    endedReading.className = 'text-gray-400 text-sm';

    const endedReadingText = book.endedReading
        ? `Ended on: ${new Date(book.endedReading).toLocaleDateString()}`
        : 'Still reading';

    endedReading.textContent = endedReadingText;

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
        fetchBookDetails(book, isSearch);
    });
}

async function fetchBookDetails(book, isSearch) {
    let chapters;

    if (isSearch) {
        const chapterPromises = book.chapters.map(chapter =>
            fetch(api + '/library/chapter/' + chapter.chapter_id).then(response => response.json())
        );
        chapters = await Promise.all(chapterPromises);
    } else {
        const bookPromise = fetch(api + '/library/book/' + book.book_id).then(response => response.json());
        const chaptersPromise = fetch(api + '/library/chapters/' + book.book_id)
            .then(response => response.json())
            .then(chapterIds => {
                const chapterPromises = chapterIds.map(chapterId =>
                    fetch(api + '/library/chapter/' + chapterId).then(response => response.json())
                );
                return Promise.all(chapterPromises);
            });

        [book, chapters] = await Promise.all([bookPromise, chaptersPromise]);
    }

    chapters.sort((a, b) => a.date.localeCompare(b.date));
    renderBookDetails(book, chapters);
}

function renderBookDetails(book, chapters) {
    document.body.classList.add('overflow-hidden');

    const container = document.createElement('div');
    container.className = 'fixed bottom-0 left-0 w-full h-2/3 md:h-2/3 bg-[#191818] p-6 transform translate-y-full transition-transform duration-500 ease-in-out flex items-center justify-center border-t-4 border-[#2A2A2A] overflow-y-auto md:overflow-hidden';
    container.id = 'book-details-container';

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'flex flex-col md:flex-row h-full';

    const img = document.createElement('img');
    img.src = book.img ? cdn + '/library/b-' + book.book_id + '.png' : cdn + '/library/404.png';
    img.alt = book ? book.name : 'No image';
    img.className = 'object-cover rounded-md mb-4 md:mb-0 md:mr-6 w-full md:w-auto md:max-w-md mx-auto';

    const textWrapper = document.createElement('div');
    textWrapper.className = 'flex-1 flex flex-col h-full';

    const title = document.createElement('h2');
    title.className = 'text-white text-3xl font-bold mb-2';
    title.textContent = book.name;

    const datesWrapper = document.createElement('div');
    datesWrapper.className = 'flex flex-col md:flex-row md:items-center mb-4';

    let startedDate = new Date(book.startedReading).toLocaleDateString();
    let endedDate = book.endedReading
        ? new Date(book.endedReading).toLocaleDateString()
        : 'Still reading';

    const readingDates = document.createElement('p');
    readingDates.className = 'text-gray-400 text-sm';
    readingDates.textContent = `${startedDate} - ${endedDate}`;

    datesWrapper.appendChild(readingDates);

    const infoWrapper = document.createElement('div');
    infoWrapper.className = 'flex flex-col md:flex-row md:items-center mb-4 md:mb-0 mt-0 md:mt-2 space-y-4 md:space-y-0 md:space-x-4';

    const authorWrapper = document.createElement('div');
    authorWrapper.className = 'mb-4 md:mb-0 mt-0 md:mt-2';

    const authorLabel = document.createElement('p');
    authorLabel.className = 'text-gray-400 text-sm font-semibold';
    authorLabel.textContent = 'Author:';

    const authorValue = document.createElement('p');
    authorValue.className = 'text-white text-sm';
    authorValue.textContent = book.author_name || 'Not available';

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

    if (chapters.length === 0) {
        const noChaptersMessage = document.createElement('p');
        noChaptersMessage.className = 'text-gray-400 text-center italic';
        noChaptersMessage.textContent = `This book's journey began on ${new Date(book.startedReading).toLocaleDateString()}. The first chapter is still in progress.`;
        chaptersList.appendChild(noChaptersMessage);
    } else {
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
    textWrapper.appendChild(chaptersList);
    textWrapper.appendChild(infoWrapper);

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

function setupSearch() {
    const seriesList = document.getElementById('series-list');
    const searchInput = document.getElementById('search-input');
    const statsElement = document.getElementById('stats');
    const noResultsElement = document.getElementById('no-results');

    searchInput.addEventListener('input', debounce(handleSearchInput, 250));

    function handleSearchInput() {
        const searchTerm = searchInput.value.trim();
        if (searchTerm.length > 0) {
            toggleVisibility(statsElement, true);
            toggleVisibility(noResultsElement, true);
            toggleVisibility(seriesList);
            performSearch(searchTerm);
        } else {
            toggleVisibility(statsElement);
            toggleVisibility(seriesList);
            toggleVisibility(noResultsElement, true);
            createFormatLists();
        }
    }
}

function performSearch(searchTerm) {
    fetch(api + '/library/search/' + userId + '/' + searchTerm)
        .then(response => response.json())
        .then(data => {
            if (data.length === 0) {
                showNoResultsMessage();
                return null;
            }
            if (data) {
                renderSearchResults(data);
            }
        })
        .catch(error => console.error(error));
}

function renderSearchResults(results) {
    cleanAllFormatLists();

    results.forEach(seriesArr => {
        const [series_id, booksArr] = seriesArr;
        fetch(api + '/library/series/' + series_id)
            .then(response => response.json())
            .then(series => {
                series.books = booksArr.map(bookArr => {
                    const [book_id, chaptersArr] = bookArr;
                    return {
                        book_id,
                        chapters: chaptersArr.map(chapter_id => ({ chapter_id }))
                    };
                });
                renderSeries(series, true);
            });
    });
}

function showNoResultsMessage() {
    toggleVisibility(document.getElementById('series-list'), true);
    toggleVisibility(document.getElementById('no-results'));
}

function toggleVisibility(element, hide) {
    if (hide) {
        element.classList.add('hidden');
    } else {
        element.classList.remove('hidden');
    }
}

function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}