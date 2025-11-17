// --- GLOBAL STATE ---
let allGames = {};
let settings = {};
let stats = { 
    counts: {}, 
    recent: [],
    ratings: { likes: {}, dislikes: {} }, // NEW
    reports: {} // NEW
};
let localRecent = []; // For storing recently played game IDs locally
let myFavorites = []; // For storing favorite game IDs
let myGameNotes = {}; // For private game notes
let myGameRatings = {}; // NEW: For user's own ratings
let hubUser = { nickname: 'Player', avatar: '🎮' }; // NEW
let currentTheme = 'light'; // For theme
let isCloaked = false; // For panic button
let currentTags = []; // For tag filtering
let currentGameSort = 'name'; // NEW: For sorting
let currentSearchQuery = ''; // NEW: For searching
let currentGameUrl = null; // NEW: For game modal
const NEW_GAME_DAYS = 7; // NEW: How many days a game counts as "new"
const ADMIN_PASS = '2025'; // The admin password

// --- LOCALSTORAGE HELPER FUNCTIONS ---

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


// --- DOM ELEMENTS ---
const $ = document.getElementById.bind(document);
const doc = document.documentElement;

// App Wrappers
const appWrapper = $("appWrapper"); // NEW
const panicCloak = $("panicCloak"); // NEW
const panicFrame = $("panicFrame"); // NEW
const favicon = $("favicon"); // NEW

// Nav
const desktopNav = $("desktopNav");
const mobileNav = $("mobileNav");
const mobileMenuButton = $("mobileMenuButton");
const gameSectionsContainer = $("gameSectionsContainer");

// Auth
const authStatus = $("authStatus");
const authMessage = $("authMessage");
const themeToggle = $("themeToggle"); 
const randomGameBtn = $("randomGameBtn");
const userProfileButton = $("userProfileButton"); // NEW
const userProfileAvatar = $("userProfileAvatar"); // NEW
const userProfileName = $("userProfileName"); // NEW

// Pages
const loadingModal = $("loadingModal");
const pages = document.querySelectorAll(".page");

// Home
const homeDesc = $("homeDesc");
const featuredGameContainer = $("featuredGameContainer"); // NEW
const recentlyPlayedGrid = $("recentlyPlayedGrid");

// Favorites
const favoritesGrid = $("favoritesGrid");
const pageFavorites = $("page-favorites");
const favoritesSearchSortContainer = $("favoritesSearchSortContainer"); // NEW

// NEW: Tags Page
const pageTags = $("page-tags");
const tagsPageGrid = $("tagsPageGrid");

// Admin
const adminPanel = $("adminPanel");

// Admin Form
const gameForm = $("gameForm");
const formTitle = $("formTitle");
const gameIdInput = $("gameIdInput");
const aTitle = $("aTitle");
const aSection = $("aSection");
const aDesc = $("aDesc");
const aTags = $("aTags"); // NEW
const aThumbUrl = $("aThumbUrl");
const aEmbed = $("aEmbed");
const aUrl = $("aUrl");
const addGameBtn = $("addGameBtn");
const clearFormBtn = $("clearFormBtn");
const adminList = $("adminList");

// Admin Settings
const homeDescInput = $("homeDescInput");
const saveHomeDesc = $("saveHomeDesc");
const colorPicker = $("colorPicker");
const saveColorBtn = $("saveColorBtn");
const newSectionName = $("newSectionName");
const addSectionBtn = $("addSectionBtn");
const sectionsList = $("sectionsList");
const panicUrlInput = $("panicUrlInput"); // NEW
const savePanicUrl = $("savePanicUrl"); // NEW
const panicTitleInput = $("panicTitleInput"); // NEW
const savePanicTitle = $("savePanicTitle"); // NEW

// Admin Stats
const statsSummary = $("statsSummary");
const resetStatsBtn = $("resetStatsBtn");
const statsChartContainer = $("statsChartContainer"); // NEW

// Admin Data
const exportDataBtn = $("exportDataBtn");
const importDataBtn = $("importDataBtn");
const importFileInput = $("importFileInput");

// Alert Modal
const alertModal = $("alertModal");
const alertBackdrop = $("alertBackdrop");
const alertIcon = $("alertIcon");
const alertTitle = $("alertTitle");
const alertMessage = $("alertMessage");
const alertOkBtn = $("alertOkBtn");
const alertConfirmBtn = $("alertConfirmBtn");
const alertCancelBtn = $("alertCancelBtn");

// NEW: Game Modal
const gameModal = $("gameModal");
const gameModalTitle = $("gameModalTitle");
const gameModalContentWrapper = $("gameModalContentWrapper");
const gameModalContent = $("gameModalContent");
const gameModalCloseBtn = $("gameModalCloseBtn");
const gameModalFullscreenBtn = $("gameModalFullscreenBtn");
const gameModalNewTabBtn = $("gameModalNewTabBtn");
const gameNotesTextarea = $("gameNotesTextarea");
const gameNotesLabel = $("gameNotesLabel"); // NEW
const gameRatingContainer = $("gameRatingContainer"); // NEW
const gameRatingLike = $("gameRatingLike"); // NEW
const gameRatingDislike = $("gameRatingDislike"); // NEW
const gameModalShareBtn = $("gameModalShareBtn"); // NEW
const gameModalReportBtn = $("gameModalReportBtn"); // NEW

// NEW: User Profile Modal
const userProfileModal = $("userProfileModal");
const userProfileBackdrop = $("userProfileBackdrop");
const userNicknameInput = $("userNicknameInput");
const userAvatarGrid = $("userAvatarGrid");
const userProfileSaveBtn = $("userProfileSaveBtn");
const userProfileCancelBtn = $("userProfileCancelBtn");

// NEW: Admin Stats
const reportedGamesContainer = $("reportedGamesContainer");

// --- CUSTOM ALERT/CONFIRM ---

/**
 * Shows a custom alert modal.
 * @param {string} message - The message to display.
 * @param {string} [title='Notification'] - The title of the modal.
 * @param {'info'|'success'|'warning'|'error'} [type='info'] - The type of alert.
 */
function customAlert(message, title = 'Notification', type = 'info') {
    alertTitle.textContent = title;
    alertMessage.textContent = message;

    // Reset icon
    alertIcon.innerHTML = '';
    alertIcon.className = 'flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full';
    let iconSvg, iconClass, bgClass;

    switch (type) {
        case 'success':
            iconSvg = 'check'; iconClass = 'text-green-600'; bgClass = 'bg-green-100 dark:bg-green-900'; break;
        case 'warning':
            iconSvg = 'alert-triangle'; iconClass = 'text-yellow-600'; bgClass = 'bg-yellow-100 dark:bg-yellow-900'; break;
        case 'error':
            iconSvg = 'alert-circle'; iconClass = 'text-red-600'; bgClass = 'bg-red-100 dark:bg-red-900'; break;
        default:
            iconSvg = 'info'; iconClass = 'text-blue-600'; bgClass = 'bg-blue-100 dark:bg-blue-900'; break;
    }
    
    const i = document.createElement('i');
    i.setAttribute('data-lucide', iconSvg);
    i.className = `w-6 h-6 ${iconClass}`;
    alertIcon.appendChild(i);
    
    // *** BUG FIX: Add classes one by one ***
    bgClass.split(' ').forEach(cls => {
        if (cls) alertIcon.classList.add(cls);
    });
    
    lucide.createIcons(); // Redraw icon

    alertOkBtn.style.display = 'inline-block';
    alertConfirmBtn.style.display = 'none';
    alertCancelBtn.style.display = 'none';
    alertModal.style.display = 'flex';
}

/**
 * Shows a custom confirm modal.
 * @param {string} message - The message to display.
 * @param {string} [title='Please Confirm'] - The title of the modal.
 * @returns {Promise<boolean>} - Resolves true if confirmed, false if canceled.
 */
function customConfirm(message, title = 'Please Confirm') {
    alertTitle.textContent = title;
    alertMessage.textContent = message;

    // Set icon to warning
    alertIcon.innerHTML = '';
    alertIcon.className = 'flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full';
    const i = document.createElement('i');
    i.setAttribute('data-lucide', 'alert-triangle');
    i.className = 'w-6 h-6 text-yellow-600';
    alertIcon.appendChild(i);
    
    // *** BUG FIX: Add classes one by one ***
    'bg-yellow-100 dark:bg-yellow-900'.split(' ').forEach(cls => {
        if (cls) alertIcon.classList.add(cls);
    });
    
    lucide.createIcons();

    alertOkBtn.style.display = 'none';
    alertConfirmBtn.style.display = 'inline-block';
    alertCancelBtn.style.display = 'inline-block';
    alertModal.style.display = 'flex';

    return new Promise((resolve) => {
        alertConfirmBtn.onclick = () => {
            alertModal.style.display = 'none';
            resolve(true);
        };
        alertCancelBtn.onclick = () => {
            alertModal.style.display = 'none';
            resolve(false);
        };
        alertBackdrop.onclick = () => {
            alertModal.style.display = 'none';
            resolve(false);
        };
    });
}

// General modal close
alertOkBtn.onclick = () => alertModal.style.display = 'none';
alertBackdrop.onclick = () => alertModal.style.display = 'none';


// --- INITIALIZATION ---

/**
 * Main entry point. Loads data from localStorage and renders the app.
 */
