// --- GLOBAL STATE ---
let allGames = {};
let settings = {};
let stats = { counts: {}, recent: [] };
let localRecent = []; // For storing recently played game IDs locally

let currentGameSort = "name"; // "name" or "plays"
let currentSearchQuery = "";

// Use the original password from your Apps Script
const ADMIN_PASS = 'Murtaza&AliWebsiteCode_.?!';

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

// Nav
const desktopNav = $("desktopNav");
const mobileNav = $("mobileNav");
const mobileMenuButton = $("mobileMenuButton");
const gameSectionsContainer = $("gameSectionsContainer");

// Auth
const authStatus = $("authStatus");
const authMessage = $("authMessage");

// Pages
const loadingModal = $("loadingModal");
const pages = document.querySelectorAll(".page");

// Home
const homeDesc = $("homeDesc");
const recentlyPlayedGrid = $("recentlyPlayedGrid");

// Admin
const adminPanel = $("adminPanel");

// Admin Form
const gameForm = $("gameForm");
const formTitle = $("formTitle");
const gameIdInput = $("gameIdInput");
const aTitle = $("aTitle");
const aSection = $("aSection");
const aDesc = $("aDesc");
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

// Admin Stats
const statsSummary = $("statsSummary");
const resetStatsBtn = $("resetStatsBtn");

// Alert Modal
const alertModal = $("alertModal");
const alertBackdrop = $("alertBackdrop");
const alertIcon = $("alertIcon");
const alertTitle = $("alertTitle");
const alertMessage = $("alertMessage");
const alertOkBtn = $("alertOkBtn");
const alertConfirmBtn = $("alertConfirmBtn");
const alertCancelBtn = $("alertCancelBtn");

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
            iconSvg = 'check'; iconClass = 'text-green-600'; bgClass = 'bg-green-100'; break;
        case 'warning':
            iconSvg = 'alert-triangle'; iconClass = 'text-yellow-600'; bgClass = 'bg-yellow-100'; break;
        case 'error':
            iconSvg = 'alert-circle'; iconClass = 'text-red-600'; bgClass = 'bg-red-100'; break;
        default:
            iconSvg = 'info'; iconClass = 'text-blue-600'; bgClass = 'bg-blue-100'; break;
    }
    
    const i = document.createElement('i');
    i.setAttribute('data-lucide', iconSvg);
    i.className = `w-6 h-6 ${iconClass}`;
    alertIcon.appendChild(i);
    alertIcon.classList.add(bgClass);
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
    alertIcon.className = 'flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-yellow-100';
    const i = document.createElement('i');
    i.setAttribute('data-lucide', 'alert-triangle');
    i.className = 'w-6 h-6 text-yellow-600';
    alertIcon.appendChild(i);
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
        primaryColor: '#3b82f6'
    });
    allGames = getStorageData('hubGames', {});
    stats = getStorageData('hubStats', { counts: {}, recent: [] });
    
    loadLocalRecent(); // This already uses localStorage

    // Update "auth" status (it's just "local" now)
    authMessage.textContent = `Local Storage`;
    authStatus.classList.remove('bg-gray-100');
    authStatus.classList.add('bg-blue-100', 'text-blue-700');

    // Render everything
    applySettings();
    renderNav();
    renderAllGameSections();
    renderAll();
    
    loadingModal.style.display = 'none'; // Hide loading screen
}

// No-op functions that were for Firebase
function setupListeners() {
    // Not needed for localStorage
}
async function attemptSignIn() {
    // Not needed for localStorage
}

// --- RENDER FUNCTIONS ---

/**
 * Main render loop. Calls all necessary sub-render functions.
 */
function renderAll() {
    if (!settings.sections) return; // Wait for settings
    
    // We don't need to re-render *everything* constantly,
    // but we will manually call render functions after each action.
    renderAllGameSections(); 
    renderStatsSummary();
    renderAdminList();
    renderRecentlyPlayed();
    // No need to call renderAdminPanel() here, it's static
}

/**
 * Applies global settings to the UI (color, home description).
 */
