document.addEventListener('DOMContentLoaded', function () {
    fetchSeriesBooksChapters();
    fetchStats();
    checkLogin();
    setupSearchBar();
});

function fetchSeriesBooksChapters() {
    fetch(api + '/data')
        .then(response => response.json())
        .then(data => {
            const content = document.getElementById('content');
            data.forEach(series => appendSeriesToCategory(series, content));
        })
        .catch(error => {
            const content = document.getElementById('content');
            content.innerHTML = '';
            const errorDiv = createElement(
                'div',
                ['mb-4', 'p-4', 'bg-red-500', 'dark:bg-red-700', 'text-white', 'flex', 'flex-col', 'space-y-1', 'shadow-md', 'rounded-md'],
                { id: 'error' },
                `<p class="font-bold text-md">An error occurred while fetching the data</p>
                 <p class="text-xs">Reloading the page in 5 seconds...</p>`
            );
            content.appendChild(errorDiv);
            console.error(error);
            setTimeout(() => location.reload(), 5000);
        });
}

async function fetchStats() {
    fetch(api + '/stats')
        .then(response => response.json())
        .then(data => {
            const seriesCount = document.getElementById('seriesCount');
            const bookCount = document.getElementById('bookCount');
            const chapterCount = document.getElementById('chapterCount');

            seriesCount.textContent = data.seriesCount;
            bookCount.textContent = data.bookCount;
            chapterCount.textContent = data.chapterCount;
        });
}

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
                const pcElement = document.getElementById('dashboardHref');
                const mobileElement = document.getElementById('dashboardHrefMobile');

                pcElement.href = '/dashboard';
                mobileElement.href = '/dashboard';

            } else {
                deleteCookie('sessionToken');
                window.location.href = '/auth';
            }
        } catch (error) {
            console.error('Login failed:', error);
        }
    }
}