function initialize() {
    // Load all data from localStorage
    settings = getStorageData('hubSettings', {
        homepageDescription: 'Welcome! Use the Admin panel to set this description.',
        sections: ['Games'],
        primaryColor: '#3b82f6',
        featuredGameId: null, // NEW
        panicUrl: 'https://www.google.com/search?q=google+classroom', // NEW
        panicTitle: 'Google Classroom' // NEW
    });
    allGames = getStorageData('hubGames', {});
    // NEW: Load stats with new properties
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
    myGameNotes = getStorageData('myGameNotes', {});
    myGameRatings = getStorageData('myGameRatings', {}); // NEW
    hubUser = getStorageData('hubUser', { nickname: 'Player', avatar: '🎮' }); // NEW
    
    loadLocalRecent(); // This already uses localStorage

    // Load and apply theme
    currentTheme = getStorageData('hubTheme', 'light');
    applyTheme(currentTheme, true); // true = on initial load

    // NEW: Render user profile button
    renderUserProfile();

    // Update "auth" status (it's just "local" now)
    authMessage.textContent = `Local Storage`;
    authStatus.classList.remove('bg-gray-100', 'dark:bg-gray-700');
    authStatus.classList.add('bg-blue-100', 'text-blue-700', 'dark:bg-blue-900', 'dark:text-blue-300');

    // *** BUG FIX: Create search bars *before* rendering. ***
    // This was causing the "Cannot set properties of null" error.
    favoritesSearchSortContainer.appendChild(createSearchSortBar("Favorites"));

    // Render everything
    applySettings(); // Apply settings first
    renderNav();
    // renderAllGameSections() is called by renderAll()
    renderAll();
    
    // NEW: Add event listener for random game button
    randomGameBtn.onclick = playRandomGame;
    
    // NEW: Add event listeners for game modal
    gameModalCloseBtn.onclick = closeGameModal;
    gameModalFullscreenBtn.onclick = toggleGameFullscreen;
    gameModalNewTabBtn.onclick = () => {
        if (currentGameUrl) {
            window.open(currentGameUrl, '_blank');
        }
    };
    
    // NEW: Add event listener for game notes
    gameNotesTextarea.oninput = (e) => {
        const gameId = e.target.dataset.gameId;
        if (!gameId) return;
        myGameNotes[gameId] = e.target.value;
        setStorageData('myGameNotes', myGameNotes);
    };
    
    // NEW: Add event listeners for profile modal
    userProfileButton.onclick = openUserProfileModal;
    userProfileBackdrop.onclick = closeUserProfileModal;
    userProfileCancelBtn.onclick = closeUserProfileModal;
    userProfileSaveBtn.onclick = saveUserProfile;
    
    // NEW: Add event listeners for new game modal buttons
    gameModalShareBtn.onclick = shareSite;
    
    loadingModal.style.display = 'none'; // Hide loading screen
}

// --- RENDER FUNCTIONS ---

/**
 * Main render loop. Calls all necessary sub-render functions.
 */
function renderAll() {
    if (!settings.sections) return; // Wait for settings
    
    renderFeaturedGame(); // NEW
    renderAllGameSections(); 
    renderFavoritesPage(); 
    renderTagsPage(); // NEW
    renderStatsSummary();
    renderAdminList();
    renderRecentlyPlayed();
    lucide.createIcons(); // Redraw all icons
}

/**
 * Applies global settings to the UI (color, home description).
 */
function applySettings() {
    homeDesc.textContent = settings.homepageDescription || 'Loading...';
    homeDescInput.value = settings.homepageDescription || '';
    
    // NEW: Panic settings
    panicUrlInput.value = settings.panicUrl || 'https://google.com';
    panicTitleInput.value = settings.panicTitle || 'Google';
    
    const color = settings.primaryColor || '#3b82f6';
    document.documentElement.style.setProperty('--accent-color', color);
    // Convert hex to RGB for box-shadow
    const rgb = color.match(/\w\w/g).map(x => parseInt(x, 16));
    document.documentElement.style.setProperty('--accent-color-rgb', rgb.join(', '));
    
    colorPicker.value = color;

    // Update section dropdown in admin form
    aSection.innerHTML = '';
    (settings.sections || ['Games']).forEach(sec => {
        const opt = document.createElement('option');
        opt.value = sec;
        opt.textContent = sec;
        aSection.appendChild(opt);
    });
}

/**
 * Renders the navigation buttons (top and mobile).
 */
function renderNav() {
    // NEW: Added "Favorites" and "Tags"
    const sections = settings.sections || ['Games'];
    const navItems = ['Home', 'Favorites', 'Tags', ...sections, 'Admin'];
    
    desktopNav.innerHTML = '';
    mobileNav.innerHTML = '';

    navItems.forEach(item => {
        const pageId = `page-${item.toLowerCase()}`;
        
        // Create desktop button
        const dBtn = document.createElement('button');
        dBtn.dataset.page = pageId;
        dBtn.textContent = item;
        dBtn.className = 'nav-button px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700';
        dBtn.onclick = () => showPage(pageId);
        desktopNav.appendChild(dBtn);
        
        // Create mobile button
        const mBtn = document.createElement('button');
        mBtn.dataset.page = pageId;
        mBtn.textContent = item;
        mBtn.className = 'nav-button block w-full px-4 py-3 text-left text-base font-semibold text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700';
        mBtn.onclick = () => {
            showPage(pageId);
            mobileNav.classList.add('hidden'); // Close menu on click
        };
        mobileNav.appendChild(mBtn);
    });
    
    // Set initial active page
    highlightActiveNav('page-home');
}

/**
 * Creates the search/sort bar for a game section.
 * @param {string} sectionName - The name of the section.
 * @returns {HTMLElement} - The fully constructed search bar element.
 */
function createSearchSortBar(sectionName) {
    const container = document.createElement('div');
    container.className = 'space-y-4';
    
    const topRow = document.createElement('div');
    topRow.className = 'flex flex-col md:flex-row items-center justify-between gap-4';
    
    // Search
    const searchWrap = document.createElement('div');
    searchWrap.className = 'relative w-full md:w-auto';
    const searchIcon = document.createElement('i');
    searchIcon.setAttribute('data-lucide', 'search');
    searchIcon.className = 'absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500';
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = `Search ${sectionName}...`;
    searchInput.className = 'w-full py-2 pl-10 pr-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-accent focus:border-accent bg-white dark:bg-gray-700 text-gray-900 dark:text-white';
    searchInput.oninput = (e) => {
        currentSearchQuery = e.target.value;
        renderAll(); // Re-render everything on search
    };
    searchWrap.append(searchIcon, searchInput);

    // Sort (NEW: Changed to dropdown)
    const sortWrap = document.createElement('div');
    sortWrap.className = 'flex items-center gap-2';
    
    const sortLabel = document.createElement('label');
    sortLabel.htmlFor = `sort-${sectionName}`;
    sortLabel.className = 'text-sm font-medium text-gray-600 dark:text-gray-300';
    sortLabel.textContent = 'Sort by:';
    
    const sortSelect = document.createElement('select');
    sortSelect.id = `sort-${sectionName}`;
    sortSelect.className = 'py-2 pl-3 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-accent focus:border-accent bg-white dark:bg-gray-700 text-gray-900 dark:text-white';
    sortSelect.innerHTML = `
        <option value="name">Name (A-Z)</option>
        <option value="plays">Popularity</option>
        <option value="rating">Top Rated</option> <!-- NEW -->
        <option value="newest">Date Added (Newest)</option>
        <option value="oldest">Date Added (Oldest)</option>
    `;
    sortSelect.value = currentGameSort; // Set to current sort
    sortSelect.onchange = (e) => {
        currentGameSort = e.target.value;
        renderAll();
    };
    
    sortWrap.append(sortLabel, sortSelect);
    
    topRow.append(searchWrap, sortWrap);
    
    // NEW: Active Tag Filters
    const tagFilterContainer = document.createElement('div');
    tagFilterContainer.id = `tags-filter-${sectionName.toLowerCase()}`;
    tagFilterContainer.className = 'flex flex-wrap items-center gap-2';
    // This part will be populated by renderActiveTags
    
    container.append(topRow, tagFilterContainer);
    renderActiveTags(tagFilterContainer); // Initial render
    
    return container;
}

/**
 * NEW: Renders the active tag filters into a container.
 * @param {HTMLElement} container - The element to render tags into.
 */
