// --- GLOBAL STATE ---
let allGames = {};
let settings = {};
let stats = { 
    counts: {}, 
    recent: [],
    ratings: { likes: {}, dislikes: {} },
    reports: {}
};
let localRecent = []; // For storing recently played game IDs locally
let myFavorites = []; // For storing favorite game IDs
let myGameNotes = {}; // For private game notes
let myGameRatings = {}; // For user's own ratings
let hubUser = { nickname: 'Player', avatar: '🎮' };
let currentTheme = 'light';
let isCloaked = false;
let currentTags = [];
let currentGameSort = 'name';
let currentSearchQuery = '';
let currentGameUrl = null;
const NEW_GAME_DAYS = 7;
const ADMIN_PASS = '2025'; // The admin password

// --- LOCALSTORAGE HELPER FUNCTIONS ---
// These are the only data functions needed for a local-only app.

/**
 * Gets and parses data from localStorage.
 * @param {string} key The key to retrieve.
 * @param {*} defaultValue The default value if key doesn't exist or parsing fails.
 * @returns {*} The parsed data or the default value.
 */
function getStorageData(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    try {
        return JSON.parse(raw);
    } catch (e) {
        console.error(`Failed to parse localStorage key "${key}":`, e);
        return defaultValue;
    }
}

/**
 * Stringifies and saves data to localStorage.
 * @param {string} key The key to save.
 * @param {*} data The data to save.
 */
function setStorageData(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error(`Failed to save to localStorage key "${key}":`, e);
    }
}

// --- UTILITIES ---

/**
 * Escapes HTML to prevent XSS.
 * @param {string} s - The string to escape.
 * @returns {string} - The escaped string.
 */
function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Escapes HTML attributes to prevent XSS.
 * @param {string} s - The string to escape.
 * @returns {string} - The escaped string.
 */
function escapeHtmlAttr(s) {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}


/**
 * This function waits for the HTML document to be fully loaded
 * before running any code that interacts with it. This fixes the
 * "Cannot set properties of null" error.
 */
