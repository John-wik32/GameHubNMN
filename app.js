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

// --- GLOBAL DOM VARIABLES ---
// We declare them here so all functions can access them
let doc, appWrapper, favicon, desktopNav, mobileNav, mobileMenuButton,
    gameSectionsContainer, authStatus, authMessage, themeToggle,
    userProfileButton, userProfileAvatar, userProfileName, loadingModal, pages,
    pageHome, homeDesc, featuredGameContainer, recentlyPlayedGrid,
    favoritesGrid, pageFavorites, pageTags, tagsPageGrid, adminPanel,
    adminLogin, adminPasswordInput, adminLoginBtn, adminTools, gameForm,
    gameIdInput, gameTitleInput, gameSectionInput, gameDescriptionInput,
    gameTagsInput, gameUrlInput, saveGameBtn, clearFormBtn,
    existingGamesList, exportDataBtn, importDataBtn, importFileInput,
    alertModal, gameModal, modalGameTitle, gameIframe, modalCloseBtn,
    modalNewWindowBtn, modalLikeBtn, modalDislikeBtn, modalFavoriteBtn,
    likeCountSpan, dislikeCountSpan, userProfileModal, userNicknameInput,
    userAvatarGrid, userProfileSaveBtn, userProfileCancelBtn, settingsModal,
    settingsButton, settingsSaveBtn, hubDescriptionInput, cloakTitleInput,
    cloakFaviconInput, saveCloakSettingsBtn, panicButton;

// Helper to find elements
const $ = document.getElementById.bind(document);

// --- LOCALSTORAGE HELPER FUNCTIONS ---

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

function setStorageData(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error(`Failed to save to localStorage key "${key}":`, e);
    }
}

// --- UTILITIES ---

function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
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

// --- CUSTOM ALERT/CONFIRM ---

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

// --- THEME FUNCTIONS ---

function applyTheme(theme, isInitialLoad = false) {
    if (theme === 'dark') {
        doc.classList.add('dark');
    } else {
        doc.classList.remove('dark');
    }
    if (!isInitialLoad) {
        updateThemeToggleUI(theme);
    }
}

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
            lucide.createIcons();
        }
    }
}

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    setStorageData('currentTheme', currentTheme);
    applyTheme(currentTheme, false);
}

// --- INITIALIZATION ---

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
    stats.ratings = stats.ratings || { likes: {}, dislikes: {} };
    stats.reports = stats.reports || {};

    myFavorites = getStorageData('myFavorites', []); 
    myGameRatings = getStorageData('myGameRatings', {});
    hubUser = getStorageData('hubUser', { nickname: 'Player', avatar: '🎮' });
    
    loadLocalRecent();

    // Load and apply theme
    currentTheme = getStorageData('currentTheme', 'light');
    applyTheme(currentTheme, true);
    updateThemeToggleUI(); // Set the icon correctly on load

    // *** THIS IS THE FIX: Changed 'renderUserProfile' to 'updateUserProfileUI' ***
    updateUserProfileUI();

    // Update "auth" status
    authMessage.textContent = `Local Storage`;
    authStatus.classList.remove('bg-gray-100', 'dark:bg-gray-700');
    authStatus.classList.add('bg-blue-100', 'text-blue-700', 'dark:bg-blue-900', 'dark:text-blue-300');

    applySettings();
    renderAll();
    
    loadingModal.style.display = 'none';
    console.log("App initialized successfully.");
}

// --- RENDER FUNCTIONS ---

function renderAll() {
    renderNavigation();
    renderFeaturedGame();
    renderGameSections();
    renderFavoritesPage(); 
    renderTagsPage();
    renderAdminList();
    renderRecentlyPlayed();
    lucide.createIcons();
}