function renderActiveTags(container) {
    // *** BUG FIX: Add a check to ensure container is not null ***
    if (!container) {
        // This can happen if renderAll() runs before the container is created
        // console.warn("renderActiveTags: container not found.");
        return; 
    }
    
    container.innerHTML = ''; // Clear existing
    if (currentTags.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'flex';
    const title = document.createElement('span');
    title.className = 'text-sm font-semibold text-gray-600 dark:text-gray-400';
    title.textContent = 'Filtering by:';
    container.appendChild(title);

    currentTags.forEach(tag => {
        const badge = document.createElement('button');
        badge.className = 'tag-badge active';
        badge.innerHTML = `
            <span>${escapeHtml(tag)}</span>
            <span class="tag-clear">
                <i data-lucide="x" class="w-3 h-3"></i>
            </span>
        `;
        badge.onclick = () => toggleTagFilter(tag);
        container.appendChild(badge);
    });
    
    lucide.createIcons();
}

/**
 * NEW: Toggles a tag in the global filter.
 * @param {string} tag - The tag to toggle.
 */
function toggleTagFilter(tag) {
    const index = currentTags.indexOf(tag);
    if (index > -1) {
        currentTags.splice(index, 1); // Remove tag
    } else {
        currentTags.push(tag); // Add tag
    }
    renderAll(); // Re-render everything with new filter
}

/**
 * Renders all game sections and their content.
 */
function renderAllGameSections() {
    gameSectionsContainer.innerHTML = ''; // Clear existing
    
    (settings.sections || ['Games']).forEach(section => {
        // Create section element
        const sectionEl = document.createElement('section');
        sectionEl.id = `page-${section.toLowerCase()}`;
        sectionEl.className = 'page';
        sectionEl.style.display = 'none';

        // Create title
        const title = document.createElement('h2');
        title.className = 'text-3xl font-bold text-gray-900 dark:text-white';
        title.textContent = section;
        
        // Create search/sort bar
        const searchSortBar = createSearchSortBar(section);

        // Create grid
        const grid = document.createElement('div');
grid.id = `grid-${section.toLowerCase()}`;
        grid.className = 'grid grid-cols-1 gap-6 mt-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
        
        // Filter and sort games
        const items = Object.values(allGames)
            .filter(g => g.section === section) // Filter by section
            .filter(g => g.title.toLowerCase().includes(currentSearchQuery.toLowerCase())) // Filter by search
            .filter(g => currentTags.length === 0 || currentTags.every(tag => g.tags && g.tags.includes(tag))); // NEW: Filter by tags

        // NEW: Updated sorting logic
        if (currentGameSort === 'name') {
            items.sort((a, b) => a.title.localeCompare(b.title));
        } else if (currentGameSort === 'plays') {
            items.sort((a, b) => (stats.counts[b.id] || 0) - (stats.counts[a.id] || 0));
        } else if (currentGameSort === 'rating') { // NEW
            items.sort((a, b) => (stats.ratings.likes[b.id] || 0) - (stats.ratings.likes[a.id] || 0));
        } else if (currentGameSort === 'newest') {
            items.sort((a, b) => new Date(b.created) - new Date(a.created));
        } else if (currentGameSort === 'oldest') {
            items.sort((a, b) => new Date(a.created) - new Date(b.created));
        }

        if (items.length === 0) {
            let msg = 'No games found in this section';
            if (currentSearchQuery) msg += ' matching your search';
            if (currentTags.length > 0) msg += ' with those tags';
            grid.innerHTML = `<p class="col-span-full text-gray-500 dark:text-gray-400">${msg}.</p>`;
        } else {
            items.forEach(game => {
                grid.appendChild(createGameCard(game));
            });
        }
        
        sectionEl.append(title, searchSortBar, grid);
        gameSectionsContainer.appendChild(sectionEl);
    });
    
    // Don't call lucide.createIcons() here, renderAll() will do it
    // Ensure the currently viewed page is still visible
    const activePage = document.querySelector('.nav-button.bg-accent')?.dataset.page || 'page-home';
    showPage(activePage, true); // true = skip password check on load
}

/**
 * Renders the Favorites page.
 */
function renderFavoritesPage() {
    favoritesGrid.innerHTML = '';
    
    // *** BUG FIX: Use a more specific selector and check if it exists ***
    const favoritesTagContainer = favoritesSearchSortContainer.querySelector('#tags-filter-favorites');
    if (favoritesTagContainer) {
        renderActiveTags(favoritesTagContainer);
    }
    
    const items = myFavorites
        .map(id => allGames[id]) // Get game objects from IDs
        .filter(Boolean) // Remove any undefined (deleted) games
        .filter(g => g.title.toLowerCase().includes(currentSearchQuery.toLowerCase())) // Filter by search
        .filter(g => currentTags.length === 0 || currentTags.every(tag => g.tags && g.tags.includes(tag))); // NEW: Filter by tags

    // NEW: Updated sorting logic
    if (currentGameSort === 'name') {
        items.sort((a, b) => a.title.localeCompare(b.title));
    } else if (currentGameSort === 'plays') {
        items.sort((a, b) => (stats.counts[b.id] || 0) - (stats.counts[a.id] || 0));
    } else if (currentGameSort === 'rating') { // NEW
        items.sort((a, b) => (stats.ratings.likes[b.id] || 0) - (stats.ratings.likes[a.id] || 0));
    } else if (currentGameSort === 'newest') {
        items.sort((a, b) => new Date(b.created) - new Date(a.created));
    } else if (currentGameSort === 'oldest') {
        items.sort((a, b) => new Date(a.created) - new Date(b.created));
    }

    if (items.length === 0) {
        let msg = "You haven't favorited any games yet. Click the heart icon on a game to add it!";
        if (currentSearchQuery || currentTags.length > 0) msg = "No favorites found matching your filter.";
        favoritesGrid.innerHTML = `<p class="col-span-full text-gray-500 dark:text-gray-400">${msg}</p>`;
    } else {
        items.forEach(game => {
            favoritesGrid.appendChild(createGameCard(game));
        });
    }
    // Don't call lucide.createIcons() here
}

// --- NEW: TAGS PAGE RENDERER ---
/**
 * Renders the "All Tags" discovery page.
 */
function renderTagsPage() {
    tagsPageGrid.innerHTML = '';
    const allTags = new Set();
    
    // 1. Collect all unique tags
    Object.values(allGames).forEach(game => {
        (game.tags || []).forEach(tag => allTags.add(tag));
    });
    
    // 2. Sort and render
    const sortedTags = Array.from(allTags).sort((a, b) => a.localeCompare(b));
    
    if (sortedTags.length === 0) {
        tagsPageGrid.innerHTML = '<p class="text-gray-500 dark:text-gray-400">No tags have been added to any games yet.</p>';
        return;
    }
    
    sortedTags.forEach(tag => {
        const badge = document.createElement('button');
        badge.className = 'tag-badge text-base px-4 py-2'; // Make them a bit bigger
        badge.textContent = escapeHtml(tag);
        badge.onclick = () => {
            currentTags = [tag]; // Set this as the only filter
            // Navigate to the first game section to show results
            const firstSection = settings.sections[0] || 'games';
            showPage(`page-${firstSection.toLowerCase()}`);
        };
        tagsPageGrid.appendChild(badge);
    });
}

/**
 * NEW: Renders the featured game on the homepage.
 */
function renderFeaturedGame() {
    featuredGameContainer.innerHTML = '';
    const gameId = settings.featuredGameId;
    
    if (!gameId || !allGames[gameId]) {
        featuredGameContainer.style.display = 'none';
        return;
    }
    
    const game = allGames[gameId];
    featuredGameContainer.style.display = 'block';
    
    const defaultThumb = 'https://placehold.co/400x300/e2e8f0/94a3b8?text=No+Image';
    
    const card = document.createElement('div');
    card.className = 'relative w-full p-6 overflow-hidden bg-white rounded-lg shadow-lg md:p-8 dark:bg-gray-800 border dark:border-gray-700';
    card.innerHTML = `
        <div class="flex flex-col md:flex-row gap-6">
            <img src="${escapeHtmlAttr(game.thumbnail || defaultThumb)}" 
                 onerror="this.onerror=null;this.src='${defaultThumb}';"
                 alt="${escapeHtmlAttr(game.title)}" 
                 class="object-cover w-full h-48 md:w-64 md:h-auto rounded-md bg-gray-200 dark:bg-gray-700">
            <div class="flex-1">
                <h3 class="text-sm font-bold uppercase tracking-wider text-accent">Featured Game</h3>
                <h2 class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">${escapeHtml(game.title)}</h2>
                <p class="mt-3 text-base text-gray-600 dark:text-gray-300">${escapeHtml(game.description || 'No description.')}</p>
                <button id="playFeaturedBtn" class="inline-flex items-center gap-2 px-5 py-3 mt-6 font-semibold text-white rounded-md bg-accent hover:opacity-90">
                    <i data-lucide="play" class="w-5 h-5"></i>
                    <span>Play Now</span>
                </button>
            </div>
        </div>
    `;
    
    card.querySelector('#playFeaturedBtn').onclick = () => handleGameClick(game);
    featuredGameContainer.appendChild(card);
}

/**
 * Creates a single game card element.
 * @param {object} game - The game object.
 * @returns {HTMLElement} - The game card element.
 */
function createGameCard(game) {
    const card = document.createElement('div');
    card.className = 'flex flex-col overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md transition-all hover:shadow-lg hover:-translate-y-1'; // Removed cursor-pointer
    
    const plays = stats.counts[game.id] || 0;
    const defaultThumb = 'https://placehold.co/400x300/e2e8f0/94a3b8?text=No+Image';
    const isFav = myFavorites.includes(game.id); 
    const isNew = game.created && (new Date() - new Date(game.created)) < (NEW_GAME_DAYS * 24 * 60 * 60 * 1000); 

    // NEW: Tag badges HTML
    let tagsHtml = '';
    if (game.tags && game.tags.length > 0) {
        tagsHtml = game.tags.slice(0, 3).map(tag => 
            `<button class="tag-badge" data-tag="${escapeHtmlAttr(tag)}">${escapeHtml(tag)}</button>`
        ).join('');
    }

    card.innerHTML = `
        <div class="relative cursor-pointer" data-action="play">
            <img src="${escapeHtmlAttr(game.thumbnail || defaultThumb)}" 
                 onerror="this.onerror=null;this.src='${defaultThumb}';"
                 alt="${escapeHtmlAttr(game.title)}" 
                 class="object-cover w-full h-40 bg-gray-200 dark:bg-gray-700">
            
            ${isNew ? '<span class="new-badge">New!</span>' : ''}

            <div class="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 text-xs font-semibold text-white bg-gray-900 bg-opacity-70 rounded-md">
                <i data-lucide="eye" class="w-3 h-3"></i>
                <span>${plays.toLocaleString()}</span>
            </div>
            
            <button class="favorite-btn absolute bottom-2 right-2 p-2 rounded-full bg-gray-900 bg-opacity-50 text-white hover:bg-opacity-75 transition-all">
                <i data-lucide="heart" class="w-5 h-5 ${isFav ? 'fill-red-500 stroke-red-500' : ''}"></i>
            </button>
        </div>
        <div class="flex flex-col flex-1 p-4">
            <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200 truncate cursor-pointer" data-action="play" title="${escapeHtmlAttr(game.title)}">${escapeHtml(game.title)}</h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400 h-10 overflow-hidden">${escapeHtml(game.description || 'No description.')}</p>
            
            <!-- NEW: Tags container -->
            <div class="flex flex-wrap items-center gap-2 mt-3 h-8 overflow-hidden">
                ${tagsHtml}
            </div>
        </div>
    `;
    
    // Click actions
    card.querySelectorAll('[data-action="play"]').forEach(el => {
        el.onclick = () => handleGameClick(game);
    });

    const favBtn = card.querySelector('.favorite-btn');
    favBtn.onclick = (e) => {
        e.stopPropagation(); 
        toggleFavorite(game.id);
    };

    // NEW: Tag click actions
    card.querySelectorAll('.tag-badge').forEach(badge => {
        badge.onclick = (e) => {
            e.stopPropagation();
            toggleTagFilter(badge.dataset.tag);
        };
    });

    return card;
}

/**
 * Renders the "Recently Played" grid on the homepage.
 */
function renderRecentlyPlayed() {
    recentlyPlayedGrid.innerHTML = '';
    if (localRecent.length === 0) {
        recentlyPlayedGrid.innerHTML = '<p class="col-span-full text-gray-500 dark:text-gray-400">Play some games to see them here!</p>';
        return;
    }

    // Get unique, valid game objects
    const recentGames = [];
    const seenIds = new Set();
    for (const id of localRecent) {
        const game = allGames[id];
        if (game && !seenIds.has(id)) {
            recentGames.push(game);
            seenIds.add(id);
        }
        if (recentGames.length >= 5) break; // Max 5
    }
    
    if (recentGames.length === 0) {
        recentlyPlayedGrid.innerHTML = '<p class="col-span-full text-gray-500 dark:text-gray-400">Play some games to see them here!</p>';
        return;
    }

    recentGames.forEach(game => {
        recentlyPlayedGrid.appendChild(createGameCard(game));
    });
    // Don't call lucide.createIcons() here
}

/**
 * Renders the admin panel.
 */
function renderAdminPanel() {
    renderAdminSettingsList();
}

/**
 * Renders the list of sections in the admin panel.
 */
function renderAdminSettingsList() {
    sectionsList.innerHTML = '';
    (settings.sections || ['Games']).forEach((sec, idx) => {
        const row = document.createElement('div');
        row.className = 'flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg';
        row.innerHTML = `
            <input type="text" value="${escapeHtmlAttr(sec)}" class="flex-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm sm:text-sm bg-white dark:bg-gray-800" readonly>
            <button data-action="rename" class="p-2 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-900"><i data-lucide="edit-2" class="w-5 h-5"></i></button>
            <button data-action="up" class="p-2 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-900" ${idx === 0 ? 'disabled' : ''}><i data-lucide="arrow-up" class="w-5 h-5"></i></button>
            <button data-action="down" class="p-2 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-900" ${idx === settings.sections.length - 1 ? 'disabled' : ''}><i data-lucide="arrow-down" class="w-5 h-5"></i></button>
            <button data-action="delete" class="p-2 text-red-600 bg-red-50 dark:bg-red-900 dark:text-red-300 border border-red-300 dark:border-red-700 rounded-md hover:bg-red-100 dark:hover:bg-red-800"><i data-lucide="trash-2" class="w-5 h-5"></i></button>
        `;
        
        const input = row.querySelector('input');
        const renameBtn = row.querySelectorAll('button')[0];
        const upBtn = row.querySelectorAll('button')[1];
        const downBtn = row.querySelectorAll('button')[2];
        const deleteBtn = row.querySelectorAll('button')[3];
        
        let isEditing = false;
        renameBtn.onclick = async () => {
            if (isEditing) {
                const newName = input.value.trim();
                if (newName && newName !== sec) {
                    await handleRenameSection(sec, newName);
                }
                input.setAttribute('readonly', true);
                input.classList.remove('ring-2', 'ring-accent');
                renameBtn.innerHTML = '<i data-lucide="edit-2" class="w-5 h-5"></i>';
                isEditing = false;
            } else {
                input.removeAttribute('readonly');
                input.classList.add('ring-2', 'ring-accent');
                input.focus();
                input.select();
                renameBtn.innerHTML = '<i data-lucide="save" class="w-5 h-5 text-accent"></i>';
                isEditing = true;
            }
            lucide.createIcons();
        };
        
        upBtn.onclick = () => reorderSection(idx, -1);
        downBtn.onclick = () => reorderSection(idx, 1);
        deleteBtn.onclick = () => handleDeleteSection(sec);
        
        sectionsList.appendChild(row);
    });
    lucide.createIcons();
}

/**
 * Renders the list of games in the admin panel.
 */
function renderAdminList() {
    adminList.innerHTML = '';
    const sortedGames = Object.values(allGames).sort((a,b) => a.title.localeCompare(b.title));
    
    if (sortedGames.length === 0) {
        adminList.innerHTML = '<p class="col-span-full text-gray-500 dark:text-gray-400">No games added yet.</p>';
        return;
    }

    sortedGames.forEach(g => {
        const card = document.createElement('div');
        card.className = 'flex flex-col gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm';
        const plays = stats.counts[g.id] || 0;
        const defaultThumb = 'https://placehold.co/400x300/e2e8f0/94a3b8?text=No+Image';
        const isFeatured = settings.featuredGameId === g.id; // NEW
        const likes = stats.ratings.likes[g.id] || 0; // NEW
        const dislikes = stats.ratings.dislikes[g.id] || 0; // NEW
        const reports = stats.reports[g.id] || 0; // NEW

        // NEW: Tags list for admin
        let tagsHtml = 'No tags';
        if (g.tags && g.tags.length > 0) {
            tagsHtml = g.tags.map(t => `<span class="px-2 py-0.5 text-xs font-medium text-gray-800 bg-gray-100 rounded-full dark:bg-gray-600 dark:text-gray-200">${escapeHtml(t)}</span>`).join(' ');
        }
        
        card.innerHTML = `
            <div class="flex items-start gap-3">
                <img src="${escapeHtmlAttr(g.thumbnail || defaultThumb)}" 
                     onerror="this.onerror=null;this.src='${defaultThumb}';"
                     alt="${escapeHtmlAttr(g.title)}" 
                     class="w-20 h-16 object-cover rounded-md bg-gray-200 dark:bg-gray-700">
                <div class="flex-1">
                    <h4 class="font-semibold text-gray-800 dark:text-gray-200" title="${escapeHtmlAttr(g.title)}">${escapeHtml(g.title)}</h4>
                    
                    <!-- NEW: Quick Section Edit -->
                    <select data-action="quick-section" class="block w-full text-xs p-1 mt-1 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-accent focus:border-accent bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                        ${(settings.sections || ['Games']).map(sec => 
                            `<option value="${escapeHtmlAttr(sec)}" ${g.section === sec ? 'selected' : ''}>${escapeHtml(sec)}</option>`
                        ).join('')}
                    </select>
                    
                    <!-- NEW: Ratings & Reports -->
                    <div class="flex items-center gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
                        <span class="flex items-center gap-1" title="Plays"><i data-lucide="eye" class="w-4 h-4"></i>${plays.toLocaleString()}</span>
                        <span class="flex items-center gap-1 text-green-600" title="Likes"><i data-lucide="thumbs-up" class="w-4 h-4"></i>${likes.toLocaleString()}</span>
                        <span class="flex items-center gap-1 text-red-600" title="Dislikes"><i data-lucide="thumbs-down" class="w-4 h-4"></i>${dislikes.toLocaleString()}</span>
                        ${reports > 0 ? `<span class="flex items-center gap-1 text-yellow-600" title="Reports"><i data-lucide="flag" class="w-4 h-4"></i>${reports}</span>` : ''}
                    </div>
                </div>
            </div>
            <!-- NEW: Tags display in admin -->
            <div class="flex flex-wrap items-center gap-1">
                <i data-lucide="tags" class="w-4 h-4 text-gray-500 dark:text-gray-400"></i>
                <div class="text-sm text-gray-500 dark:text-gray-400">${tagsHtml}</div>
            </div>
            <div class="flex items-center gap-2">
                <!-- NEW: Feature Button -->
                <button data-action="feature" class="inline-flex items-center justify-center flex-1 gap-2 px-3 py-2 text-sm font-semibold rounded-md 
                    ${isFeatured ? 'bg-yellow-400 text-yellow-900' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-800'}">
                    <i data-lucide="star" class="w-4 h-4 ${isFeatured ? 'fill-yellow-900' : ''}"></i>
                    <span>${isFeatured ? 'Featured' : 'Feature'}</span>
                </button>
                <button data-action="edit" class="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600">
                    <i data-lucide="edit-2" class="w-4 h-4"></i>
                </button>
                <!-- NEW: Duplicate Button -->
                <button data-action="duplicate" class="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-blue-700 bg-blue-100 dark:bg-blue-900 dark:text-blue-300 border border-transparent rounded-md hover:bg-blue-200 dark:hover:bg-blue-800">
                    <i data-lucide="copy" class="w-4 h-4"></i>
                </button>
                <button data-action="delete" class="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-red-700 bg-red-100 dark:bg-red-900 dark:text-red-300 border border-transparent rounded-md hover:bg-red-200 dark:hover:bg-red-800">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        `;
        
        card.querySelector('[data-action="feature"]').onclick = () => toggleFeaturedGame(g.id);
        card.querySelector('[data-action="edit"]').onclick = () => editGame(g.id);
        card.querySelector('[data-action="duplicate"]').onclick = () => duplicateGame(g.id); // NEW
        card.querySelector('[data-action="delete"]').onclick = () => deleteGame(g.id, g.title);
        card.querySelector('[data-action="quick-section"]').onchange = (e) => quickChangeSection(g.id, e.target.value); // NEW
        
        adminList.appendChild(card);
    });
    lucide.createIcons();
}

/**
 * Renders the statistics summary in the admin panel.
 */
function renderStatsSummary() {
    const counts = stats.counts || {};
    const total = Object.values(counts).reduce((s, c) => s + c, 0);

    // Per-section
    const perSection = {};
    Object.values(allGames).forEach(g => {
        perSection[g.section] = perSection[g.section] || 0;
        perSection[g.section] += (counts[g.id] || 0);
    });

    // Top 5 games
    const top = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 5);
    
    // NEW: Top Rated 5 games
    const topRated = Object.keys(stats.ratings.likes)
        .sort((a, b) => (stats.ratings.likes[b] || 0) - (stats.ratings.likes[a] || 0))
        .slice(0, 5);
        
    // Recent 10 plays (from stats.recent)
    const recent = (stats.recent || []).slice(0, 10);

    let html = `
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Plays</div>
                <div class="mt-1 text-3xl font-semibold text-gray-900 dark:text-gray-100">${total.toLocaleString()}</div>
            </div>
            <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Games</div>
                <div class="mt-1 text-3xl font-semibold text-gray-900 dark:text-gray-100">${Object.keys(allGames).length}</div>
            </div>
            <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div class="text-sm font-medium text-gray-500 dark:text-gray-400">Sections</div>
                <div class="mt-1 text-3xl font-semibold text-gray-900 dark:text-gray-100">${(settings.sections || []).length}</div>
            </div>
        </div>

        <div class="grid grid-cols-1 gap-6 mt-6 md:grid-cols-2">
            <div>
                <h4 class="font-semibold text-gray-700 dark:text-gray-300">Plays by Section</h4>
                <ul class="mt-2 space-y-1 list-disc list-inside text-gray-600 dark:text-gray-400">
                    ${(settings.sections || []).map(sec => `
                        <li><strong>${escapeHtml(sec)}:</strong> ${(perSection[sec] || 0).toLocaleString()}</li>
                    `).join('') || '<li>No sections defined.</li>'}
                </ul>
            </div>
            <div>
                <h4 class="font-semibold text-gray-700 dark:text-gray-300">Top 5 Games (by Plays)</h4>
                <ol class="mt-2 space-y-1 list-decimal list-inside text-gray-600 dark:text-gray-400">
                    ${top.map(id => {
                        const g = allGames[id];
                        if (!g) return '';
                        return `<li><strong>${escapeHtml(g.title)}:</strong> ${(counts[id] || 0).toLocaleString()} plays</li>`;
                    }).join('') || '<li>No plays recorded.</li>'}
                </ol>
            </div>
            <!-- NEW: Top Rated List -->
            <div>
                <h4 class="font-semibold text-gray-700 dark:text-gray-300">Top 5 Games (by Likes)</h4>
                <ol class="mt-2 space-y-1 list-decimal list-inside text-gray-600 dark:text-gray-400">
                    ${topRated.map(id => {
                        const g = allGames[id];
                        if (!g) return '';
                        const likes = stats.ratings.likes[id] || 0;
                        return `<li><strong>${escapeHtml(g.title)}:</strong> ${likes.toLocaleString()} likes</li>`;
                    }).join('') || '<li>No games rated yet.</li>'}
                </ol>
            </div>
        </div>
        
        <div class="mt-6">
            <h4 class="font-semibold text-gray-700 dark:text-gray-300">Recent Plays (Last 10)</h4>
            <ul class="mt-2 space-y-2">
                ${recent.map(r => {
                    const g = allGames[r.gameId];
                    const time = new Date(r.timeIso).toLocaleString();
                    return `<li class="p-2 text-sm bg-gray-50 dark:bg-gray-700 rounded-md text-gray-700 dark:text-gray-300">${time} - <strong>${escapeHtml((g && g.title) || r.gameId)}</strong></li>`;
                }).join('') || '<li class="text-gray-500 dark:text-gray-400">No recent plays.</li>'}
            </ul>
        </div>
    `;
    statsSummary.innerHTML = html;
    
    // NEW: Call the chart renderer
    renderStatsChart();
    
    // NEW: Call the reported games renderer
    renderReportedGames();
}