document.addEventListener('DOMContentLoaded', () => {

    // --- DOM ELEMENTS ---
    // All element selections are now safely inside the listener
    const $ = document.getElementById.bind(document);
    const doc = document.documentElement;

    // App Wrappers
    const appWrapper = $("appWrapper");
    const favicon = $("favicon");

    // Nav
    const desktopNav = $("desktopNav");
    const mobileNav = $("mobileNav");
    const mobileMenuButton = $("mobileMenuButton");
    const gameSectionsContainer = $("gameSectionsContainer");

    // Auth
    const authStatus = $("authStatus");
    const authMessage = $("authMessage");
    const themeToggle = $("themeToggle"); 
    const userProfileButton = $("userProfileButton");
    const userProfileAvatar = $("userProfileAvatar");
    const userProfileName = $("userProfileName");

    // Pages
    const loadingModal = $("loadingModal");
    const pages = document.querySelectorAll(".page");
    const pageHome = $("page-home");

    // Home
    const homeDesc = $("homeDesc");
    const featuredGameContainer = $("featuredGameContainer");
    const recentlyPlayedGrid = $("recentlyPlayedGrid");

    // Favorites
    const favoritesGrid = $("favoritesGrid");
    const pageFavorites = $("page-favorites");

    // Tags Page
    const pageTags = $("page-tags");
    const tagsPageGrid = $("tagsPageGrid");

    // Admin
    const adminPanel = $("page-admin");
    const adminLogin = $("adminLogin");
    const adminPasswordInput = $("adminPasswordInput");
    const adminLoginBtn = $("adminLoginBtn");
    const adminTools = $("adminTools");

    // Admin Form
    const gameForm = $("gameForm");
    const gameIdInput = $("gameIdInput");
    const gameTitleInput = $("gameTitleInput");
    const gameSectionInput = $("gameSectionInput");
    const gameDescriptionInput = $("gameDescriptionInput");
    const gameTagsInput = $("gameTagsInput");
    const gameUrlInput = $("gameUrlInput");
    const saveGameBtn = $("saveGameBtn");
    const clearFormBtn = $("clearFormBtn"); // This was the button causing the error!
    const existingGamesList = $("existingGamesList");

    // Admin Data
    const exportDataBtn = $("exportDataBtn");
    const importDataBtn = $("importDataBtn");
    const importFileInput = $("importFileInput");

    // Alert Modal
    const alertModal = $("customModalContainer"); // Changed to new ID

    // Game Modal
    const gameModal = $("gameModal");
    const modalGameTitle = $("modalGameTitle");
    const gameIframe = $("gameIframe");
    const modalCloseBtn = $("modalCloseBtn");
    const modalNewWindowBtn = $("modalNewWindowBtn");
    const modalLikeBtn = $("modalLikeBtn");
    const modalDislikeBtn = $("modalDislikeBtn");
    const modalFavoriteBtn = $("modalFavoriteBtn");
    const likeCountSpan = $("likeCount");
    const dislikeCountSpan = $("dislikeCount");

    // User Profile Modal
    const userProfileModal = $("userProfileModal");
    const userNicknameInput = $("userNicknameInput");
    const userAvatarGrid = $("userAvatarGrid");
    const userProfileSaveBtn = $("userProfileSaveBtn");
    const userProfileCancelBtn = $("userProfileCancelBtn");

    // Settings Modal
    const settingsModal = $("settingsModal");
    const settingsButton = $("settingsButton");
    const settingsSaveBtn = $("settingsSaveBtn");
    const hubDescriptionInput = $("hubDescriptionInput");
    const cloakTitleInput = $("cloakTitleInput");
    const cloakFaviconInput = $("cloakFaviconInput");
    const saveCloakSettingsBtn = $("saveCloakSettingsBtn");
    const panicButton = $("panicButton");
    
    // --- CUSTOM ALERT/CONFIRM ---

    /** Creates and displays a custom non-blocking alert modal */
    function customAlert(message, title = "Info", type = "info") {
        if (!alertModal) return;

        let icon = '';
        let bgColor = '';
        let textColor = '';
        
        switch (type) {
            case 'success':
                icon = '<i data-lucide="check-circle" class="w-6 h-6"></i>';
                bgColor = 'bg-green-600';
                textColor = 'text-green-50';
                break;
            case 'error':
                icon = '<i data-lucide="x-octagon" class="w-6 h-6"></i>';
                bgColor = 'bg-red-600';
                textColor = 'text-red-50';
                break;
            case 'warning':
                icon = '<i data-lucide="alert-triangle" class="w-6 h-6"></i>';
                bgColor = 'bg-yellow-600';
                textColor = 'text-yellow-50';
                break;
            default:
                icon = '<i data-lucide="info" class="w-6 h-6"></i>';
                bgColor = 'bg-accent';
                textColor = 'text-white';
                break;
        }

        const modalHTML = `
            <div class="modal-content w-full max-w-sm p-4 ${bgColor} ${textColor} rounded-xl shadow-2xl animate-fade-in">
                <div class="flex items-start">
                    <div class="mr-3">${icon}</div>
                    <div class="flex-grow">
                        <h4 class="text-lg font-bold">${title}</h4>
                        <p class="mt-1 text-sm">${message}</p>
                    </div>
                    <button class="modal-close-btn p-1 ml-4 rounded-full hover:bg-black hover:bg-opacity-10 transition duration-150">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>
                ${type === 'confirm' ? `
                    <div class="flex justify-end mt-4 space-x-2">
                        <button class="confirm-yes-btn px-4 py-1 text-sm font-semibold bg-white text-gray-800 rounded-lg hover:bg-gray-100">Yes</button>
                        <button class="confirm-no-btn px-4 py-1 text-sm font-semibold bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400">No</button>
                    </div>
                ` : ''}
            </div>
        `;
        
        const modalDiv = document.createElement('div');
        modalDiv.innerHTML = modalHTML;
        alertModal.appendChild(modalDiv);
        alertModal.classList.remove('hidden');
        lucide.createIcons();

        const close = () => {
            const content = modalDiv.querySelector('.modal-content');
            if (content) {
                content.classList.add('animate-fade-out');
                content.addEventListener('animationend', () => {
                    modalDiv.remove();
                    if (alertModal.children.length === 0) {
                        alertModal.classList.add('hidden');
                    }
                }, { once: true });
            } else {
                 modalDiv.remove();
                 if (alertModal.children.length === 0) {
                        alertModal.classList.add('hidden');
                 }
            }
        };

        modalDiv.querySelector('.modal-close-btn')?.addEventListener('click', close);

        return new Promise((resolve) => {
            if (type === 'confirm') {
                modalDiv.querySelector('.confirm-yes-btn')?.addEventListener('click', () => { close(); resolve(true); });
                modalDiv.querySelector('.confirm-no-btn')?.addEventListener('click', () => { close(); resolve(false); });
            } else {
                setTimeout(close, 3000);
                resolve(true); // Resolve for non-confirm alerts
            }
        });
    }

    // --- THEME FUNCTIONS (Added back in) ---

    /**
     * Applies the theme (light/dark) to the <html> tag.
     * @param {'light'|'dark'} theme - The theme to apply.
     * @param {boolean} [isInitialLoad=false] - Whether this is the first load.
     */
    function applyTheme(theme, isInitialLoad = false) {
        if (theme === 'dark') {
            doc.classList.add('dark');
        } else {
            doc.classList.remove('dark');
        }
        // Update the icon *unless* it's the first page load
        if (!isInitialLoad) {
            updateThemeToggleUI(theme);
        }
    }

    /**
     * Updates the theme toggle button's icon based on the current theme.
     */
    function updateThemeToggleUI(theme) {
        const themeToUse = theme || currentTheme;
        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            if (icon) {
                if (themeToUse === 'dark') {
                    icon.setAttribute('data-lucide', 'moon');
                } else {
                    icon.setAttribute('data-lucide', 'sun');
                }
                lucide.createIcons(); // Redraw the icon
            }
        }
    }

    /**
     * Toggles the theme between light and dark and saves the preference.
     */
    function toggleTheme() {
        currentTheme = currentTheme === 'light' ? 'dark' : 'light';
        setStorageData('currentTheme', currentTheme);
        applyTheme(currentTheme, false); // 'false' = this is not the initial load
    }


    // --- INITIALIZATION ---

    /**
     * Main entry point. Loads data from localStorage and renders the app.
     */
    function initialize() {
        // Load all data from localStorage
        settings = getStorageData('hubSettings', {
            hubDescription: 'Welcome! Use the Admin panel to set this description.',
            accentColor: 'blue',
            cloakTitle: 'Google Drive',
            cloakFavicon: '📚'
        });
        allGames = getStorageData('hubGames', {});
        stats = getStorageData('hubStats', { 
            counts: {}, 
            recent: [],
            ratings: { likes: {}, dislikes: {} },
            reports: {}
        });
        // Ensure new properties exist if loading old data
        stats.ratings = stats.ratings || { likes: {}, dislikes: {} };
        stats.reports = stats.reports || {};

        myFavorites = getStorageData('myFavorites', []); 
        myGameRatings = getStorageData('myGameRatings', {});
        hubUser = getStorageData('hubUser', { nickname: 'Player', avatar: '🎮' });
        
        loadLocalRecent(); // This already uses localStorage

        // Load and apply theme
        currentTheme = getStorageData('currentTheme', 'light');
        applyTheme(currentTheme, true); // true = on initial load
        updateThemeToggleUI(); // Set the icon correctly on load

        // Render user profile button
        renderUserProfile();

        // Update "auth" status (it's just "local" now)
        authMessage.textContent = `Local Storage`;
        authStatus.classList.remove('bg-gray-100', 'dark:bg-gray-700');
        authStatus.classList.add('bg-blue-100', 'text-blue-700', 'dark:bg-blue-900', 'dark:text-blue-300');

        // Render everything
        applySettings(); // Apply settings first
        renderAll();
        
        loadingModal.style.display = 'none'; // Hide loading screen
        console.log("App initialized successfully.");
    }

    // --- RENDER FUNCTIONS ---

    /**
     * Main render loop. Calls all necessary sub-render functions.
     */
    function renderAll() {
        renderNavigation();
        renderFeaturedGame();
        renderGameSections();
        renderFavoritesPage(); 
        renderTagsPage();
        renderAdminList();
        renderRecentlyPlayed();
        lucide.createIcons(); // Redraw all icons
    }

    /**
     * Applies global settings to the UI (color, home description).
     */
    function applySettings() {
        homeDesc.textContent = settings.hubDescription || 'Loading...';
        hubDescriptionInput.value = settings.hubDescription || '';
        
        // Panic settings
        cloakTitleInput.value = settings.cloakTitle || 'Google Drive';
        cloakFaviconInput.value = settings.cloakFavicon || '📚';
        
        applyThemeColor(settings.accentColor || 'blue');
    }

    function renderNavigation() {
        if (!desktopNav || !mobileNav) return;

        const navItems = [
            { id: 'home', name: 'Home', icon: 'home' },
            { id: 'favorites', name: 'Favorites', icon: 'heart' },
            { id: 'tags', name: 'Tags', icon: 'tag' }
        ];

        const isAdmin = getStorageData('isAdmin', false);
        if (isAdmin) {
            navItems.push({ id: 'admin', name: 'Admin', icon: 'lock' });
        }

        desktopNav.innerHTML = '';
        const mobileNavContainer = mobileNav.querySelector('.flex-col');
        if (mobileNavContainer) mobileNavContainer.innerHTML = '';

        const currentSection = document.querySelector('.page:not([style*="display:none"])')?.id.replace('page-', '') || 'home';

        navItems.forEach(item => {
            const isActive = item.id === currentSection;
            const buttonClass = `flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-150 page-link ${
                isActive
                    ? 'bg-accent text-white shadow-md hover:bg-opacity-90'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`;
            
            const btnHTML = `<i data-lucide="${item.icon}" class="w-5 h-5"></i><span>${item.name}</span>`;
            
            const deskBtn = document.createElement('button');
            deskBtn.className = buttonClass;
            deskBtn.dataset.page = item.id;
            deskBtn.innerHTML = btnHTML;
            desktopNav.appendChild(deskBtn);

            const mobileBtn = document.createElement('button');
            mobileBtn.className = buttonClass + ' w-full justify-start';
            mobileBtn.dataset.page = item.id;
            mobileBtn.innerHTML = btnHTML;
            if (mobileNavContainer) mobileNavContainer.appendChild(mobileBtn);
        });

        lucide.createIcons();
    }
    
    function switchPage(pageId) {
        pages.forEach(page => page.style.display = 'none');
        
        const targetPage = $(`page-${pageId}`);
        if (targetPage) {
            targetPage.style.display = 'block';
        } else {
            pageHome.style.display = 'block';
        }
        
        renderNavigation();
        
        if (mobileNav) mobileNav.classList.add('hidden');
        
        if (pageId === 'favorites') renderFavoritesPage();
        else if (pageId === 'tags') renderTagsPage();
        else if (pageId === 'admin') {
            const isAdmin = getStorageData('isAdmin', false);
            if (adminLogin) adminLogin.classList.toggle('hidden', isAdmin);
            if (adminTools) adminTools.classList.toggle('hidden', !isAdmin);
            if (isAdmin) renderAdminList();
        }
    }
    
    function renderGameCard(gameId, isFeatured = false) {
        const game = allGames[gameId];
        if (!game) return '';

        const isFav = myFavorites.includes(gameId);
        const userRating = myGameRatings[gameId];
        const isLiked = userRating === 'like';
        const isDisliked = userRating === 'dislike';
        
        const gameCreatedDate = new Date(game.created || '2000-01-01');
        const isNew = (new Date() - gameCreatedDate) / (1000 * 60 * 60 * 24) < NEW_GAME_DAYS;

        const likeCount = stats.ratings.likes[gameId] || 0;
        const dislikeCount = stats.ratings.dislikes[gameId] || 0;

        const sizeClasses = isFeatured 
            ? 'col-span-1 md:col-span-3 lg:col-span-5 flex-col md:flex-row' 
            : 'flex-col';
        const bgClasses = isFeatured 
            ? 'bg-gradient-to-br from-accent/10 to-transparent dark:from-accent/20' 
            : 'bg-white dark:bg-gray-800 hover:shadow-xl';
        
        const imagePlaceholder = escapeHtml(game.title.substring(0, 1).toUpperCase());
        const tags = (game.tags || '').split(',').filter(t => t.trim());

        return `
            <div data-game-id="${gameId}" class="game-card flex ${sizeClasses} p-4 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg transition-all duration-300 cursor-pointer ${bgClasses}">
                <div class="relative flex items-center justify-center ${isFeatured ? 'w-full h-40 md:w-60 md:h-full' : 'w-full h-40'} flex-shrink-0 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                    <span class="text-6xl font-extrabold text-gray-500 dark:text-gray-400 opacity-70">
                        ${imagePlaceholder}
                    </span>
                    ${isNew ? '<span class="absolute top-2 right-2 px-2 py-1 text-xs font-bold text-white bg-green-500 rounded-full">NEW</span>' : ''}
                </div>
                
                <div class="flex flex-col ${isFeatured ? 'p-4 md:p-6 md:ml-6' : 'mt-4 w-full'}">
                    <div class="flex justify-between items-center">
                        <h3 class="text-xl font-bold truncate ${isFeatured ? 'text-accent' : ''}">${escapeHtml(game.title)}</h3>
                        <button class="favorite-toggle-btn p-1 text-yellow-500 hover:text-yellow-400" data-game-id="${gameId}" title="${isFav ? 'Remove from Favorites' : 'Add to Favorites'}">
                            <i data-lucide="${isFav ? 'star' : 'star'}" class="w-5 h-5 ${isFav ? 'fill-yellow-500' : ''}"></i>
                        </button>
                    </div>
                    
                    <p class="mt-2 text-sm text-gray-600 dark:text-gray-400 ${isFeatured ? 'line-clamp-4' : 'line-clamp-2'}">${escapeHtml(game.description || 'No description provided.')}</p>
                    
                    <div class="flex flex-wrap gap-2 mt-3">
                        ${tags.map(tag => `
                            <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 tag-filter-btn cursor-pointer" data-tag="${escapeHtmlAttr(tag.trim())}">${escapeHtml(tag.trim())}</span>
                        `).join('')}
                    </div>

                    <div class="flex items-center justify-between mt-4 border-t border-gray-100 dark:border-gray-700 pt-3 text-xs text-gray-500 dark:text-gray-400">
                        <div class="flex items-center space-x-3">
                            <div class="flex items-center text-green-500">
                                <i data-lucide="thumbs-up" class="w-4 h-4 mr-1 ${isLiked ? 'fill-green-500' : ''}"></i>
                                <span class="font-bold">${likeCount}</span>
                            </div>
                            <div class="flex items-center text-red-500">
                                <i data-lucide="thumbs-down" class="w-4 h-4 mr-1 ${isDisliked ? 'fill-red-500' : ''}"></i>
                                <span class="font-bold">${dislikeCount}</span>
                            </div>
                        </div>
                        <span>Section: ${escapeHtml(game.section.toUpperCase())}</span>
                    </div>
                </div>
            </div>
        `;
    }

    function renderGameSections() {
        if (!gameSectionsContainer) return;
        gameSectionsContainer.innerHTML = '';
        const sections = {};
        Object.values(allGames).forEach(game => {
            if (!sections[game.section]) sections[game.section] = [];
            sections[game.section].push(game);
        });

        const sectionTitles = {
            'popular': '🔥 Popular Picks',
            'new': '✨ New Games',
            'action': '💥 Action & Adventure',
            'puzzle': '🧩 Puzzle & Logic',
        };

        Object.keys(sectionTitles).forEach(sectionKey => {
            const games = sections[sectionKey] || [];
            if (games.length > 0) {
                games.sort((a, b) => a.title.localeCompare(b.title));
                const sectionHTML = `
                    <section id="section-${sectionKey}" class="mt-8">
                        <h2 class="text-3xl font-bold text-gray-900 dark:text-white">${sectionTitles[sectionKey]}</h2>
                        <div class="grid grid-cols-1 gap-6 mt-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                            ${games.map(game => renderGameCard(game.id)).join('')}
                        </div>
                    </section>
                `;
                gameSectionsContainer.innerHTML += sectionHTML;
            }
        });
    }

    function renderFeaturedGame() {
        if (!featuredGameContainer) return;
        const sortedGames = Object.values(allGames).sort((a, b) => new Date(b.created || 0) - new Date(a.created || 0));
        if (sortedGames.length > 0) {
            featuredGameContainer.innerHTML = `
                <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Featured Game of the Week</h2>
                <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    ${renderGameCard(sortedGames[0].id, true)}
                </div>
            `;
        } else {
            featuredGameContainer.innerHTML = '';
        }
    }

    function renderRecentlyPlayed() {
        if (!recentlyPlayedGrid) return;
        const recentGames = localRecent.filter(id => allGames[id]).slice(0, 5);
        if (recentGames.length === 0) {
            recentlyPlayedGrid.innerHTML = '<p class="text-gray-500 dark:text-gray-400 col-span-5">No games played recently. Start playing!</p>';
            return;
        }
        recentlyPlayedGrid.innerHTML = recentGames.map(id => renderGameCard(id)).join('');
    }

    function renderFavoritesPage() {
        if (!favoritesGrid) return;
        const favoriteGames = myFavorites.map(id => allGames[id]).filter(Boolean).sort((a, b) => a.title.localeCompare(b.title));
        if (favoriteGames.length === 0) {
            favoritesGrid.innerHTML = '<p class="text-gray-500 dark:text-gray-400 col-span-5">You haven\'t added any favorites yet. Click the ⭐ on a game card to save it here!</p>';
            return;
        }
        favoritesGrid.innerHTML = favoriteGames.map(game => renderGameCard(game.id)).join('');
    }

    function renderTagsPage() {
        if (!tagsPageGrid) return;
        const uniqueTags = new Set();
        Object.values(allGames).forEach(game => {
            (game.tags || '').split(',').forEach(tag => {
                const trimmedTag = tag.trim();
                if (trimmedTag) uniqueTags.add(trimmedTag);
            });
        });
        if (uniqueTags.size === 0) {
            tagsPageGrid.innerHTML = '<p class="text-gray-500 dark:text-gray-400">No tags found.</p>';
            return;
        }
        tagsPageGrid.innerHTML = Array.from(uniqueTags).sort().map(tag => `
            <button class="px-3 py-1 text-sm font-medium rounded-full bg-accent/20 text-accent dark:bg-accent/40 dark:text-white hover:bg-accent hover:text-white transition-colors duration-150 tag-filter-btn" data-tag="${escapeHtmlAttr(tag)}">
                #${escapeHtml(tag)}
            </button>
        `).join('');
    }

    function renderAdminList() {
        if (!existingGamesList) return;
        const gamesArray = Object.values(allGames).sort((a, b) => a.title.localeCompare(b.title));
        if (gamesArray.length === 0) {
            existingGamesList.innerHTML = '<p class="text-gray-500 dark:text-gray-400">No games currently in the hub.</p>';
            return;
        }
        existingGamesList.innerHTML = gamesArray.map(game => `
            <div class="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700">
                <span class="text-sm font-medium truncate">${escapeHtml(game.title)}</span>
                <div class="flex space-x-2">
                    <button data-game-id="${game.id}" class="admin-edit-btn p-1 text-blue-500 hover:text-blue-400" title="Edit Game">
                        <i data-lucide="pencil" class="w-4 h-4"></i>
                    </button>
                    <button data-game-id="${game.id}" class="admin-delete-btn p-1 text-red-500 hover:text-red-400" title="Delete Game">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        `).join('');
        lucide.createIcons();
    }

    // --- GAME MODAL LOGIC ---

    function updateGameStats(gameId, type) {
        if (!allGames[gameId]) return;

        const currentRating = myGameRatings[gameId];
        let newRating = null;

        if (type === 'like') {
            newRating = currentRating === 'like' ? null : 'like';
        } else if (type === 'dislike') {
            newRating = currentRating === 'dislike' ? null : 'dislike';
        }

        // Decrement old count
        if (currentRating === 'like') {
            stats.ratings.likes[gameId] = (stats.ratings.likes[gameId] || 1) - 1;
        } else if (currentRating === 'dislike') {
            stats.ratings.dislikes[gameId] = (stats.ratings.dislikes[gameId] || 1) - 1;
        }

        // Increment new count
        if (newRating === 'like') {
            stats.ratings.likes[gameId] = (stats.ratings.likes[gameId] || 0) + 1;
        } else if (newRating === 'dislike') {
            stats.ratings.dislikes[gameId] = (stats.ratings.dislikes[gameId] || 0) + 1;
        }

        // Update user's private rating
        if (newRating) {
            myGameRatings[gameId] = newRating;
        } else {
            delete myGameRatings[gameId];
        }
        
        setStorageData('myGameRatings', myGameRatings);
        setStorageData('hubStats', stats);
        
        // Re-render modal stats and game card
        updateModalStatsUI(gameId);
        renderAll(); // Full re-render to update card
    }

    function updateModalStatsUI(gameId) {
        if (!gameId) return;
        
        likeCountSpan.textContent = stats.ratings.likes[gameId] || 0;
        dislikeCountSpan.textContent = stats.ratings.dislikes[gameId] || 0;

        const userRating = myGameRatings[gameId];
        const isFav = myFavorites.includes(gameId);

        modalLikeBtn.querySelector('i').classList.toggle('fill-green-500', userRating === 'like');
        modalDislikeBtn.querySelector('i').classList.toggle('fill-red-500', userRating === 'dislike');
        modalFavoriteBtn.querySelector('i').classList.toggle('fill-yellow-500', isFav);
    }
    
    function extractGameIdFromIframe() {
        if (gameIframe && gameIframe.dataset.gameId) {
            return gameIframe.dataset.gameId;
        }
        return null;
    }

    function openGameModal(gameId) {
        const game = allGames[gameId];
        if (!game || !gameModal || !modalGameTitle || !gameIframe) return;

        currentGameUrl = game.url;
        modalGameTitle.textContent = game.title;
        gameIframe.src = game.url;
        gameIframe.dataset.gameId = gameId; // Store the ID on the iframe
        gameModal.classList.remove('hidden');

        updateModalStatsUI(gameId);
        
        localRecent = localRecent.filter(id => id !== gameId);
        localRecent.unshift(gameId);
        setStorageData('localRecent', localRecent);
        
        renderRecentlyPlayed(); // Update recent list immediately
    }

    function closeGameModal() {
        if (!gameModal || !gameIframe) return;
        gameModal.classList.add('hidden');
        gameIframe.src = ''; // Stop the game/audio
        gameIframe.dataset.gameId = '';
        currentGameUrl = null;
    }

    // --- HELPER FUNCTIONS ---

    function loadLocalRecent() {
        localRecent = getStorageData('localRecent', []);
    }

    function toggleFavorite(gameId) {
        if (!gameId) return;
        const index = myFavorites.indexOf(gameId);
        if (index > -1) {
            myFavorites.splice(index, 1);
            customAlert('Removed from Favorites!', 'Removed', 'info');
        } else {
            myFavorites.push(gameId);
            customAlert('Added to Favorites!', 'Favorite', 'success');
        }
        setStorageData('myFavorites', myFavorites);
        
        // Re-render UI
        updateModalStatsUI(gameId);
        renderAll();
    }
    
    function handleAdminLogin() {
        if (adminPasswordInput.value === ADMIN_PASS) {
            setStorageData('isAdmin', true);
            adminLogin.classList.add('hidden');
            adminTools.classList.remove('hidden');
            customAlert('Admin access granted!', 'Success', 'success');
            renderNavigation();
            renderAdminList();
        } else {
            customAlert('Incorrect password.', 'Denied', 'error');
        }
    }

    function clearAddForm() {
        gameIdInput.value = '';
        gameTitleInput.value = '';
        gameUrlInput.value = '';
        gameDescriptionInput.value = '';
        gameTagsInput.value = '';
        gameSectionInput.value = 'popular';
        gameIdInput.classList.add('bg-gray-100');
        gameIdInput.readOnly = true;
    }

    async function saveGame() {
        const id = gameIdInput.value;
        const title = gameTitleInput.value.trim();
        const url = gameUrlInput.value.trim();
        const description = gameDescriptionInput.value.trim();
        const tags = gameTagsInput.value.trim();
        const section = gameSectionInput.value;

        if (!title || !url || !section) {
            customAlert("Title, URL, and Section are required.", "Error", "error");
            return;
        }

        const gameData = { title, url, description, tags, section, created: new Date().toISOString() };
        
        if (id) {
            // Update existing game
            allGames[id] = { ...allGames[id], ...gameData, created: allGames[id].created }; // Keep original created date
            customAlert(`Game "${title}" updated!`, "Success", "success");
        } else {
            // Add new game
            const newId = `g_${new Date().getTime()}`;
            allGames[newId] = { id: newId, ...gameData };
            customAlert(`Game "${title}" added!`, "Success", "success");
        }
        
        setStorageData('hubGames', allGames);
        renderAll();
        clearAddForm();
    }

    function editGame(gameId) {
        const game = allGames[gameId];
        if (!game) return;
        
        gameIdInput.value = game.id;
        gameTitleInput.value = game.title;
        gameUrlInput.value = game.url;
        gameDescriptionInput.value = game.description || '';
        gameTagsInput.value = game.tags || '';
        gameSectionInput.value = game.section;

        gameIdInput.readOnly = false;
        gameIdInput.classList.remove('bg-gray-100');
        switchPage('admin'); // Switch to admin page
        gameTitleInput.focus(); // Focus the title for editing
    }

    async function deleteGame(gameId) {
        if (!gameId || !allGames[gameId]) return;

        const confirmed = await customAlert(`Are you sure you want to delete "${allGames[gameId].title}"?`, "Confirm Deletion", "confirm");
        
        if (confirmed) {
            delete allGames[gameId];
            setStorageData('hubGames', allGames);
            
            // Clean up stats
            delete stats.counts[gameId];
            delete stats.ratings.likes[gameId];
            delete stats.ratings.dislikes[gameId];
            setStorageData('hubStats', stats);
            
            // Clean up user data
            myFavorites = myFavorites.filter(id => id !== gameId);
            setStorageData('myFavorites', myFavorites);
            delete myGameRatings[gameId];
            setStorageData('myGameRatings', myGameRatings);

            customAlert('Game deleted successfully!', 'Success', 'success');
            renderAll();
        }
    }

    function exportData() {
        const dataToExport = {
            hubGames: allGames,
            hubSettings: settings,
            hubStats: stats
        };
        const jsonString = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `unblocked_hub_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        customAlert('Data export started!', 'Exporting', 'info');
    }

    async function importData(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                let gameCount = 0;

                if (data.hubGames) {
                    allGames = { ...allGames, ...data.hubGames };
                    setStorageData('hubGames', allGames);
                    gameCount = Object.keys(data.hubGames).length;
                }
                if (data.hubSettings) {
                    settings = { ...settings, ...data.hubSettings };
                    setStorageData('hubSettings', settings);
                    applySettings(); // Re-apply new settings
                }
                if (data.hubStats) {
                    stats = { ...stats, ...data.hubStats };
                    setStorageData('hubStats', stats);
                }

                customAlert(`Import successful! ${gameCount} games processed.`, "Success", "success");
                renderAll();

            } catch (err) {
                console.error("Error during data import:", err);
                customAlert(`Failed to import data: ${err.message}`, "Error", "error");
            }
        };
        reader.readAsText(file);
    }

    function handlePanic() {
        const newTitle = settings.cloakTitle || 'Google Drive';
        const newFavicon = settings.cloakFavicon || '📚';
        
        if (!isCloaked) {
            document.title = newTitle;
            favicon.href = newFavicon; // You can't easily change emoji favicons, but this would work for URLs
            appWrapper.style.display = 'none';
            isCloaked = true;
            // We can't use customAlert if the appWrapper is hidden
            // This will just happen silently
        } else {
            document.title = 'Unblocked Game Hub';
            favicon.href = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🎮</text></svg>';
            appWrapper.style.display = 'flex';
            isCloaked = false;
        }
    }
    
    function saveCloakSettings() {
        settings.cloakTitle = cloakTitleInput.value.trim();
        settings.cloakFavicon = cloakFaviconInput.value.trim();
        setStorageData('hubSettings', settings);
        customAlert('Cloak settings saved!', 'Settings Updated', 'success');
    }

    function updateUserProfileUI() {
        userProfileAvatar.textContent = hubUser.avatar;
        userProfileName.textContent = hubUser.nickname;
    }

    function openUserProfileModal() {
        userNicknameInput.value = hubUser.nickname;
        userProfileModal.classList.remove('hidden');
        renderAvatarGrid();
    }

    function renderAvatarGrid() {
        if (!userAvatarGrid) return;
        const avatars = ['🎮', '🚀', '⭐', '👽', '👾', '🤖', '👑', '🐱', '🐶', '🍕', '⚽', '🏀', '🎸', '📚', '🧪', '💡'];
        
        let tempAvatar = hubUser.avatar; // Store temporary selection

        userAvatarGrid.innerHTML = avatars.map(av => `
            <button class="avatar-btn ${hubUser.avatar === av ? 'avatar-selected' : ''}" data-avatar="${escapeHtmlAttr(av)}">
                ${escapeHtml(av)}
            </button>
        `).join('');

        userAvatarGrid.querySelectorAll('.avatar-btn').forEach(btn => {
            btn.onclick = () => {
                userAvatarGrid.querySelectorAll('.avatar-btn').forEach(b => b.classList.remove('avatar-selected'));
                btn.classList.add('avatar-selected');
                tempAvatar = btn.dataset.avatar; // Update temporary avatar
            };
        });
        
        // Make sure save button uses the temp avatar
        userProfileSaveBtn.onclick = () => saveUserProfile(tempAvatar);
    }

    function saveUserProfile(selectedAvatar) {
        const newNickname = userNicknameInput.value.trim() || 'Player';
        const newAvatar = selectedAvatar || hubUser.avatar;

        hubUser = { nickname: newNickname, avatar: newAvatar };
        setStorageData('hubUser', hubUser);
        
        updateUserProfileUI();
        userProfileModal.classList.add('hidden');
        customAlert('Profile saved!', 'Success', 'success');
    }

    // --- ATTACH EVENT LISTENERS ---
    // All of these are now safely at the end of the DOMContentLoaded listener

    // General Navigation
    document.addEventListener('click', (e) => {
        const link = e.target.closest('.page-link');
        if (link && link.dataset.page) {
            switchPage(link.dataset.page);
        }
    });
    
    // Theme Toggle
    themeToggle.onclick = toggleTheme;
    
    // Mobile Menu
    mobileMenuButton.onclick = () => mobileNav.classList.toggle('hidden');
    mobileNav.onclick = (e) => {
        // Close if clicking the backdrop or a link
        if (e.target === mobileNav || e.target.closest('.page-link')) {
            mobileNav.classList.add('hidden');
        }
    };

    // Game Modal Listeners
    modalCloseBtn.onclick = closeGameModal;
    modalNewWindowBtn.onclick = () => {
        if (currentGameUrl) window.open(currentGameUrl, '_blank');
    };
    gameModal.onclick = (e) => {
        if (e.target === gameModal) closeGameModal();
    };
    
    // Game Interaction Buttons
    modalLikeBtn.onclick = () => {
        const gameId = extractGameIdFromIframe();
        if (gameId) updateGameStats(gameId, 'like');
    };
    modalDislikeBtn.onclick = () => {
        const gameId = extractGameIdFromIframe();
        if (gameId) updateGameStats(gameId, 'dislike');
    };
    modalFavoriteBtn.onclick = () => {
        const gameId = extractGameIdFromIframe();
        if (gameId) toggleFavorite(gameId);
    };
    
    // Game Card Click Handler (Event Delegation)
    document.getElementById('pageContent').addEventListener('click', (e) => {
        const card = e.target.closest('.game-card');
        if (card) {
            if (e.target.closest('.favorite-toggle-btn')) {
                toggleFavorite(card.dataset.gameId);
                return;
            }
            if (e.target.closest('.tag-filter-btn')) {
                customAlert(`Filtering by tag: ${e.target.dataset.tag} (Feature coming soon!)`, "Filter", "info");
                return;
            }
            openGameModal(card.dataset.gameId);
        }
        
        // Tag Page Click Handler
        const tagBtn = e.target.closest('#tagsPageGrid .tag-filter-btn');
        if(tagBtn) {
             customAlert(`Filtering by tag: ${tagBtn.dataset.tag} (Feature coming soon!)`, "Filter", "info");
        }
    });

    // User Profile Modal
    userProfileButton.onclick = openUserProfileModal;
    userProfileCancelBtn.onclick = () => userProfileModal.classList.add('hidden');
    // Save button is assigned inside renderAvatarGrid

    // Settings Modal
    settingsButton.onclick = () => settingsModal.classList.remove('hidden');
    settingsSaveBtn.onclick = () => {
         if (hubDescriptionInput && settings.hubDescription !== hubDescriptionInput.value) {
             settings.hubDescription = hubDescriptionInput.value.trim();
             setStorageData('hubSettings', settings);
             applySettings(); // Re-apply to update home page
         }
         settingsModal.classList.add('hidden');
    };
    
    // Safety Features
    panicButton.onclick = handlePanic;
    saveCloakSettingsBtn.onclick = saveCloakSettings;
    document.body.onkeyup = (e) => {
         if (e.key === 'f' || e.key === 'F') {
             if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                 handlePanic();
             }
         }
    };

    // Admin: Login
    adminLoginBtn.onclick = handleAdminLogin;
    adminPasswordInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') handleAdminLogin();
    });

    // Admin: Game Management
    saveGameBtn.onclick = saveGame;
    clearFormBtn.onclick = clearAddForm; // This was the line that failed!
    
    existingGamesList.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.admin-edit-btn');
        const deleteBtn = e.target.closest('.admin-delete-btn');
        
        if (editBtn) editGame(editBtn.dataset.gameId);
        if (deleteBtn) deleteGame(deleteBtn.dataset.gameId);
    });

    // Admin: Data
    exportDataBtn.onclick = exportData;
    importDataBtn.onclick = () => importFileInput.click();
    importFileInput.onchange = (e) => {
        if (e.target.files.length > 0) {
            importData(e.target.files[0]);
        }
    };

    // --- MAIN INITIALIZATION CALL ---
    // This starts the entire application
    initialize();

});