function applySettings() {
    homeDesc.textContent = settings.homepageDescription || 'Loading...';
    homeDescInput.value = settings.homepageDescription || '';
    
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
    const sections = settings.sections || ['Games'];
    const navItems = ['Home', ...sections, 'Admin'];
    
    desktopNav.innerHTML = '';
    mobileNav.innerHTML = '';

    navItems.forEach(item => {
        const pageId = `page-${item.toLowerCase()}`;
        
        // Create desktop button
        const dBtn = document.createElement('button');
        dBtn.dataset.page = pageId;
        dBtn.textContent = item;
        dBtn.className = 'nav-button px-4 py-2 text-sm font-semibold text-gray-600 rounded-lg hover:bg-gray-100';
        dBtn.onclick = () => showPage(pageId);
        desktopNav.appendChild(dBtn);
        
        // Create mobile button
        const mBtn = document.createElement('button');
        mBtn.dataset.page = pageId;
        mBtn.textContent = item;
        mBtn.className = 'nav-button block w-full px-4 py-3 text-left text-base font-semibold text-gray-700 rounded-lg hover:bg-gray-100';
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
    container.className = 'flex flex-col md:flex-row items-center justify-between gap-4 mb-6';
    
    // Search
    const searchWrap = document.createElement('div');
    searchWrap.className = 'relative w-full md:w-auto';
    const searchIcon = document.createElement('i');
    searchIcon.setAttribute('data-lucide', 'search');
    searchIcon.className = 'absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400';
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = `Search ${sectionName}...`;
    searchInput.className = 'w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-accent focus:border-accent';
    searchInput.oninput = (e) => {
        currentSearchQuery = e.target.value;
        renderAllGameSections(); // Re-render all sections with new query
    };
    searchWrap.append(searchIcon, searchInput);

    // Sort
    const sortWrap = document.createElement('div');
    sortWrap.className = 'flex items-center gap-2 p-1 bg-gray-200 rounded-lg';
    const sortByNameBtn = document.createElement('button');
    sortByNameBtn.textContent = 'Name';
    sortByNameBtn.className = `px-3 py-1.5 text-sm font-semibold rounded-md ${currentGameSort === 'name' ? 'bg-white shadow' : 'text-gray-600'}`;
    sortByNameBtn.onclick = () => {
        currentGameSort = 'name';
        renderAllGameSections();
    };
    const sortByPlaysBtn = document.createElement('button');
    sortByPlaysBtn.textContent = 'Popularity';
    sortByPlaysBtn.className = `px-3 py-1.5 text-sm font-semibold rounded-md ${currentGameSort === 'plays' ? 'bg-white shadow' : 'text-gray-600'}`;
    sortByPlaysBtn.onclick = () => {
        currentGameSort = 'plays';
        renderAllGameSections();
    };
    sortWrap.append(sortByNameBtn, sortByPlaysBtn);
    
    container.append(searchWrap, sortWrap);
    return container;
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
        title.className = 'text-3xl font-bold text-gray-900';
        title.textContent = section;
        
        // Create search/sort bar
        const searchSortBar = createSearchSortBar(section);

        // Create grid
        const grid = document.createElement('div');
        grid.id = `grid-${section.toLowerCase()}`;
        grid.className = 'grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
        
        // Filter and sort games
        const items = Object.values(allGames)
            .filter(g => g.section === section)
            .filter(g => g.title.toLowerCase().includes(currentSearchQuery.toLowerCase()));

        if (currentGameSort === 'name') {
            items.sort((a, b) => a.title.localeCompare(b.title));
        } else {
            items.sort((a, b) => (stats.counts[b.id] || 0) - (stats.counts[a.id] || 0));
        }

        if (items.length === 0) {
            grid.innerHTML = `<p class="col-span-full text-gray-500">No games found in this section${currentSearchQuery ? ' matching your search' : ''}.</p>`;
        } else {
            items.forEach(game => {
                grid.appendChild(createGameCard(game));
            });
        }
        
        sectionEl.append(title, searchSortBar, grid);
        gameSectionsContainer.appendChild(sectionEl);
    });
    
    lucide.createIcons(); // Redraw icons
    // Ensure the currently viewed page is still visible
    const activePage = document.querySelector('.nav-button.bg-accent')?.dataset.page || 'page-home';
    showPage(activePage, true); // true = skip password check on load
}

/**
 * Creates a single game card element.
 * @param {object} game - The game object.
 * @returns {HTMLElement} - The game card element.
 */