function applySettings() {
    homeDesc.textContent = settings.hubDescription || 'Loading...';
    hubDescriptionInput.value = settings.hubDescription || '';
    
    cloakTitleInput.value = settings.cloakTitle || 'Google Drive';
    cloakFaviconInput.value = settings.cloakFavicon || '📚';
    
    applyThemeColor(settings.accentColor || 'blue');
}

function applyThemeColor(color) {
    // Helper function to apply color variables
    const colorMap = {
        'blue': { hex: '#3b82f6', rgb: '59, 130, 246' },
        'green': { hex: '#22c55e', rgb: '34, 197, 94' },
        'red': { hex: '#ef4444', rgb: '239, 68, 68' },
        'indigo': { hex: '#6366f1', rgb: '99, 102, 241' },
    };
    const theme = colorMap[color] || colorMap['blue'];
    doc.style.setProperty('--accent-color', theme.hex);
    doc.style.setProperty('--accent-color-rgb', theme.rgb);
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

    if (currentRating === 'like') {
        stats.ratings.likes[gameId] = (stats.ratings.likes[gameId] || 1) - 1;
    } else if (currentRating === 'dislike') {
        stats.ratings.dislikes[gameId] = (stats.ratings.dislikes[gameId] || 1) - 1;
    }

    if (newRating === 'like') {
        stats.ratings.likes[gameId] = (stats.ratings.likes[gameId] || 0) + 1;
    } else if (newRating === 'dislike') {
        stats.ratings.dislikes[gameId] = (stats.ratings.dislikes[gameId] || 0) + 1;
    }

    if (newRating) {
        myGameRatings[gameId] = newRating;
    } else {
        delete myGameRatings[gameId];
    }
    
    setStorageData('myGameRatings', myGameRatings);
    setStorageData('hubStats', stats);
    
    updateModalStatsUI(gameId);
    renderAll();
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
    gameIframe.dataset.gameId = gameId;
    gameModal.classList.remove('hidden');

    updateModalStatsUI(gameId);
    
    localRecent = localRecent.filter(id => id !== gameId);
    localRecent.unshift(gameId);
    setStorageData('localRecent', localRecent);
    
    renderRecentlyPlayed();
}

function closeGameModal() {
    if (!gameModal || !gameIframe) return;
    gameModal.classList.add('hidden');
    gameIframe.src = '';
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
        allGames[id] = { ...allGames[id], ...gameData, created: allGames[id].created };
        customAlert(`Game "${title}" updated!`, "Success", "success");
    } else {
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
    switchPage('admin');
    gameTitleInput.focus();
}

