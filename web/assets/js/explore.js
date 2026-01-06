let gUser = null;

document.addEventListener("DOMContentLoaded", async () => {
    ({ loggedIn } = await checkLogin());
    if (loggedIn) await removeMyProfile();

    const noUsersEl = document.getElementById("no-public-users");
    const usersGridEl = document.getElementById("users-grid");

    try {
        const response = await fetch(api + '/library/explore/users');

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        if (Array.isArray(result) && result.length > 0) {
            usersGridEl.classList.remove("hidden");
            const gridContainer = usersGridEl.querySelector("div");
            for (const user of result) {
                if (user.username !== gUser) {
                    const userCard = await createUserCard(user);
                    gridContainer.appendChild(userCard);
                }
            }
        } else {
            noUsersEl.classList.remove("hidden");
        }
    } catch (error) {
        console.error("Error fetching public users:", error);
    }
});

async function removeMyProfile() {
    const user = await fetch(api + '/account', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'authorization': getCookie('sessionToken')
        },
    });
    const data = await user.json();
    gUser = data.username;
}


async function createUserCard(user) {
    const card = document.createElement("div");
    card.className = "bg-[#2A2A2A] rounded-lg p-4 cursor-pointer hover:bg-[#333333] transition duration-300";

    let stats = null;
    try {
        const statsResponse = await fetch(api + '/library/stats/' + user.id);
        if (statsResponse.ok) {
            const statsResult = await statsResponse.json();
            stats = statsResult
        }
    } catch (error) {
        console.error(`Error fetching stats for user ${user.id}:`, error);
    }

    let hasProfilePicture = false;
    try {
        const pfpResponse = await fetch(cdn + '/users/pfp/' + user.id + '.png');
        const contentType = pfpResponse.headers.get('content-type');
        hasProfilePicture = contentType && contentType.indexOf('application/json') === -1;
    } catch (error) {
        console.error(`Error checking profile picture for user ${user.username}:`, error);
    }

    card.innerHTML = `
        <div class="flex items-center mb-4">
            <div class="w-12 h-12 rounded-full flex items-center justify-center mr-3">
                ${hasProfilePicture
            ? `<img src="${cdn}/users/pfp/${user.id}.png" alt="${user.username}" class="w-12 h-12 rounded-full object-cover">`
            : `<i class="fas fa-user text-3xl"></i>`
        }
            </div>
            <div class="flex-1">
                <h3 class="text-lg font-bold text-white">${user.username || 'Unknown User'}</h3>
                <p class="text-sm text-gray-400">Public Library</p>
            </div>
        </div>
        
        ${stats ? `
        <div class="grid grid-cols-3 gap-2 mb-4">
            <div class="text-center bg-[#1F1F1F] p-2 rounded">
                <div class="text-lg font-bold text-white">${stats.seriesCount || 0}</div>
                <div class="text-xs text-gray-400">Series</div>
            </div>
            <div class="text-center bg-[#1F1F1F] p-2 rounded">
                <div class="text-lg font-bold text-white">${stats.bookCount || 0}</div>
                <div class="text-xs text-gray-400">Books</div>
            </div>
            <div class="text-center bg-[#1F1F1F] p-2 rounded">
                <div class="text-lg font-bold text-white">${stats.chapterCount || 0}</div>
                <div class="text-xs text-gray-400">Chapters</div>
            </div>
        </div>
        
        <div class="flex gap-2 mb-4">
            <div class="flex-1 text-center bg-[#1F1F1F] p-2 rounded">
                <div class="text-sm font-bold text-[#FFA500]">${stats.mangaCount || 0}</div>
                <div class="text-xs text-gray-400">Manga</div>
            </div>
            <div class="flex-1 text-center bg-[#1F1F1F] p-2 rounded">
                <div class="text-sm font-bold text-[#FFA500]">${stats.lightNovelCount || 0}</div>
                <div class="text-xs text-gray-400">Light Novels</div>
            </div>
        </div>
        ` : `
        <div class="text-center py-8 bg-[#1F1F1F] rounded mb-4">
            <div class="text-gray-400 text-sm">Stats unavailable</div>
        </div>
        `}
        
        <div class="flex gap-2">
            <button onclick="viewUserLibrary('${user.username}')" class="flex-1 border-2 border-dashed border-[#FFA500] text-white font-semibold py-2 px-4 rounded-lg hover:bg-[#FFA500] hover:text-black transition duration-300">
                <i class="fas fa-eye mr-2"></i>View Library
            </button>
        </div>
    `;

    return card;
}

function viewUserLibrary(username) {
    window.location.href = `/user/${encodeURIComponent(username)}`;
}