// --- NEW: STATS CHART RENDERER ---
/**
 * Renders the "Plays in Last 7 Days" bar chart.
 */
function renderStatsChart() {
    const container = $("statsChartContainer");
    if (!container) return;

    // 1. Prepare data
    const days = [0, 0, 0, 0, 0, 0, 0]; // 0 = today, 1 = yesterday...
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Set to end of today

    (stats.recent || []).forEach(entry => {
        const playDate = new Date(entry.timeIso);
        const diffTime = today.getTime() - playDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays >= 0 && diffDays < 7) {
            days[diffDays]++;
        }
    });

    const maxPlays = Math.max(...days, 1); // Use 1 to avoid division by zero
    const dayLabels = ['Today', '1d', '2d', '3d', '4d', '5d', '6d'];

    // 2. Build HTML
    let chartHtml = '<div class="stats-chart">';
    
    for (let i = 6; i >= 0; i--) { // Loop backwards to show oldest on left
        const dayPlayCount = days[i];
        const barHeight = (dayPlayCount / maxPlays) * 100;
        
        chartHtml += `
            <div class="chart-bar-wrapper" title="${dayLabels[i]}: ${dayPlayCount} plays">
                <div class="chart-bar" style="height: ${barHeight}%;">
                    <div class="tooltip">${dayPlayCount}</div>
                </div>
                <div class="chart-label">${dayLabels[i]}</div>
            </div>
        `;
    }
    
    chartHtml += '</div>';
    container.innerHTML = chartHtml;
}