async function deleteGame(gameId) {
    if (!gameId || !allGames[gameId]) return;

    const confirmed = await customAlert(`Are you sure you want to delete "${allGames[gameId].title}"?`, "Confirm Deletion", "confirm");
    
    if (confirmed) {
        delete allGames[gameId];
        setStorageData('hubGames', allGames);
        
        delete stats.counts[gameId];
        delete stats.ratings.likes[gameId];
        delete stats.ratings.dislikes[gameId];
        setStorageData('hubStats', stats);
        
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
                applySettings();
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
        favicon.href = newFavicon;
        appWrapper.style.display = 'none';
        isCloaked = true;
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
    
    let tempAvatar = hubUser.avatar;

    userAvatarGrid.innerHTML = avatars.map(av => `
        <button class="avatar-btn ${hubUser.avatar === av ? 'avatar-selected' : ''}" data-avatar="${escapeHtmlAttr(av)}">
            ${escapeHtml(av)}
        </button>
    `).join('');

    userAvatarGrid.querySelectorAll('.avatar-btn').forEach(btn => {
        btn.onclick = () => {
            userAvatarGrid.querySelectorAll('.avatar-btn').forEach(b => b.classList.remove('active-avatar')); // Use a unique class
            btn.classList.add('active-avatar');
            tempAvatar = btn.dataset.avatar;
        };
    });
    
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

/**
 * This is the main execution block. It waits for the HTML to be fully loaded
 * before finding elements and attaching listeners.
 */
document.addEventListener('DOMContentLoaded', () => {

    // --- DOM ELEMENT ASSIGNMENTS ---
    // All element selections are now safely inside the listener
    doc = document.documentElement;
    appWrapper = $("appWrapper");
    favicon = $("favicon");
    desktopNav = $("desktopNav");
    mobileNav = $("mobileNav");
    mobileMenuButton = $("mobileMenuButton");
    gameSectionsContainer = $("gameSectionsContainer");
    authStatus = $("authStatus");
    authMessage = $("authMessage");
    themeToggle = $("themeToggle"); 
    userProfileButton = $("userProfileButton");
    userProfileAvatar = $("userProfileAvatar");
    userProfileName = $("userProfileName");
    loadingModal = $("loadingModal");
    pages = document.querySelectorAll(".page");
    pageHome = $("page-home");
    homeDesc = $("homeDesc");
    featuredGameContainer = $("featuredGameContainer");
    recentlyPlayedGrid = $("recentlyPlayedGrid");
    favoritesGrid = $("favoritesGrid");
    pageFavorites = $("page-favorites");
    pageTags = $("page-tags");
    tagsPageGrid = $("tagsPageGrid");
    adminPanel = $("page-admin");
    adminLogin = $("adminLogin");
    adminPasswordInput = $("adminPasswordInput");
    adminLoginBtn = $("adminLoginBtn");
    adminTools = $("adminTools");
    gameForm = $("gameForm");
    gameIdInput = $("gameIdInput");
    gameTitleInput = $("gameTitleInput");
    gameSectionInput = $("gameSectionInput");
    gameDescriptionInput = $("gameDescriptionInput");
    gameTagsInput = $("gameTagsInput");
    gameUrlInput = $("gameUrlInput");
    saveGameBtn = $("saveGameBtn");
    clearFormBtn = $("clearFormBtn");
    existingGamesList = $("existingGamesList");
    exportDataBtn = $("exportDataBtn");
    importDataBtn = $("importDataBtn");
    importFileInput = $("importFileInput");
    alertModal = $("customModalContainer");
    gameModal = $("gameModal");
    modalGameTitle = $("modalGameTitle");
    gameIframe = $("gameIframe");
    modalCloseBtn = $("modalCloseBtn");
    modalNewWindowBtn = $("modalNewWindowBtn");
    modalLikeBtn = $("modalLikeBtn");
    modalDislikeBtn = $("modalDislikeBtn");
    modalFavoriteBtn = $("modalFavoriteBtn");
    likeCountSpan = $("likeCount");
    dislikeCountSpan = $("dislikeCount");
    userProfileModal = $("userProfileModal");
    userNicknameInput = $("userNicknameInput");
    userAvatarGrid = $("userAvatarGrid");
    userProfileSaveBtn = $("userProfileSaveBtn");
    userProfileCancelBtn = $("userProfileCancelBtn");
    settingsModal = $("settingsModal");
    settingsButton = $("settingsButton");
    settingsSaveBtn = $("settingsSaveBtn");
    hubDescriptionInput = $("hubDescriptionInput");
    cloakTitleInput = $("cloakTitleInput");
    cloakFaviconInput = $("cloakFaviconInput");
    saveCloakSettingsBtn = $("saveCloakSettingsBtn");
    panicButton = $("panicButton");

    // --- ATTACH EVENT LISTENERS ---
    // Now that all functions are defined globally and elements are found,
    // we can safely attach the listeners.

    // General Navigation
    document.addEventListener('click', (e) => {
        const link = e.target.closest('.page-link');
        if (link && link.dataset.page) {
            switchPage(link.dataset.page);
        }
    });
    
    // Theme Toggle
    if(themeToggle) themeToggle.onclick = toggleTheme;
    
    // Mobile Menu
    if(mobileMenuButton) mobileMenuButton.onclick = () => mobileNav.classList.toggle('hidden');
    if(mobileNav) mobileNav.onclick = (e) => {
        if (e.target === mobileNav || e.target.closest('.page-link')) {
            mobileNav.classList.add('hidden');
        }
    };

    // Game Modal Listeners
    if(modalCloseBtn) modalCloseBtn.onclick = closeGameModal;
    if(modalNewWindowBtn) modalNewWindowBtn.onclick = () => {
        if (currentGameUrl) window.open(currentGameUrl, '_blank');
    };
    if(gameModal) gameModal.onclick = (e) => {
        if (e.target === gameModal) closeGameModal();
    };
    
    // Game Interaction Buttons
    if(modalLikeBtn) modalLikeBtn.onclick = () => {
        const gameId = extractGameIdFromIframe();
        if (gameId) updateGameStats(gameId, 'like');
    };
    if(modalDislikeBtn) modalDislikeBtn.onclick = () => {
        const gameId = extractGameIdFromIframe();
        if (gameId) updateGameStats(gameId, 'dislike');
    };
    if(modalFavoriteBtn) modalFavoriteBtn.onclick = () => {
        const gameId = extractGameIdFromIframe();
        if (gameId) toggleFavorite(gameId);
    };
    
    // Game Card Click Handler (Event Delegation)
    const pageContent = $("pageContent");
    if(pageContent) pageContent.addEventListener('click', (e) => {
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
        
        const tagBtn = e.target.closest('#tagsPageGrid .tag-filter-btn');
        if(tagBtn) {
             customAlert(`Filtering by tag: ${tagBtn.dataset.tag} (Feature coming soon!)`, "Filter", "info");
        }
    });

    // User Profile Modal
    if(userProfileButton) userProfileButton.onclick = openUserProfileModal;
    if(userProfileCancelBtn) userProfileCancelBtn.onclick = ()D => userProfileModal.classList.add('hidden');
    // Save button is assigned inside renderAvatarGrid

    // Settings Modal
    if(settingsButton) settingsButton.onclick = () => settingsModal.classList.remove('hidden');
    if(settingsSaveBtn) settingsSaveBtn.onclick = () => {
         if (hubDescriptionInput && settings.hubDescription !== hubDescriptionInput.value) {
             settings.hubDescription = hubDescriptionInput.value.trim();
             setStorageData('hubSettings', settings);
             applySettings();
         }
         settingsModal.classList.add('hidden');
    };
    
    // Safety Features
    if(panicButton) panicButton.onclick = handlePanic;
    if(saveCloakSettingsBtn) saveCloakSettingsBtn.onclick = saveCloakSettings;
    document.body.onkeyup = (e) => {
         if (e.key === 'f' || e.key === 'F') {
             if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                 handlePanic();
             }
         }
    };

    // Admin: Login
    if(adminLoginBtn) adminLoginBtn.onclick = handleAdminLogin;
    if(adminPasswordInput) adminPasswordInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') handleAdminLogin();
    });

    // Admin: Game Management
    if(saveGameBtn) saveGameBtn.onclick = saveGame;
    if(clearFormBtn) clearFormBtn.onclick = clearAddForm;
    
    if(existingGamesList) existingGamesList.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.admin-edit-btn');
        const deleteBtn = e.target.closest('.admin-delete-btn');
        
        if (editBtn) editGame(editBtn.dataset.gameId);
        if (deleteBtn) deleteGame(deleteBtn.dataset.gameId);
    });

    // Admin: Data
    if(exportDataBtn) exportDataBtn.onclick = exportData;
    if(importDataBtn) importDataBtn.onclick = () => importFileInput.click();
    if(importFileInput) importFileInput.onchange = (e) => {
        if (e.target.files.length > 0) {
            importData(e.target.files[0]);
        }
    };

    // --- MAIN INITIALIZATION CALL ---
    // This starts the entire application
    initialize();
});
