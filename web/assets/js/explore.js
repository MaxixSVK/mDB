document.addEventListener("DOMContentLoaded", () => {
    const main = document.querySelector("main");
    if (main) {
        const wipMsg = document.createElement("div");
        wipMsg.className = "flex flex-col items-center justify-center py-24 text-center";
        wipMsg.innerHTML = `
            <i class="fa-solid fa-hammer text-5xl text-white mb-4"></i>
            <h2 class="text-2xl font-bold text-white mb-2">Work in Progress</h2>
            <p class="text-lg text-gray-300 px-4 mb-6">This page is under construction. Please check back soon!</p>
            <a href="/" class="w-full md:w-auto border-2 border-dashed border-[#FFA500] text-white font-semibold py-2 px-4 rounded-lg hover:bg-[#FFA500] hover:text-black transition duration-300">
                <i class="fa-solid fa-arrow-left mr-2"></i>Go Back
            </a>
        `;
        main.appendChild(wipMsg);
    }
});