// --- NEW: REPORTED GAMES RENDERER ---
/**
 * Renders the "Reported Games" section in the admin panel.
 */
function renderReportedGames() {
    reportedGamesContainer.innerHTML = '';
    
    const reported = Object.keys(stats.reports)
        .filter(id => (stats.reports[id] || 0) > 0)
        .sort((a, b) => stats.reports[b] - stats.reports[a]);
        
    if (reported.length === 0) {
        reportedGamesContainer.innerHTML = `
            <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">Reported Games</h3>
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">No games have been reported. Good job!</p>
        `;
        return;
    }
    
    let html = `
        <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">Reported Games (${reported.length})</h3>
        <div class="mt-4 space-y-2">
    `;
    
    reported.forEach(id => {
        const g = allGames[id];
        const reportCount = stats.reports[id];
        if (g) {
            html += `
                <div class="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                    <div>
                        <strong class="text-yellow-800 dark:text-yellow-200">${escapeHtml(g.title)}</strong>
                        <span class="ml-2 text-sm text-yellow-700 dark:text-yellow-300">(${reportCount} report${reportCount > 1 ? 's' : ''})</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <button data-action="edit-report" data-id="${id}" class="inline-flex items-center gap-2 px-3 py-1 text-sm font-semibold text-gray-700 bg-white dark:bg-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600">
                            Edit
                        </button>
                        <button data-action="clear-report" data-id="${id}" class="inline-flex items-center gap-2 px-3 py-1 text-sm font-semibold text-green-700 bg-green-100 dark:bg-green-900 dark:text-green-300 border border-transparent rounded-md hover:bg-green-200 dark:hover:bg-green-800">
                            Clear
                        </button>
                    </div>
                </div>
            `;
        }
    });
    
    html += '</div>';
    reportedGamesContainer.innerHTML = html;
    
    // Add event listeners
    reportedGamesContainer.querySelectorAll('[data-action="edit-report"]').forEach(btn => {
        btn.onclick = () => editGame(btn.dataset.id);
    });
    reportedGamesContainer.querySelectorAll('[data-action="clear-report"]').forEach(btn => {
        btn.onclick = () => clearGameReport(btn.dataset.id);
    });
}

// --- EVENT HANDLERS & ACTIONS ---

// Navigation

/**
 * Shows a specific page and hides all others.
 * @param {string} pageId - The ID of the page element to show.
 * @param {boolean} [skipPasswordCheck=false] - Whether to bypass the admin password prompt.
 */
function showPage(pageId, skipPasswordCheck = false) {
    if (pageId === 'page-admin' && !skipPasswordCheck) {
        const code = prompt('Enter admin passcode:');
        if (code !== ADMIN_PASS) {
            customAlert('Incorrect password.', 'Access Denied', 'error');
            return; // Stop navigation
        }
        // If password is correct, render the admin panel dynamic lists
        renderAdminPanel();
    }

    pages.forEach(p => p.style.display = 'none');
    gameSectionsContainer.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    
    const el = $(pageId);
    if (el) {
        el.style.display = 'block';
    } else {
        console.warn(`Page not found: ${pageId}. Defaulting to home.`);
        $('page-home').style.display = 'block';
        pageId = 'page-home';
    }
    
    highlightActiveNav(pageId);
}

/**
 * Highlights the active navigation button.
 * @param {string} pageId - The ID of the active page.
 */
function highlightActiveNav(pageId) {
    document.querySelectorAll('.nav-button').forEach(btn => {
        if (btn.dataset.page === pageId) {
            btn.classList.add('bg-accent', 'text-white');
            btn.classList.remove('text-gray-600', 'dark:text-gray-300', 'hover:bg-gray-100', 'dark:hover:bg-gray-700');
        } else {
            btn.classList.remove('bg-accent', 'text-white');
            btn.classList.add('text-gray-600', 'dark:text-gray-300', 'hover:bg-gray-100', 'dark:hover:bg-gray-700');
        }
    });
}

// Mobile menu toggle
mobileMenuButton.onclick = () => {
    mobileNav.classList.toggle('hidden');
};

// Game Click

/**
 * Handles clicking on a game card.
 * @param {object} game - The game object.
 * @param {boolean} [record=true] - Whether to record the click stat.
 */
