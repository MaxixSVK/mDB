let user = {};

document.addEventListener("DOMContentLoaded", async () => {
    user = await checkLogin();

    await fetchPublicUsers();
});

async function fetchPublicUsers() {
    try {
        const response = await fetch(api + '/library/explore/users');
        const result = await response.json();

        const publicUsers = Array.isArray(result)
            ? result.filter(publicUser => publicUser.username !== user?.username)
            : [];

        if (publicUsers.length === 0) {
            showNoPublicUsers();
            return;
        }

        showPublicUsers(publicUsers);
    } catch (error) {
        console.error("Error fetching public users:", error);
    }
}

async function showPublicUsers(data) {
    const userHeadElement = document.getElementById('users-head');
    userHeadElement.className = 'bg-[#1F1F1F] rounded-md pt-4 md:pt-6 px-4 md:px-6 mt-4 mx-2 md:mx-4 text-white';

    const title = document.createElement('h1');
    title.className = 'text-2xl md:text-3xl font-bold'
    title.textContent = 'Public Libraries';

    const usersGridElement = document.createElement('div');
    usersGridElement.id = 'users-grid';
    usersGridElement.classList = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';

    userHeadElement.appendChild(title);
    userHeadElement.appendChild(usersGridElement);

    for (const publicUser of data) {
        await createUserCard(publicUser);
    }
}

async function createUserCard(cardUser) {
    const card = document.createElement("div");
    card.className = "bg-[#2A2A2A] rounded-lg p-4 transition duration-300 my-4";

    let stats = null;
    try {
        const statsResponse = await fetch(api + '/library/stats/' + cardUser.id);
        if (statsResponse.ok) {
            const statsResult = await statsResponse.json();
            stats = statsResult
        }
    } catch (error) {
        console.error(`Error fetching stats for user ${cardUser.id}:`, error);
    }

    const hasProfilePicture = cardUser.pfp ? true : false;

    const header = document.createElement('div');
    header.className = 'flex items-center mb-4';

    const avatarWrap = document.createElement('div');
    avatarWrap.className = 'w-12 h-12 rounded-full flex items-center justify-center mr-3';

    if (hasProfilePicture) {
        const avatar = document.createElement('img');
        avatar.src = `${cdn}/users/pfp/u-${cardUser.id}.png`;
        avatar.alt = cardUser.username || 'Unknown User';
        avatar.className = 'w-12 h-12 rounded-full object-cover';
        avatarWrap.appendChild(avatar);
    } else {
        const avatarIcon = document.createElement('i');
        avatarIcon.className = 'fas fa-user text-3xl';
        avatarWrap.appendChild(avatarIcon);
    }

    const userMeta = document.createElement('div');
    userMeta.className = 'flex-1';

    const usernameTitle = document.createElement('h3');
    usernameTitle.className = 'text-lg font-bold text-white';
    usernameTitle.textContent = cardUser.username || 'Unknown User';

    const libraryLabel = document.createElement('p');
    libraryLabel.className = 'text-sm text-gray-400';
    libraryLabel.textContent = 'Public Library';

    userMeta.appendChild(usernameTitle);
    userMeta.appendChild(libraryLabel);

    header.appendChild(avatarWrap);
    header.appendChild(userMeta);
    card.appendChild(header);

    const createStatItem = (value, label, valueClassName) => {
        const item = document.createElement('div');
        item.className = 'text-center bg-[#1F1F1F] p-2 rounded';

        const valueEl = document.createElement('div');
        valueEl.className = valueClassName;
        valueEl.textContent = String(value || 0);

        const labelEl = document.createElement('div');
        labelEl.className = 'text-xs text-gray-400';
        labelEl.textContent = label;

        item.appendChild(valueEl);
        item.appendChild(labelEl);
        return item;
    };

    const primaryStatsGrid = document.createElement('div');
    primaryStatsGrid.className = 'grid grid-cols-3 gap-2 mb-4';
    primaryStatsGrid.appendChild(createStatItem(stats.seriesCount, 'Series', 'text-lg font-bold text-white'));
    primaryStatsGrid.appendChild(createStatItem(stats.bookCount, 'Books', 'text-lg font-bold text-white'));
    primaryStatsGrid.appendChild(createStatItem(stats.chapterCount, 'Chapters', 'text-lg font-bold text-white'));

    const secondaryStatsGrid = document.createElement('div');
    secondaryStatsGrid.className = 'flex gap-2 mb-4';

    const mangaStat = document.createElement('div');
    mangaStat.className = 'flex-1 text-center bg-[#1F1F1F] p-2 rounded';
    const mangaValue = document.createElement('div');
    mangaValue.className = 'text-sm font-bold text-[#FFA500]';
    mangaValue.textContent = String(stats.mangaCount || 0);
    const mangaLabel = document.createElement('div');
    mangaLabel.className = 'text-xs text-gray-400';
    mangaLabel.textContent = 'Manga';
    mangaStat.appendChild(mangaValue);
    mangaStat.appendChild(mangaLabel);

    const lightNovelStat = document.createElement('div');
    lightNovelStat.className = 'flex-1 text-center bg-[#1F1F1F] p-2 rounded';
    const lightNovelValue = document.createElement('div');
    lightNovelValue.className = 'text-sm font-bold text-[#FFA500]';
    lightNovelValue.textContent = String(stats.lightNovelCount || 0);
    const lightNovelLabel = document.createElement('div');
    lightNovelLabel.className = 'text-xs text-gray-400';
    lightNovelLabel.textContent = 'Light Novels';
    lightNovelStat.appendChild(lightNovelValue);
    lightNovelStat.appendChild(lightNovelLabel);

    secondaryStatsGrid.appendChild(mangaStat);
    secondaryStatsGrid.appendChild(lightNovelStat);

    card.appendChild(primaryStatsGrid);
    card.appendChild(secondaryStatsGrid);

    const actionsWrap = document.createElement('div');
    actionsWrap.className = 'flex gap-2';

    const viewButton = document.createElement('button');
    viewButton.type = 'button';
    viewButton.className = 'flex-1 border-2 border-dashed border-[#FFA500] text-white font-semibold py-2 px-4 rounded-lg hover:bg-[#FFA500] hover:text-black transition duration-300';
    viewButton.addEventListener('click', () => window.location.href = `/user/${cardUser.username}`);

    const eyeIcon = document.createElement('i');
    eyeIcon.className = 'fas fa-eye mr-2';

    viewButton.appendChild(eyeIcon);
    viewButton.appendChild(document.createTextNode('View Library'));

    actionsWrap.appendChild(viewButton);
    card.appendChild(actionsWrap);

    const usersGridElement = document.getElementById('users-grid');
    usersGridElement.appendChild(card);
}