function deleteCookie(name) {
    document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
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

const createElement = (tag, classes = [], attributes = {}, innerHTML = '') => {
    const element = document.createElement(tag);
    classes.forEach(cls => element.classList.add(cls));
    Object.keys(attributes).forEach(attr => element[attr] = attributes[attr]);
    element.innerHTML = innerHTML;
    return element;
};

const createSeriesElement = (series) => {
    const seriesDiv = createElement(
        'div',
        ['series', 'mb-4', 'bg-white', 'dark:bg-gray-800', 'p-2', 'shadow-md', 'rounded-md', 'text-gray-900', 'dark:text-gray-100']
    );

    const seriesInfoDiv = createElement(
        'div',
        ['series-info', 'flex', 'items-center', 'justify-between', 'cursor-pointer', 'space-x-4']
    );

    const seriesName = createElement(
        'h1',
        ['series-name', 'text-lg', 'font-medium', 'flex-1', 'flex', 'items-center', 'ml-2', 'md:ml-4'],
        {},
        `<i class="fas fa-chevron-right chevron mr-2 transition-transform duration-300"></i> ${series.name}`
    );

    const seriesImageContainer = createElement(
        'div',
        ['series-image-container', 'flex-shrink-0']
    );

    const seriesImage = createElement(
        'img',
        ['series-image', 'h-24', 'object-contain', 'shadow-lg', 'transition-transform', 'duration-300', 'rounded-md', 'mr-2', 'md:mr-4'],
        { src: series.img, alt: series.name }
    );

    seriesImageContainer.appendChild(seriesImage);
    seriesInfoDiv.appendChild(seriesName);
    seriesInfoDiv.appendChild(seriesImageContainer);
    seriesDiv.appendChild(seriesInfoDiv);

    series.books.forEach(book => seriesDiv.appendChild(createBookElement(book)));

    seriesInfoDiv.addEventListener('click', () => {
        toggleDisplay(seriesDiv.querySelectorAll('.book'), seriesInfoDiv.querySelector('.chevron'));
    });

    return seriesDiv;
};

const createBookElement = (book) => {
    const bookDiv = createElement(
        'div',
        ['book', 'mt-2', 'bg-gray-100', 'dark:bg-gray-700', 'p-3', 'rounded-md', 'text-gray-800', 'dark:text-gray-200', 'shadow-md'],
        { style: 'display: none' },
        `<h2 class="text-md font-semibold flex items-center"><i class="fas fa-chevron-right chevron mr-2"></i> ${book.name || 'No data'}</h2>
         <p class="text-xs mt-1">Started reading: ${book.startedReading || 'No data'}</p>
         <p class="text-xs">Finished reading: ${book.endedReading || 'No data'}</p>`
    );

    book.chapters.forEach(chapter => bookDiv.appendChild(createChapterElement(chapter)));
    bookDiv.addEventListener('click', (event) => {
        if (!event.target.closest('.chapter')) {
            toggleDisplay(bookDiv.querySelectorAll('.chapter'), bookDiv.querySelector('.chevron'));
        }
    });

    return bookDiv;
};

const createChapterElement = (chapter) => createElement(
    'div',
    ['chapter', 'mt-1', 'bg-gray-200', 'dark:bg-gray-600', 'p-2', 'rounded-md', 'text-gray-700', 'dark:text-gray-300', 'shadow-sm'],
    { style: 'display: none' },
    `<h3 class="text-sm font-semibold">${chapter.name || 'No data'}</h3>
     <p class="text-xs">Date: ${chapter.date || 'No data'}</p>`
);

const appendSeriesToCategory = (series, content) => {
    const seriesTypeMapping = {
        lightNovel: 'Light Novels',
        manga: 'Manga'
    };

    const categoryName = seriesTypeMapping[series.seriesType] || series.seriesType;
    let categoryDiv = document.getElementById(series.seriesType) || createElement('div', [], { id: series.seriesType });
    if (!categoryDiv.parentElement) {
        const categoryTitle = createElement(
            'h1',
            ['text-2xl', 'font-bold', 'text-gray-900', 'dark:text-gray-100', 'mb-2'],
            {},
            categoryName.charAt(0).toUpperCase() + categoryName.slice(1)
        );
        categoryDiv.appendChild(categoryTitle);
        content.appendChild(categoryDiv);
    }
    categoryDiv.appendChild(createSeriesElement(series));
};

const toggleDisplay = (elements, chevron) => {
    elements.forEach(element => {
        element.style.display = element.style.display === 'none' ? 'block' : 'none';
    });
    chevron.classList.toggle('fa-chevron-right');
    chevron.classList.toggle('fa-chevron-down');
};

function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

function setupSearchBar() {
    const searchBar = document.getElementById('searchBar');
    const content = document.getElementById('content');
    const stats = document.getElementById('stats');

    const performSearch = async function () {
        const query = searchBar.value.trim();
        if (query.length > 0) {
            try {
                const response = await fetch(`${api}/search/${query}`);
                if (response.ok) {
                    const data = await response.json();
                    stats.classList.add('hidden');
                    content.innerHTML = '';
                    data.forEach(series => appendSeriesToCategory(series, content));

                    const seriesElements = content.querySelectorAll('.series');
                    seriesElements.forEach(seriesElement => {
                        const chevron = seriesElement.querySelector('.chevron');
                        toggleDisplay(seriesElement.querySelectorAll('.book'), chevron);

                        const bookElements = seriesElement.querySelectorAll('.book');
                        bookElements.forEach(bookElement => {
                            const bookChevron = bookElement.querySelector('.chevron');
                            toggleDisplay(bookElement.querySelectorAll('.chapter'), bookChevron);
                        });
                    });
                } else {
                    stats.classList.add('hidden');
                    content.innerHTML = `
                            <div class="flex flex-col items-center justify-center h-full">
                                <p class="text-red-500 text-lg font-semibold">No results found</p>
                                <p class="text-gray-500">Please try a different search term.</p>
                            </div>`;
                }
            } catch (error) {
                stats.classList.add('hidden');
                content.innerHTML = `
                        <div class="flex flex-col items-center justify-center h-full">
                            <p class="text-red-500 text-lg font-semibold">An error occurred while searching</p>
                            <p class="text-gray-500">Please try again later.</p>
                        </div>`;
            }
        } else {
            content.innerHTML = '';
            stats.classList.remove('hidden');
            fetchSeriesBooksChapters();
        }
    };

    const debouncedSearch = debounce(performSearch, 100);

    searchBar.addEventListener('input', debouncedSearch);
}

const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let konamiIndex = 0;

document.addEventListener('keydown', function(event) {
    if (event.key === konamiCode[konamiIndex]) {
        konamiIndex++;
        if (konamiIndex === konamiCode.length) {
            activateEasterEgg();
            konamiIndex = 0;
        }
    } else {
        konamiIndex = 0;
    }
});

function activateEasterEgg() {
    document.querySelector('nav').innerHTML = '<span class="text-white font-bold">You found Rem!</span>';
    document.querySelector('main').innerHTML = `
        <img src="https://apimdb.maxix.sk/cdn/images/rem-easter-egg.png" class="w-1/2 mx-auto block">
    `;
}