function handleGameClick(game, record = true) {
    if (record) {
        try {
            // Update stats in localStorage
            const gameId = game.id;
            stats.counts[gameId] = (stats.counts[gameId] || 0) + 1;
            
            const newRecentEntry = {
                gameId: game.id,
                timeIso: new Date().toISOString(),
                userKey: 'local' // Simplified user key
            };
            stats.recent.unshift(newRecentEntry);
            
            // Cap recent list to last 200
            if (stats.recent.length > 200) stats.recent = stats.recent.slice(0, 200);

            setStorageData('hubStats', stats);
            
            addLocalRecent(game.id);
            
            // Re-render sections that show stats
            renderAll(); // Full re-render

        } catch (error) {
            console.error("Error recording click:", error);
            // Don't block the user, just log the error
        }
    }
    
    // --- MODIFIED: Open in modal instead of new tab ---
    
    // Reset the New Tab button's behavior to default
    gameModalNewTabBtn.onclick = () => {
        if (currentGameUrl) {
            window.open(currentGameUrl, '_blank');
        }
    };
    
    // 1. Handle URL games
    if (game.url && game.url.trim()) {
        gameModalContent.innerHTML = `<iframe src="${escapeHtmlAttr(game.url)}" class="w-full h-full border-0" allow="fullscreen" allowfullscreen></iframe>`;
        currentGameUrl = game.url;
        gameModalNewTabBtn.style.display = 'inline-flex';
    } 
    // 2. Handle embed code games (FIXED)
    else if (game.embed && game.embed.trim()) {
        // Create a full, sandboxed HTML document for the embed
        const docHTML = `
            <!doctype html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width,initial-scale=1">
                <title>${escapeHtml(game.title)}</title>
                <style>
                    html, body {
                        height: 100%;
                        width: 100%;
                        margin: 0;
                        padding: 0;
                        background: #000;
                        overflow: hidden;
                    }
                    /* Make all embed elements fill the page */
                    iframe, object, embed, canvas {
                        width: 100%;
                        height: 100%;
                        border: 0;
                        display: block; /* Fix for canvas */
                    }
                </style>
            </head>
            <body>
                ${game.embed}
            </body>
            </html>`;
        
        try {
            const blob = new Blob([docHTML], { type: 'text/html' });
            const blobUrl = URL.createObjectURL(blob);
            
            // Set an iframe in the modal to point to this blob URL
            gameModalContent.innerHTML = `<iframe src="${blobUrl}" class="w-full h-full border-0" allow="fullscreen" allowfullscreen></iframe>`;
            
            currentGameUrl = null; // No single URL to open
            gameModalNewTabBtn.style.display = 'inline-flex';
            
            // Override the New Tab button's click for this blob
            gameModalNewTabBtn.onclick = () => {
                const newBlob = new Blob([docHTML], { type: 'text/html' });
                window.open(URL.createObjectURL(newBlob), '_blank');
            };

        } catch (e) {
            console.error("Blob URL creation failed:", e);
            customAlert("Could not create the game window.", "Error", "error");
            return;
        }
    } 
    // 3. Handle failure
    else {
        customAlert("This game has no URL or embed code to play.", "Error", "error");
        return;
    }
    
    // 4. Show the modal
    gameModalTitle.textContent = game.title;
    gameModal.style.display = 'flex';
    // Reset fullscreen icon
    gameModalFullscreenBtn.innerHTML = '<i data-lucide="maximize" class="w-5 h-5"></i>';
    
    // NEW: Load notes
    gameNotesTextarea.value = myGameNotes[game.id] || '';
    gameNotesTextarea.dataset.gameId = game.id;
    gameNotesLabel.textContent = `My Private Notes for ${hubUser.nickname}:`;
    
    // NEW: Set up report button
    gameModalReportBtn.onclick = () => reportGame(game.id, game.title);
    
    // NEW: Set up rating buttons
    renderGameRatingUI(game.id);
    gameRatingLike.onclick = () => handleGameRating(game.id, 'like');
    gameRatingDislike.onclick = () => handleGameRating(game.id, 'dislike');
    
    lucide.createIcons();
}

// --- NEW: GAME MODAL FUNCTIONS ---
/**
 * Closes the game modal and stops the game.
 */
function closeGameModal() {
    gameModal.style.display = 'none';
    gameModalContent.innerHTML = ''; // This is CRITICAL to stop the game
    gameModalTitle.textContent = '';
    currentGameUrl = null;
    
    // NEW: Clear notes
    gameNotesTextarea.value = '';
    gameNotesTextarea.dataset.gameId = '';
    
    // NEW: Clear rating buttons
    gameRatingLike.onclick = null;
    gameRatingDislike.onclick = null;
    gameRatingLike.classList.remove('active-like');
    gameRatingDislike.classList.remove('active-dislike');
    
    // NEW: Clear report button
    gameModalReportBtn.onclick = null;
    
    // Exit fullscreen if active
    if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }
}

/**
 * Toggles the game modal between fullscreen and windowed.
 */
function toggleGameFullscreen() {
    const elem = gameModalContentWrapper;
    const icon = gameModalFullscreenBtn.querySelector('i');

    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        // Enter fullscreen
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) { /* Safari */
            elem.webkitRequestFullscreen();
        }
        icon.setAttribute('data-lucide', 'minimize');
    } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) { /* Safari */
            document.webkitExitFullscreen();
        }
        icon.setAttribute('data-lucide', 'maximize');
    }
    lucide.createIcons();
}

// --- NEW: RANDOM GAME ---
function playRandomGame() {
    const gameIds = Object.keys(allGames);
    if (gameIds.length === 0) {
        customAlert("No games to play! Admin needs to add some.", "Whoops!", "warning");
        return;
    }
    
    const randomId = gameIds[Math.floor(Math.random() * gameIds.length)];
    const game = allGames[randomId];
    handleGameClick(game, true); // Play and record
}

// --- NEW: DUPLICATE & QUICK EDIT ---
function duplicateGame(id) {
    const g = allGames[id];
    if (!g) return customAlert("Game not found.", "Error", "error");
    
    clearAddForm(); // Reset form first
    
    gameIdInput.value = ''; // Ensure it's a new game
    aTitle.value = g.title + " (Copy)";
    aSection.value = g.section;
    aDesc.value = g.description || '';
    aTags.value = (g.tags || []).join(', ');
    aThumbUrl.value = g.thumbnail || '';
    aEmbed.value = g.embed || '';
    aUrl.value = g.url || '';
    
    formTitle.textContent = 'Add New Game (Duplicated)';
    
    // Scroll to form
    gameForm.scrollIntoView({ behavior: 'smooth' });
    customAlert(`Duplicated "${g.title}". Change the title and save.`, "Game Duplicated", "info");
}

// NEW: Quick Section Change
async function quickChangeSection(gameId, newSection) {
    if (!allGames[gameId]) return;
    
    const oldSection = allGames[gameId].section;
    allGames[gameId].section = newSection;
    setStorageData('hubGames', allGames);
    
    // Show a small confirmation
    customAlert(`Moved "${allGames[gameId].title}" to ${newSection}.`, "Game Moved", "success");
    
    // Re-render all game lists
    renderAll();
}

// NEW: Report Game
async function reportGame(gameId, title) {
    const confirmed = await customConfirm(
        `Are you sure you want to report "${title}" as broken or not working? This will notify the admin.`,
        "Report Game?"
    );
    if (!confirmed) return;
    
    stats.reports[gameId] = (stats.reports[gameId] || 0) + 1;
    setStorageData('hubStats', stats);
    
    customAlert("Game reported! Thank you for your feedback.", "Report Sent", "success");
    
    // No re-render needed, admin will see it
}

// NEW: Clear Game Report
async function clearGameReport(gameId) {
    const g = allGames[gameId];
    if (!g) return customAlert("Game not found.", "Error", "error");

    const confirmed = await customConfirm(
        `Are you sure you want to clear the ${stats.reports[gameId]} report(s) for "${g.title}"?`,
        "Clear Reports?"
    );
    if (!confirmed) return;
    
    delete stats.reports[gameId];
    setStorageData('hubStats', stats);
    
    customAlert(`Reports cleared for "${g.title}".`, "Success", "success");
    renderStatsSummary(); // Re-render stats
    renderAdminList(); // Re-render admin list
}

// NEW: Game Rating
function handleGameRating(gameId, ratingType) {
    let myOldRating = myGameRatings[gameId];
    
    // 1. Update User's Rating
    if (myOldRating === ratingType) {
        // User clicked the same button again, so un-rate
        delete myGameRatings[gameId];
    } else {
        myGameRatings[gameId] = ratingType;
    }
    setStorageData('myGameRatings', myGameRatings);
    
    // 2. Update Global Stats
    // If user changed vote, remove old vote
    if (myOldRating && myOldRating !== ratingType) {
        if (myOldRating === 'like' && stats.ratings.likes[gameId] > 0) {
            stats.ratings.likes[gameId]--;
        } else if (myOldRating === 'dislike' && stats.ratings.dislikes[gameId] > 0) {
            stats.ratings.dislikes[gameId]--;
        }
    }
    
    // Add new vote
    if (myGameRatings[gameId]) { // If they have a new rating
        if (ratingType === 'like') {
            stats.ratings.likes[gameId] = (stats.ratings.likes[gameId] || 0) + 1;
        } else if (ratingType === 'dislike') {
            stats.ratings.dislikes[gameId] = (stats.ratings.dislikes[gameId] || 0) + 1;
        }
    }
    
    setStorageData('hubStats', stats);
    
    // 3. Update UI
    renderGameRatingUI(gameId);
    
    // 4. Re-render stats (for admin) and game lists (for sorting)
    renderStatsSummary();
    renderAllGameSections();
    renderFavoritesPage();
}