function createGameCard(game) {
    const card = document.createElement('div');
    card.className = 'flex flex-col overflow-hidden bg-white border border-gray-200 rounded-lg shadow-md cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1';
    
    const plays = stats.counts[game.id] || 0;
    const defaultThumb = 'https://placehold.co/400x300/e2e8f0/94a3b8?text=No+Image';

    card.innerHTML = `
        <div class="relative">
            <img src="${escapeHtmlAttr(game.thumbnail || defaultThumb)}" 
                 onerror="this.onerror=null;this.src='${defaultThumb}';"
                 alt="${escapeHtmlAttr(game.title)}" 
                 class="object-cover w-full h-40 bg-gray-200">
            <div class="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 text-xs font-semibold text-white bg-gray-900 bg-opacity-70 rounded-md">
                <i data-lucide="eye" class="w-3 h-3"></i>
                <span>${plays}</span>
            </div>
        </div>
        <div class="flex flex-col flex-1 p-4">
            <h3 class="text-lg font-semibold text-gray-800 truncate" title="${escapeHtmlAttr(game.title)}">${escapeHtml(game.title)}</h3>
            <p class="mt-1 text-sm text-gray-500 h-10 overflow-hidden">${escapeHtml(game.description || 'No description.')}</p>
        </div>
    `;
    
    card.onclick = () => handleGameClick(game);
    return card;
}

/**
 * Renders the "Recently Played" grid on the homepage.
 */
function renderRecentlyPlayed() {
    recentlyPlayedGrid.innerHTML = '';
    if (localRecent.length === 0) {
        recentlyPlayedGrid.innerHTML = '<p class="col-span-full text-gray-500">Play some games to see them here!</p>';
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
        recentlyPlayedGrid.innerHTML = '<p class="col-span-full text-gray-500">Play some games to see them here!</p>';
        return;
    }

    recentGames.forEach(game => {
        recentlyPlayedGrid.appendChild(createGameCard(game));
    });
    lucide.createIcons();
}

/**
 * Renders the admin panel. No auth check needed here anymore,
 * as it's handled by showPage().
 */
function renderAdminPanel() {
    // This function is now much simpler.
    // It just needs to render lists that might change.
    renderAdminSettingsList();
}

/**
 * Renders the list of sections in the admin panel.
 */
