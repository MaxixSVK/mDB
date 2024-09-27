const api = 'https://apimdb.maxix.sk';
// const api = 'http://localhost:7000';

document.addEventListener('DOMContentLoaded', function () {
    fetchData(api);
    checkLogin();
    setupSearchBar();
});

const createElement = (tag, classes = [], attributes = {}, innerHTML = '') => {
    const element = document.createElement(tag);
    classes.forEach(cls => element.classList.add(cls));
    Object.keys(attributes).forEach(attr => element[attr] = attributes[attr]);
    element.innerHTML = innerHTML;
    return element;
};

const toggleDisplay = (elements, chevron) => {
    elements.forEach(element => {
        element.style.display = element.style.display === 'none' ? 'block' : 'none';
    });
    chevron.classList.toggle('fa-chevron-right');
    chevron.classList.toggle('fa-chevron-down');
};

const createChapterElement = (chapter) => createElement(
    'div',
    ['chapter', 'mt-1', 'bg-gray-200', 'dark:bg-gray-600', 'p-2', 'rounded-md', 'text-gray-700', 'dark:text-gray-300', 'shadow-sm'],
    { style: 'display: none' },
    `<h3 class="text-sm font-semibold">${chapter.name || 'No data'}</h3>
     <p class="text-xs">Date: ${chapter.date || 'No data'}</p>`
);

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

const seriesTypeMapping = {
    lightNovel: 'Light Novels',
    manga: 'Manga'
};

const appendSeriesToCategory = (series, content) => {
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

function fetchData(api) {
    fetch(api + '/data')
        .then(response => response.json())
        .then(data => {
            const content = document.querySelector('main');
            data.forEach(series => appendSeriesToCategory(series, content));
        })
        .catch(error => {
            const main = document.querySelector('main');
            main.innerHTML = '';
            const errorDiv = createElement(
                'div',
                ['mb-4', 'p-4', 'bg-red-500', 'dark:bg-red-700', 'text-white', 'flex', 'flex-col', 'space-y-1', 'shadow-md', 'rounded-md'],
                { id: 'error' },
                `<p class="font-bold text-md">An error occurred while fetching the data</p>
                 <p class="text-xs">Reloading the page in 5 seconds...</p>`
            );
            main.appendChild(errorDiv);
            console.error(error);
            setTimeout(() => location.reload(), 5000);
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

function setupSearchBar() {
    const searchBar = document.getElementById('searchBar');
    const content = document.querySelector('main');

    searchBar.addEventListener('input', async function () {
        const query = searchBar.value.trim();
        if (query.length > 0) {
            try {
                const response = await fetch(`${api}/search/${query}`);
                if (response.ok) {
                    const data = await response.json();
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
                    content.innerHTML = `
                            <div class="flex flex-col items-center justify-center h-full">
                                <p class="text-red-500 text-lg font-semibold">No results found</p>
                                <p class="text-gray-500">Please try a different search term.</p>
                            </div>`;
                }
            } catch (error) {
                console.error('Search failed:', error);
                content.innerHTML = `
                        <div class="flex flex-col items-center justify-center h-full">
                            <p class="text-red-500 text-lg font-semibold">An error occurred while searching</p>
                            <p class="text-gray-500">Please try again later.</p>
                        </div>`;
            }
        } else {
            content.innerHTML = '';
            fetchData(api);
        }
    });
}

setupSearchBar();