function renderGameRatingUI(gameId) {
    const myRating = myGameRatings[gameId];
    
    gameRatingLike.classList.remove('active-like');
    gameRatingDislike.classList.remove('active-dislike');
    
    if (myRating === 'like') {
        gameRatingLike.classList.add('active-like');
    } else if (myRating === 'dislike') {
        gameRatingDislike.classList.add('active-dislike');
    }
}

// NEW: User Profile
const AVATARS = [
    '🎮', '👾', '🚀', '🎨', '🧠', '💡', '🔥', '⭐',
    '🤖', '👽', '👻', '🎃', '🐱', '🐶', '🐼', '🐸',
    '🏀', '⚽', '🏈', '⚾', '🎱', '🎲', '🎯', '🧩'
];

function openUserProfileModal() {
    userNicknameInput.value = hubUser.nickname;
    userAvatarGrid.innerHTML = '';
    
    AVATARS.forEach(avatar => {
        const btn = document.createElement('button');
        btn.className = 'avatar-btn';
        btn.textContent = avatar;
        if (avatar === hubUser.avatar) {
            btn.classList.add('active');
        }
        btn.onclick = () => {
            // Handle avatar selection
            userAvatarGrid.querySelectorAll('.avatar-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        };
        userAvatarGrid.appendChild(btn);
    });
    
    userProfileModal.style.display = 'flex';
}

function closeUserProfileModal() {
    userProfileModal.style.display = 'none';
}

function saveUserProfile() {
    const newNickname = userNicknameInput.value.trim() || 'Player';
    const newAvatar = userAvatarGrid.querySelector('.avatar-btn.active')?.textContent || '🎮';
    
    hubUser = {
        nickname: newNickname,
        avatar: newAvatar
    };
    
    setStorageData('hubUser', hubUser);
    renderUserProfile();
    closeUserProfileModal();
    customAlert("Profile saved!", "Success", "success");
}

function renderUserProfile() {
    userProfileAvatar.textContent = hubUser.avatar;
    userProfileName.textContent = hubUser.nickname;
}

// NEW: Share Site
function shareSite() {
    // Use execCommand as a fallback for navigator.clipboard
    try {
        const dummy = document.createElement('textarea');
        dummy.value = window.location.href;
        document.body.appendChild(dummy);
        dummy.select();
        document.execCommand('copy');
        document.body.removeChild(dummy);
        customAlert("Site link copied to clipboard!", "Shared!", "success");
    } catch (err) {
        console.error("Failed to copy link:", err);
        customAlert("Could not copy link. You can copy it from the address bar.", "Error", "error");
    }
}

// Admin: Edit/Delete Game
function editGame(id) {
    const g = allGames[id];
    if (!g) return customAlert("Game not found.", "Error", "error");

    gameIdInput.value = id;
    aTitle.value = g.title;
    aSection.value = g.section;
    aDesc.value = g.description || '';
    aTags.value = (g.tags || []).join(', '); // NEW
    aThumbUrl.value = g.thumbnail || '';
    aEmbed.value = g.embed || '';
    aUrl.value = g.url || '';
    
    formTitle.textContent = 'Edit Game';
    addGameBtn.innerHTML = '<i data-lucide="save" class="w-5 h-5"></i> <span>Save Changes</span>';
    lucide.createIcons();
    
    // Scroll to form
    gameForm.scrollIntoView({ behavior: 'smooth' });
}

async function deleteGame(id, title) {
    const confirmed = await customConfirm(
        `Are you sure you want to delete "${title}"? This will also remove its play stats and cannot be undone.`,
        "Delete Game?"
    );
    if (!confirmed) return;
    
    try {
        // Delete from allGames
        delete allGames[id];
        setStorageData('hubGames', allGames);
        
        // Remove stats for this game
        delete stats.counts[id];
        stats.recent = stats.recent.filter(r => r.gameId !== id);
        // Keep global ratings/reports, just in case
        
        // Remove from local data
        delete myGameNotes[id];
        setStorageData('myGameNotes', myGameNotes);
        delete myGameRatings[id];
        setStorageData('myGameRatings', myGameRatings);
        
        myFavorites = myFavorites.filter(favId => favId !== id);
        setStorageData('myFavorites', myFavorites);

        // NEW: Un-feature if it was featured
        if (settings.featuredGameId === id) {
            settings.featuredGameId = null;
            setStorageData('hubSettings', settings);
        }

        // NEW: Clean up ratings and reports
        delete stats.ratings.likes[id];
        delete stats.ratings.dislikes[id];
        delete stats.reports[id];
        setStorageData('hubStats', stats);

        customAlert(`Deleted game: ${title}`, "Success", "success");
        
        // Re-render UI
        renderAll();

    } catch (error) {
        console.error("Error deleting game:", error);
        customAlert(`Error deleting game: ${error.message}`, "Error", "error");
    }
}

// Admin: Settings
saveHomeDesc.onclick = () => saveSettingsAndRender({ homepageDescription: homeDescInput.value });
saveColorBtn.onclick = () => saveSettingsAndRender({ primaryColor: colorPicker.value });
savePanicUrl.onclick = () => saveSettingsAndRender({ panicUrl: panicUrlInput.value }); // NEW
savePanicTitle.onclick = () => saveSettingsAndRender({ panicTitle: panicTitleInput.value }); // NEW

addSectionBtn.onclick = async () => {
    const name = newSectionName.value.trim();
    if (!name) return customAlert("Please enter a section name.", "Warning", "warning");
    if (settings.sections.includes(name)) {
        return customAlert("This section already exists.", "Warning", "warning");
    }
    
    const newSections = [...settings.sections, name];
    await saveSettingsAndRender({ sections: newSections });
    newSectionName.value = '';
};

async function handleDeleteSection(sectionName) {
    const gamesInUse = Object.values(allGames).filter(g => g.section === sectionName).length;
    if (gamesInUse > 0) {
        return customAlert(`Cannot delete section "${sectionName}" as ${gamesInUse} game(s) still use it. Please re-assign them first.`, "Error", "error");
    }
    
    const confirmed = await customConfirm(`Are you sure you want to delete the section "${sectionName}"?`, "Delete Section?");
    if (!confirmed) return;
    
    const newSections = settings.sections.filter(s => s !== sectionName);
    await saveSettingsAndRender({ sections: newSections });
}

async function handleRenameSection(oldName, newName) {
    if (settings.sections.includes(newName)) {
        return customAlert("That section name already exists.", "Error", "error");
    }
    
    // 1. Update section array in settings
    const newSections = settings.sections.map(s => (s === oldName ? newName : s));
    settings.sections = newSections; // Update local state
    
    // 2. Update all games using this section
    Object.values(allGames).forEach(game => {
        if (game.section === oldName) {
            game.section = newName;
        }
    });
    
    setStorageData('hubGames', allGames); // Save updated games
    await saveSettingsAndRender({ sections: newSections }); // Save updated settings
    
    customAlert(`Renamed section "${oldName}" to "${newName}".`, "Success", "success");
    renderAll(); // Full re-render
}

async function reorderSection(index, dir) {
    const arr = settings.sections.slice();
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= arr.length) return;
    
    // Swap
    [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
    
    await saveSettingsAndRender({ sections: arr });
}

/**
 * Saves settings to localStorage and re-renders affected components.
 */
async function saveSettingsAndRender(newSettings) {
     try {
        settings = { ...settings, ...newSettings };
        setStorageData('hubSettings', settings);
        
        // Re-render components that use settings
        applySettings();
        renderNav();
        renderAll(); // Full re-render needed

        customAlert("Settings saved!", "Success", "success");
    } catch (error) {
        console.error("Error saving settings:", error);
        customAlert(`Error saving settings: ${error.message}`, "Error", "error");
    }
}

// Admin: Stats
resetStatsBtn.onclick = async () => {
    const confirmed = await customConfirm(
        "Are you sure you want to reset ALL play stats? This will set all counts to 0 and clear recent plays. This cannot be undone.",
        "Reset All Stats?"
    );
    if (!confirmed) return;
    
    try {
        stats = { 
            counts: {}, 
            recent: [],
            ratings: { likes: {}, dislikes: {} },
            reports: {}
        };
        setStorageData('hubStats', stats);
        
        customAlert("All stats have been reset.", "Success", "success");
        
        // Re-render UI
        renderAll();

    } catch (error) {
        console.error("Error resetting stats:", error);
        customAlert(`Error resetting stats: ${error.message}`, "Error", "error");
    }
};

// Admin: Game Form
gameForm.onsubmit = async (e) => {
    e.preventDefault();
    try {
        const id = gameIdInput.value.trim();
        const title = aTitle.value.trim();
        const section = aSection.value;
        const desc = aDesc.value.trim();
        const tags = aTags.value.split(',').map(t => t.trim()).filter(Boolean); // NEW
        const thumb = aThumbUrl.value.trim();
        const embed = aEmbed.value.trim();
        const url = aUrl.value.trim();

        if (!title) return customAlert("Title is required.", "Warning", "warning");
        if (!embed && !url) return customAlert("Embed code OR a URL is required.", "Warning", "warning");

        const gameData = {
            title,
            section,
            description: desc,
            tags, // NEW
            thumbnail: thumb,
            embed,
            url,
        };

        if (id) {
            // Update existing game
            allGames[id] = { ...allGames[id], ...gameData };
            customAlert(`Game "${title}" updated!`, "Success", "success");
        } else {
            // Add new game
            const newId = `g_${new Date().getTime()}`;
            allGames[newId] = {
                id: newId,
                ...gameData,
                created: new Date().toISOString()
            };
            customAlert(`Game "${title}" added!`, "Success", "success");
        }
        
        setStorageData('hubGames', allGames);
        renderAll(); // Re-render everything
        clearAddForm();

    } catch (error) {
        console.error("Error saving game:", error);
        customAlert(`Error saving game: ${error.message}`, "Error", "error");
    }
};

clearFormBtn.onclick = clearAddForm;

function clearAddForm() {
    gameIdInput.value = '';
    aTitle.value = '';
    aSection.value = settings.sections[0] || 'Games';
    aDesc.value = '';
    aTags.value = '';
    aThumbUrl.value = '';
    aEmbed.value = '';
    aUrl.value = '';
    
    formTitle.textContent = 'Add New Game';
    addGameBtn.innerHTML = '<i data-lucide="plus" class="w-5 h-5"></i> <span>Add Game</span>';
    lucide.createIcons();
}

// --- HELPER FUNCTIONS ---

/**
 * Loads the user's recently played games from localStorage.
 */
function loadLocalRecent() {
    localRecent = getStorageData('localRecent', []);
}

/**
 * Adds a game to the user's local recently played list.
 * @param {string} gameId - The ID of the game to add.
 */
function addLocalRecent(gameId) {
    // Remove from list if it exists
    localRecent = localRecent.filter(id => id !== gameId);
    // Add to the front
    localRecent.unshift(gameId);
    // Keep only the last 5
    if (localRecent.length > 5) localRecent = localRecent.slice(0, 5);
    setStorageData('localRecent', localRecent);
}

/**
 * Toggles a game in the user's favorites.
 * @param {string} gameId - The ID of the game to toggle.
 */
function toggleFavorite(gameId) {
    const index = myFavorites.indexOf(gameId);
    if (index > -1) {
        myFavorites.splice(index, 1); // Remove
    } else {
        myFavorites.push(gameId); // Add
    }
    setStorageData('myFavorites', myFavorites);
    renderAll(); // Re-render to show heart icon change
}

/**
 * NEW: Toggles the featured game.
 * @param {string} gameId - The ID of the game to feature/un-feature.
 */
function toggleFeaturedGame(gameId) {
    if (settings.featuredGameId === gameId) {
        // Un-feature it
        settings.featuredGameId = null;
    } else {
        // Feature it
        settings.featuredGameId = gameId;
    }
    saveSettingsAndRender(settings); // This saves and re-renders
}

/**
 * Applies the theme (light/dark) to the <html> tag.
 * @param {'light'|'dark'} theme - The theme to apply.
 * @param {boolean} [isInitialLoad=false] - Whether this is the first load.
 */
function applyTheme(theme, isInitialLoad = false) {
    const icon = themeToggle.querySelector('i');
    if (theme === 'dark') {
        doc.classList.add('dark');
        icon.setAttribute('data-lucide', 'moon');
    } else {
        doc.classList.remove('dark');
        icon.setAttribute('data-lucide', 'sun');
    }
    // Only redraw icon if it's not the first load
    if (!isInitialLoad) {
        lucide.createIcons();
    }
}

/**
 * Toggles the theme between light and dark.
 */
function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    setStorageData('hubTheme', currentTheme);
    applyTheme(currentTheme);
}

/**
 * NEW: Toggles the panic mode.
 */
function togglePanicMode() {
    isCloaked = !isCloaked;
    if (isCloaked) {
        // Enter panic mode
        panicFrame.src = settings.panicUrl || 'https://google.com';
        document.title = settings.panicTitle || 'Google';
        favicon.href = 'https://www.google.com/favicon.ico';
        document.body.classList.add('cloaked');
    } else {
        // Exit panic mode
        document.title = 'Unblocked Game Hub';
        favicon.href = "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🎮</text></svg>";
        document.body.classList.remove('cloaked');
        // Clear the iframe src to stop loading
        panicFrame.src = 'about:blank';
    }
}

// Global key listener for panic button
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        togglePanicMode();
    }
});