function renderAdminSettingsList() {
    sectionsList.innerHTML = '';
    (settings.sections || ['Games']).forEach((sec, idx) => {
        const row = document.createElement('div');
        row.className = 'flex items-center gap-2 p-2 bg-gray-50 rounded-lg';
        row.innerHTML = `
            <input type="text" value="${escapeHtmlAttr(sec)}" class="flex-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm" readonly>
            <button data-action="rename" class="p-2 text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-100"><i data-lucide="edit-2" class="w-5 h-5"></i></button>
            <button data-action="up" class="p-2 text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-100" ${idx === 0 ? 'disabled' : ''}><i data-lucide="arrow-up" class="w-5 h-5"></i></button>
            <button data-action="down" class="p-2 text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-100" ${idx === settings.sections.length - 1 ? 'disabled' : ''}><i data-lucide="arrow-down" class="w-5 h-5"></i></button>
            <button data-action="delete" class="p-2 text-red-600 bg-red-50 border border-red-300 rounded-md hover:bg-red-100"><i data-lucide="trash-2" class="w-5 h-5"></i></button>
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
        adminList.innerHTML = '<p class="col-span-full text-gray-500">No games added yet.</p>';
        return;
    }

    sortedGames.forEach(g => {
        const card = document.createElement('div');
        card.className = 'flex flex-col gap-3 p-4 bg-white border border-gray-200 rounded-lg shadow-sm';
        const plays = stats.counts[g.id] || 0;
        const defaultThumb = 'https://placehold.co/400x300/e2e8f0/94a3b8?text=No+Image';
        
        card.innerHTML = `
            <div class="flex items-start gap-3">
                <img src="${escapeHtmlAttr(g.thumbnail || defaultThumb)}" 
                     onerror="this.onerror=null;this.src='${defaultThumb}';"
                     alt="${escapeHtmlAttr(g.title)}" 
                     class="w-20 h-16 object-cover rounded-md bg-gray-200">
                <div class="flex-1">
                    <h4 class="font-semibold text-gray-800" title="${escapeHtmlAttr(g.title)}">${escapeHtml(g.title)}</h4>
                    <span class="px-2 py-0.5 text-xs font-medium text-blue-800 bg-blue-100 rounded-full">${escapeHtml(g.section)}</span>
                    <div class="mt-1 text-sm text-gray-500"><i data-lucide="eye" class="inline w-4 h-4 mr-1"></i>${plays} plays</div>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <button data-action="preview" class="inline-flex items-center justify-center flex-1 gap-2 px-3 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                    <i data-lucide="play" class="w-4 h-4"></i> Preview
                </button>
                <button data-action="edit" class="inline-flex items-center justify-center flex-1 gap-2 px-3 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                    <i data-lucide="edit-2" class="w-4 h-4"></i> Edit
                </button>
                <button data-action="delete" class="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-red-700 bg-red-100 border border-transparent rounded-md hover:bg-red-200">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        `;
        
        card.querySelector('[data-action="preview"]').onclick = () => handleGameClick(g, false); // false = don't record click
        card.querySelector('[data-action="edit"]').onclick = () => editGame(g.id);
        card.querySelector('[data-action="delete"]').onclick = () => deleteGame(g.id, g.title);
        
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
    
    // Recent 10 plays (from stats.recent)
    const recent = (stats.recent || []).slice(0, 10);

    let html = `
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div class="p-4 bg-gray-50 rounded-lg">
                <div class="text-sm font-medium text-gray-500">Total Plays</div>
                <div class="mt-1 text-3xl font-semibold text-gray-900">${total.toLocaleString()}</div>
            </div>
            <div class="p-4 bg-gray-50 rounded-lg">
                <div class="text-sm font-medium text-gray-500">Total Games</div>
                <div class="mt-1 text-3xl font-semibold text-gray-900">${Object.keys(allGames).length}</div>
            </div>
            <div class="p-4 bg-gray-50 rounded-lg">
                <div class="text-sm font-medium text-gray-500">Sections</div>
                <div class="mt-1 text-3xl font-semibold text-gray-900">${(settings.sections || []).length}</div>
            </div>
        </div>

        <div class="grid grid-cols-1 gap-6 mt-6 md:grid-cols-2">
            <div>
                <h4 class="font-semibold text-gray-700">Plays by Section</h4>
                <ul class="mt-2 space-y-1 list-disc list-inside">
                    ${(settings.sections || []).map(sec => `
                        <li><strong>${escapeHtml(sec)}:</strong> ${(perSection[sec] || 0).toLocaleString()}</li>
                    `).join('') || '<li>No sections defined.</li>'}
                </ul>
            </div>
            <div>
                <h4 class="font-semibold text-gray-700">Top 5 Games</h4>
                <ol class="mt-2 space-y-1 list-decimal list-inside">
                    ${top.map(id => {
                        const g = allGames[id];
                        if (!g) return '';
                        return `<li><strong>${escapeHtml(g.title)}:</strong> ${(counts[id] || 0).toLocaleString()} plays</li>`;
                    }).join('') || '<li>No plays recorded.</li>'}
                </ol>
            </div>
        </div>
        
        <div class="mt-6">
            <h4 class="font-semibold text-gray-700">Recent Plays (Last 10)</h4>
            <ul class="mt-2 space-y-2">
                ${recent.map(r => {
                    const g = allGames[r.gameId];
                    const time = new Date(r.timeIso).toLocaleString();
                    return `<li class="p-2 text-sm bg-gray-50 rounded-md">${time} - <strong>${escapeHtml((g && g.title) || r.gameId)}</strong></li>`;
                }).join('') || '<li>No recent plays.</li>'}
            </ul>
        </div>
    `;
    statsSummary.innerHTML = html;
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
            btn.classList.remove('text-gray-600', 'hover:bg-gray-100');
        } else {
            btn.classList.remove('bg-accent', 'text-white');
            btn.classList.add('text-gray-600', 'hover:bg-gray-100');
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
            renderAllGameSections();
            renderStatsSummary();
            renderAdminList();

        } catch (error) {
            console.error("Error recording click:", error);
            // Don't block the user, just log the error
        }
    }
    
    // Open the game
    if (game.url && game.url.trim()) {
        window.open(game.url, '_blank');
    } else if (game.embed && game.embed.trim()) {
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
                    iframe, object, embed {
                        width: 100%;
                        height: 100%;
                        border: 0;
                    }
                </style>
            </head>
            <body>
                ${game.embed}
            </body>
            </html>`;
        try {
            const blob = new Blob([docHTML], { type: 'text/html' });
            window.open(URL.createObjectURL(blob), '_blank');
        } catch (e) {
            console.error("Blob URL creation failed:", e);
            customAlert("Could not open the game window.", "Error", "error");
        }
    }
}

// Local "Recently Played"
function loadLocalRecent() {
    try {
        const localData = localStorage.getItem('recentlyPlayed');
        if (localData) {
            localRecent = JSON.parse(localData);
        }
    } catch (e) {
        console.warn("Could not load recently played:", e);
        localRecent = [];
    }
}

function addLocalRecent(gameId) {
    // Remove if exists
    localRecent = localRecent.filter(id => id !== gameId);
    // Add to front
    localRecent.unshift(gameId);
    // Keep max 10
    localRecent = localRecent.slice(0, 10);
    try {
        localStorage.setItem('recentlyPlayed', JSON.stringify(localRecent));
    } catch (e) {
        console.warn("Could not save recently played:", e);
    }
    renderRecentlyPlayed(); // Re-render the home section
}

// Admin: Game Form
gameForm.onsubmit = (e) => {
    e.preventDefault();
    
    const gameData = {
        title: aTitle.value.trim(),
        section: aSection.value,
        description: aDesc.value.trim(),
        thumbnail: aThumbUrl.value.trim() || 'https://placehold.co/400x300/e2e8f0/94a3b8?text=No+Image',
        embed: aEmbed.value.trim(),
        url: aUrl.value.trim(),
    };
    
    if (!gameData.title || (!gameData.embed && !gameData.url)) {
        return customAlert("Title and either Embed or URL are required.", "Missing Info", "warning");
    }

    const gameId = gameIdInput.value;
    
    try {
        if (gameId) {
            // Update existing game
            allGames[gameId] = { ...allGames[gameId], ...gameData };
            customAlert(`Updated game: ${gameData.title}`, "Success", "success");
        } else {
            // Add new game
            const newId = 'g_' + new Date().getTime();
            gameData.id = newId;
            gameData.created = new Date().toISOString();
            allGames[newId] = gameData;
            customAlert(`Added new game: ${gameData.title}`, "Success", "success");
        }
        
        setStorageData('hubGames', allGames); // Save updated games
        clearAddForm();
        
        // Re-render lists
        renderAllGameSections();
        renderAdminList();

    } catch (error) {
        console.error("Error saving game:", error);
        customAlert(`Error saving game: ${error.message}`, "Error", "error");
    }
};

function clearAddForm() {
    gameForm.reset();
    gameIdInput.value = '';
    formTitle.textContent = 'Add New Game';
    addGameBtn.innerHTML = '<i data-lucide="plus" class="w-5 h-5"></i> <span>Add Game</span>';
    lucide.createIcons();
}
clearFormBtn.onclick = clearAddForm;

// Admin: Edit/Delete Game
function editGame(id) {
    const g = allGames[id];
    if (!g) return customAlert("Game not found.", "Error", "error");

    gameIdInput.value = id;
    aTitle.value = g.title;
    aSection.value = g.section;
    aDesc.value = g.description || '';
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
        renderAllGameSections();
        renderAdminPanel(); // Re-renders the sections list

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
        stats = { counts: {}, recent: [] };
        setStorageData('hubStats', stats);
        
        customAlert("All stats have been reset.", "Success", "success");
        
        // Re-render UI
        renderAll();

    } catch (error) {
        console.error("Error resetting stats:", error);
        customAlert(`Error resetting stats: ${error.message}`, "Error", "error");
    }
};

// --- UTILITIES ---
function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeHtmlAttr(s) {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// --- START APP ---
// We must wait for the DOM to be fully loaded before running the app
// This ensures that all scripts, like lucide.js, are ready.
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log("DOM Loaded. Initializing app...");
        initialize();
        lucide.createIcons(); // Initial icon render
        
        // Set default page
        showPage('page-home', true); // true = skip password check on initial load
        console.log("App initialized successfully.");
        
    } catch (err) {
        console.error("A fatal error occurred during initialization:", err);
        // If something goes wrong, force-hide the modal and show an error
        const loadingModal = document.getElementById('loadingModal');
        if (loadingModal) {
            loadingModal.style.display = 'none';
        }
        // Use a simple alert as our custom modal might be broken
        alert("Error: Could not load the application. Check the console for details.");
    }
});