function showNoPublicUsers() {
    document.getElementsByTagName('main')[0].classList.remove('bg-[#191818]');

    const noResultsElement = document.getElementById('no-public-users');
    noResultsElement.className = 'flex flex-col justify-center items-center h-full';

    while (noResultsElement.firstChild) {
        noResultsElement.removeChild(noResultsElement.firstChild);
    }

    const container = document.createElement('div');
    container.className = 'bg-[#1F1F1F] rounded-xl shadow-lg p-8 flex flex-col justify-center';

    const title = document.createElement('h1');
    title.className = 'text-3xl font-bold text-white mb-2 text-center';
    title.textContent = 'No Public Libraries Found';

    const description = document.createElement('p');
    description.className = 'text-gray-300 text-center';
    description.appendChild(document.createTextNode('We could not find any public libraries to explore.'));

    const backHomeLink = document.createElement('a');
    backHomeLink.href = '/';
    backHomeLink.className = 'group inline-flex items-center gap-2 text-white transition-colors text-lg font-medium mt-6 self-center';

    const backIcon = document.createElement('i');
    backIcon.className = 'fa-solid fa-arrow-left-long group-hover:-translate-x-1 transition-transform';

    backHomeLink.appendChild(backIcon);
    backHomeLink.appendChild(document.createTextNode('Back Home'));

    container.appendChild(title);
    container.appendChild(description);
    container.appendChild(backHomeLink);

    noResultsElement.appendChild(container);
}