// --- DATA IMPORT/EXPORT ---

/**
 * Exports all site data to a JSON file.
 */
async function exportData() {
    const confirmed = await customConfirm(
        "This will export all your games, settings, and stats to a JSON file. Do you want to continue?",
        "Export Data?"
    );
    if (!confirmed) return;
    
    try {
        const exportData = {
            hubGames: allGames,
            hubSettings: settings,
            hubStats: stats
        };
        const json = JSON.stringify(exportData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `unblocked_hub_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        customAlert("Data exported successfully!", "Success", "success");
    } catch (error) {
        console.error("Error exporting data:", error);
        customAlert(`Error exporting data: ${error.message}`, "Error", "error");
    }
}

/**
 * Imports site data from a JSON file.
 */
async function importData(file) {
    if (!file) return;
    
    const confirmed = await customConfirm(
        "Are you sure you want to import data? This will OVERWRITE all your current games, settings, and stats. This cannot be undone.",
        "Import Data?"
    );
    if (!confirmed) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.hubGames || !data.hubSettings || !data.hubStats) {
                throw new Error("Invalid import file. Missing required keys.");
            }
            
            // Overwrite all data
            setStorageData('hubGames', data.hubGames);
            setStorageData('hubSettings', data.hubSettings);
            setStorageData('hubStats', data.hubStats);
            
            // Clear local user data (like favorites) as it may be out of sync
            localStorage.removeItem('myFavorites');
            localStorage.removeItem('localRecent');
            localStorage.removeItem('myGameNotes');
            localStorage.removeItem('myGameRatings');
            
            customAlert("Data imported successfully! The page will now reload.", "Success", "success");
            
            // Reload the page to apply all new settings
            setTimeout(() => {
                window.location.reload();
            }, 1500);
            
        } catch (error) {
            console.error("Error importing data:", error);
            customAlert(`Error importing data: ${error.message}`, "Error", "error");
        }
    };
    reader.readAsText(file);
}

// Bind data export/import buttons
exportDataBtn.onclick = exportData;
importDataBtn.onclick = () => importFileInput.click();
importFileInput.onchange = (e) => {
    if (e.target.files.length > 0) {
        importData(e.target.files[0]);
    }
};


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


// --- INITIALIZE APP ---
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log("DOM Loaded. Initializing app...");
        
        // --- EVENT LISTENERS ---
        // Must be inside DOMContentLoaded
        
        // Theme
        themeToggle.onclick = toggleTheme;
        
        // Admin: Settings
        saveHomeDesc.onclick = () => saveSettingsAndRender({ homepageDescription: homeDescInput.value });
        saveColorBtn.onclick = () => saveSettingsAndRender({ primaryColor: colorPicker.value });
        savePanicUrl.onclick = () => saveSettingsAndRender({ panicUrl: panicUrlInput.value });
        savePanicTitle.onclick = () => saveSettingsAndRender({ panicTitle: panicTitleInput.value });
        addSectionBtn.onclick = async () => {
            const name = newSectionName.value.trim();
            if (!name) return customAlert("Please enter a section name.", "Warning", "warning");
            if (settings.sections.includes(name)) {
                return customAlert("This section already exists.", "Warning", "warning");
            }
            const newSections = [...settings.sections, name];
            await saveSettingsAndRender({ sections: newSections });
            newSectionName.value = '';
        };
        
        // Admin: Stats
        resetStatsBtn.onclick = async () => {
            const confirmed = await customConfirm(
                "Are you sure you want to reset ALL play stats? This will set all counts to 0 and clear recent plays. This cannot be undone.",
                "Reset All Stats?"
            );
            if (!confirmed) return;
            try {
                stats = { counts: {}, recent: [], ratings: { likes: {}, dislikes: {} }, reports: {} };
                setStorageData('hubStats', stats);
                customAlert("All stats have been reset.", "Success", "success");
                renderAll();
            } catch (error) {
                console.error("Error resetting stats:", error);
                customAlert(`Error resetting stats: ${error.message}`, "Error", "error");
            }
        };

        // Admin: Game Form
        gameForm.onsubmit = async (e) => {
            e.preventDefault();
            try {
                const id = gameIdInput.value.trim();
                const title = aTitle.value.trim();
                const section = aSection.value;
                const desc = aDesc.value.trim();
                const tags = aTags.value.split(',').map(t => t.trim()).filter(Boolean);
                const thumb = aThumbUrl.value.trim();
                const embed = aEmbed.value.trim();
                const url = aUrl.value.trim();

                if (!title) return customAlert("Title is required.", "Warning", "warning");
                if (!embed && !url) return customAlert("Embed code OR a URL is required.", "Warning", "warning"); // THIS IS THE FIX!

                const gameData = { title, section, description: desc, tags, thumbnail: thumb, embed, url };

                if (id) {
                    allGames[id] = { ...allGames[id], ...gameData };
                    customAlert(`Game "${title}" updated!`, "Success", "success");
                } else {
                    const newId = `g_${new Date().getTime()}`;
                    allGames[newId] = { id: newId, ...gameData, created: new Date().toISOString() };
                    customAlert(`Game "${title}" added!`, "Success", "success");
                }
                
                setStorageData('hubGames', allGames);
                renderAll();
                clearAddForm();
            } catch (error) {
                console.error("Error saving game:", error);
                customAlert(`Error saving game: ${error.message}`, "Error", "error");
            }
        };
        clearFormBtn.onclick = clearAddForm;

        // Admin: Data
        exportDataBtn.onclick = exportData;
        importDataBtn.onclick = () => importFileInput.click();
        importFileInput.onchange = (e) => {
            if (e.target.files.length > 0) {
                importData(e.target.files[0]);
            }
        };

        // Run the main app initialization
        initialize();
        console.log("App initialized successfully.");
        
    } catch (err) {
        console.error("A fatal error occurred during initialization:", err);
        // Show a user-friendly error message
        loadingModal.innerHTML = `
            <div class="p-4 bg-red-800 border-4 border-red-500 rounded-lg">
                <h2 class="text-xl font-bold text-white">Error: Could not load the application.</h2>
                <p class="mt-2 text-red-100">Check the console (F12) for details.</p>
            </div>`;
    }
});
