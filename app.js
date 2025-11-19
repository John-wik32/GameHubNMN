// --- GLOBAL STATE ---
let allGames = {};
let settings = {};
let stats = { 
    counts: {}, 
    recent: [],
    ratings: { like: {}, dislike: {} }, // Stores all users' ratings globally
    reports: {} 
};
let localRecent = []; // For storing recently played game IDs locally
let myFavorites = []; // For storing favorite game IDs
let myGameNotes = {}; // For private game notes
let myGameRatings = {}; // Stores the current user's rating for each game
let hubUser = { nickname: 'Player', avatar: '🎮' }; // User profile
let currentTheme = 'light'; // For theme
let isCloaked = false; // For panic button
let currentTags = []; // For tag filtering
let currentGameSort = 'name'; // For sorting
let currentSearchQuery = ''; // For searching
let currentGameUrl = null; // For game modal
let currentModalGameId = null; // Stores the ID of the game currently in the modal
const NEW_GAME_DAYS = 7; // How many days a game counts as "new"
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
 * Saves data to localStorage as a JSON string.
 * @param {string} key The key to save under.
 * @param {*} value The data to save.
 */
function setStorageData(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.error(`Failed to set localStorage key "${key}":`, e);
    }
}

// --- DOM UTILITY ---
const $ = (id) => document.getElementById(id);

// --- DEFAULT GAME DATA ---
const defaultGames = {
    'g_subway_surfers': {
        title: 'Subway Surfers',
        url: 'https://cdn.jsdelivr.net/gh/bubbls/UGS-file-encryption@ae2e3923116cf101ff4d6ddbeec12df3dc78f133/subway-surfers.html',
        image: 'https://placehold.co/400x300/f87171/ffffff?text=Subway+Surfers',
        description: 'Run and dodge trains in this endless runner classic!',
        section: 'featured',
        tags: ['runner', 'mobile', 'action'],
        created: '2024-10-20T10:00:00.000Z'
    },
    'g_slope': {
        title: 'Slope',
        url: 'https://cdn.jsdelivr.net/gh/bubbls/UGS-file-encryption@ae2e3923116cf101ff4d6ddbeec12df3dc78f133/slope.html',
        image: 'https://placehold.co/400x300/4f46e5/ffffff?text=Slope',
        description: 'Guide a ball down a steep slope, avoid obstacles, and set a high score.',
        section: 'recommended',
        tags: ['3d', 'skill', 'endless'],
        created: '2024-10-25T10:00:00.000Z'
    },
    'g_tunnel_rush': {
        title: 'Tunnel Rush',
        url: 'https://cdn.jsdelivr.net/gh/bubbls/UGS-file-encryption@ae2e3923116cf101ff4d6ddbeec12df3dc78f133/tunnel-rush.html',
        image: 'https://placehold.co/400x300/10b981/ffffff?text=Tunnel+Rush',
        description: 'Race through a psychedelic tunnel, dodging geometric obstacles.',
        section: 'recommended',
        tags: ['3d', 'skill', 'fast-paced'],
        created: '2024-11-01T10:00:00.000Z'
    },
    // Game added from user's snippet
    'g_penalty_kicks': {
        title: 'Penalty Kicks (Flash)',
        url: 'https://cdn.jsdelivr.net/gh/bubbls/UGS-file-encryption@ae2e3923116cf101ff4d6ddbeec12df3dc78f133/penalty-kicks.swf',
        image: 'https://placehold.co/400x300/1e40af/ffffff?text=Penalty+Kicks',
        description: 'Test your nerve and accuracy in this classic soccer penalty shootout game. Requires Ruffle (Flash player emulator).',
        section: 'sports',
        tags: ['sports', 'soccer', 'flash'],
        created: '2024-11-18T10:00:00.000Z'
    },
};

// --- CONSTANTS ---
const AVATARS = ['🎮', '👾', '🚀', '🤖', '🐱', '🐶', '🍕', '⚽', '👑', '🧙'];
const ACCENT_COLORS = {
    'Blue': { hex: '#3b82f6', rgb: '59, 130, 246' }, // blue-500
    'Green': { hex: '#10b981', rgb: '16, 185, 129' }, // emerald-500
    'Purple': { hex: '#8b5cf6', rgb: '139, 92, 246' }, // violet-500
    'Red': { hex: '#ef4444', rgb: '239, 68, 68' }, // red-500
};

// --- INIT AND SETUP ---

/**
 * Initializes the application state by loading from localStorage.
 */
function initialize() {
    // Load all state variables from localStorage, providing defaults
    allGames = getStorageData('hubGames', defaultGames);
    settings = getStorageData('hubSettings', { 
        theme: 'light', 
        accent: 'Blue', 
        cloakTitle: 'Google Docs', 
        cloakFavicon: '📄' 
    });
    stats = getStorageData('hubStats', stats);
    hubUser = getStorageData('hubUser', hubUser);
    myFavorites = getStorageData('myFavorites', myFavorites);
    myGameNotes = getStorageData('myGameNotes', myGameNotes);
    myGameRatings = getStorageData('myGameRatings', myGameRatings);
    
    // Initialize stats collections if they don't exist (safety)
    stats.counts = stats.counts || {};
    stats.recent = stats.recent || [];
    stats.ratings = stats.ratings || { like: {}, dislike: {} };

    // Apply initial settings
    currentTheme = settings.theme;
    updateTheme(currentTheme, false); // Apply theme without saving
    updateAccentColor(settings.accent, false); // Apply accent without saving

    // Set up tags from all games
    const allTags = new Set();
    Object.values(allGames).forEach(game => {
        (game.tags || []).forEach(tag => allTags.add(tag));
    });
    currentTags = Array.from(allTags).sort();

    // Load recent games locally for accurate count
    localRecent = getStorageData('localRecent', []);

    // Set initial search/sort state
    currentSearchQuery = '';
    currentGameSort = 'name';

    // Initial render
    renderAll();
}

/**
 * Updates the theme globally and saves the setting.
 * @param {'light'|'dark'} theme 
 * @param {boolean} save Whether to save to settings (default true)
 */
function updateTheme(theme, save = true) {
    currentTheme = theme;
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }

    if (save) {
        settings.theme = theme;
        setStorageData('hubSettings', settings);
    }
}

/**
 * Updates the CSS variables for the accent color.
 * @param {string} colorName 
 * @param {boolean} save Whether to save to settings (default true)
 */
function updateAccentColor(colorName, save = true) {
    const color = ACCENT_COLORS[colorName];
    if (!color) return;

    document.documentElement.style.setProperty('--accent-color', color.hex);
    document.documentElement.style.setProperty('--accent-color-rgb', color.rgb);

    if (save) {
        settings.accent = colorName;
        setStorageData('hubSettings', settings);
    }
}

// --- RENDERING FUNCTIONS ---

/**
 * Renders the entire application content based on the current view.
 */
function renderAll() {
    renderNavigation();
    renderTagFilters();
    renderPageContent();
    lucide.createIcons();
}

/**
 * Renders the nickname and avatar in the header.
 */
function renderNavigation() {
    const profileBtn = $('profileBtn');
    if (profileBtn) {
        profileBtn.innerHTML = `<span class="text-xl">${hubUser.avatar}</span>`;
    }
}

/**
 * Renders the filterable tags above the game list.
 */
function renderTagFilters() {
    const tagFiltersEl = $('tagFilters');
    if (!tagFiltersEl) return;
    
    // The "All" button
    const isAllActive = currentTags.length === 0 || currentTags.every(tag => tag.active === false);
    let html = `<button onclick="clearTagFilters()" class="tag-button ${isAllActive ? 'bg-accent text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}">All</button>`;
    
    // Other tag buttons
    html += currentTags.map(tag => {
        const isActive = tag.active;
        return `<button onclick="toggleTagFilter('${tag.name}')" class="tag-button ${isActive ? 'bg-accent text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}">
            ${tag.name}
        </button>`;
    }).join('');
    
    tagFiltersEl.innerHTML = html;
}


/**
 * Renders all game sections and cards.
 */
function renderPageContent() {
    const gameContentEl = $('gameContent');
    if (!gameContentEl) return;
    
    const gamesArray = Object.keys(allGames).map(id => ({ ...allGames[id], id }));
    const processedGames = processGames(gamesArray);
    
    // Group games by section
    const sections = processedGames.reduce((acc, game) => {
        const sectionName = game.section || 'other';
        acc[sectionName] = acc[sectionName] || [];
        acc[sectionName].push(game);
        return acc;
    }, {});

    let html = '';
    const sectionOrder = ['featured', 'recommended', 'sports', 'other'];

    sectionOrder.forEach(sectionKey => {
        const sectionGames = sections[sectionKey];
        if (sectionGames && sectionGames.length > 0) {
            const sectionTitle = sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1);
            html += `
                <section class="game-section" id="section-${sectionKey}">
                    <h2 class="text-2xl font-bold mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">${sectionTitle}</h2>
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        ${sectionGames.map(game => renderGameCard(game.id)).join('')}
                    </div>
                </section>
            `;
        }
    });

    // Handle No Results
    if (processedGames.length === 0 && currentSearchQuery) {
        html = `
            <div class="text-center py-12">
                <i data-lucide="frown" class="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600"></i>
                <h3 class="text-xl font-semibold text-gray-700 dark:text-gray-300">No Games Found</h3>
                <p class="mt-2 text-gray-500 dark:text-gray-500">Try a different search query or clear your filters.</p>
            </div>
        `;
    }

    gameContentEl.innerHTML = html;
}

/**
 * Renders a single game card HTML string.
 * @param {string} gameId The ID of the game to render.
 * @returns {string} The HTML string for the game card.
 */
function renderGameCard(gameId) {
    const game = allGames[gameId];
    if (!game) return '';

    const isFav = myFavorites.includes(gameId);
    const dateAdded = new Date(game.created);
    const isNew = (new Date() - dateAdded) / (1000 * 60 * 60 * 24) < NEW_GAME_DAYS;

    // Rating information
    const userRating = myGameRatings[gameId];
    // Calculate total likes/dislikes for this specific game (approximate for card view)
    const likeCount = Object.keys(stats.ratings.like || {}).filter(id => id === gameId).length;
    const dislikeCount = Object.keys(stats.ratings.dislike || {}).filter(id => id === gameId).length;
    
    const likeActive = userRating === 'like' ? 'text-accent fill-accent' : 'text-gray-400 dark:text-gray-500 hover:text-accent';
    const dislikeActive = userRating === 'dislike' ? 'text-red-500 fill-red-500' : 'text-gray-400 dark:text-gray-500 hover:text-red-500';

    // The entire card is clickable to open the modal
    return `
        <div id="game-card-${gameId}" data-game-id="${gameId}" class="game-card group relative bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden cursor-pointer border border-gray-100 dark:border-gray-700">
            <div class="relative w-full h-48 overflow-hidden">
                <img src="${game.image}" alt="${game.title}" class="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-80" onerror="this.onerror=null;this.src='https://placehold.co/400x300/4f46e5/ffffff?text=Image+Missing';">
                ${isNew ? '<span class="absolute top-2 left-2 bg-yellow-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-md z-10">NEW</span>' : ''}
                <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300"></div>
                
                <!-- Favorite Button Overlay -->
                <button onclick="toggleFavorite('${gameId}'); event.stopPropagation();" class="absolute top-2 right-2 p-1.5 rounded-full bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm shadow-md hover:bg-white dark:hover:bg-gray-900 transition-colors z-20">
                    <i data-lucide="heart" class="w-5 h-5 ${isFav ? 'fill-red-500 text-red-500' : 'text-gray-500 dark:text-gray-300'}"></i>
                </button>
            </div>
            
            <div class="p-4">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white truncate" title="${game.title}">${game.title}</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">${game.description}</p>
                
                <!-- Rating and Play Count -->
                <div class="flex justify-between items-center mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <!-- Play Count -->
                    <div class="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <i data-lucide="play" class="w-4 h-4 mr-1"></i>
                        <span>${stats.counts[gameId] || 0} Plays</span>
                    </div>

                    <!-- Rating Buttons (for quick card interaction) -->
                    <div class="flex items-center space-x-3">
                        <span class="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <i data-lucide="thumbs-up" class="w-4 h-4 mr-0.5 ${likeActive}"></i>
                            <span class="text-gray-600 dark:text-gray-300">${likeCount}</span>
                        </span>
                        <span class="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <i data-lucide="thumbs-down" class="w-4 h-4 mr-0.5 ${dislikeActive}"></i>
                            <span class="text-gray-600 dark:text-gray-300">${dislikeCount}</span>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// --- STATS AND INTERACTION LOGIC ---

/**
 * Increments the play count for a game and records it as recently played.
 * @param {string} gameId 
 */
function updateGameStats(gameId) {
    // 1. Update global play count
    stats.counts[gameId] = (stats.counts[gameId] || 0) + 1;

    // 2. Update global recent list (limit to 10)
    stats.recent = stats.recent.filter(id => id !== gameId);
    stats.recent.unshift(gameId);
    stats.recent = stats.recent.slice(0, 10);

    // 3. Update local recent list (for card rendering, limit to 5)
    localRecent = localRecent.filter(id => id !== gameId);
    localRecent.unshift(gameId);
    localRecent = localRecent.slice(0, 5);
    
    // Save everything
    setStorageData('hubStats', stats);
    setStorageData('localRecent', localRecent);

    // Update the UI if the modal is open
    if (currentModalGameId === gameId) {
        updateModalStatsUI(gameId);
    }
}

/**
 * Toggles the user's favorite status for a game.
 * @param {string} gameId 
 */
function toggleFavorite(gameId) {
    if (!allGames[gameId]) return;
    const index = myFavorites.indexOf(gameId);
    if (index > -1) {
        myFavorites.splice(index, 1);
        customAlert(`Removed ${allGames[gameId].title} from favorites.`, "Removed", "info");
    } else {
        myFavorites.push(gameId);
        customAlert(`Added ${allGames[gameId].title} to favorites!`, "Favorited", "success");
    }
    setStorageData('myFavorites', myFavorites);
    renderAll(); // Re-render to update the heart icon on the card
    if (currentModalGameId === gameId) {
        updateModalStatsUI(gameId); // Update the heart icon in the modal
    }
}

/**
 * Toggles the user's rating (like/dislike) for a specific game.
 * @param {string} gameId The ID of the game.
 * @param {'like'|'dislike'} type The rating type.
 */
function toggleGameRating(gameId, type) {
    if (!allGames[gameId]) return;

    const currentRating = myGameRatings[gameId];
    const gameTitle = allGames[gameId].title;

    // Initialize stats structure if needed
    stats.ratings.like = stats.ratings.like || {};
    stats.ratings.dislike = stats.ratings.dislike || {};

    const newRating = type;

    if (currentRating === newRating) {
        // Toggling off the same rating
        delete myGameRatings[gameId];
        delete stats.ratings[currentRating][gameId];
        customAlert(`Rating removed for ${gameTitle}.`, "Removed", "info");
    } else {
        // Remove old rating if it exists
        if (currentRating) {
            delete stats.ratings[currentRating][gameId];
        }
        
        myGameRatings[gameId] = newRating; // Set new user rating
        stats.ratings[newRating][gameId] = true; // Add to new type
        customAlert(`Rated ${gameTitle} as ${newRating}!`, "Rated", "success");
    }

    setStorageData('hubStats', stats);
    setStorageData('myGameRatings', myGameRatings);
    
    // Re-render all to update the card, and update modal if open
    renderAll(); 
    if (currentModalGameId === gameId) {
        updateModalStatsUI(gameId); 
    }
}


// --- GAME MODAL LOGIC ---

/**
 * **CRITICAL FIX LOCATION**
 * Updates the modal UI elements (stats, favorite status, rating status) for the current game.
 * @param {string} gameId 
 */
function updateModalStatsUI(gameId) {
    const game = allGames[gameId];
    if (!game) return;

    // Element references. Added null checks below to prevent the reported TypeError.
    const statsCountEl = $('modalStatsCount');
    const favBtn = $('modalFavoriteBtn');
    const likeBtn = $('modalLikeBtn');
    const dislikeBtn = $('modalDislikeBtn');
    const noteBtn = $('modalNoteBtn');
    const noteArea = $('modalNoteArea'); // Also adding a check for this element

    // --- CRITICAL NULL CHECK TO PREVENT CRASHES ---
    if (!statsCountEl || !favBtn || !likeBtn || !dislikeBtn || !noteBtn || !noteArea) {
        console.error("Game Modal UI elements are missing. Cannot update stats UI. (This is the fix for the reported TypeError.)");
        return; 
    }
    // ---------------------------------------------
    
    const isFav = myFavorites.includes(gameId);
    const userRating = myGameRatings[gameId];
    const likeCount = Object.keys(stats.ratings.like || {}).filter(id => id === gameId).length;
    const dislikeCount = Object.keys(stats.ratings.dislike || {}).filter(id => id === gameId).length;
    const hasNote = !!myGameNotes[gameId];
    
    // 1. Update Play Count
    statsCountEl.innerHTML = `<i data-lucide="play" class="w-4 h-4 mr-1"></i><span>${stats.counts[gameId] || 0}</span>`;

    // 2. Update Favorite Button
    favBtn.innerHTML = `<i data-lucide="heart" class="w-5 h-5 ${isFav ? 'fill-red-500 text-red-500' : 'text-gray-500 dark:text-gray-400'}"></i>`;
    favBtn.title = isFav ? 'Remove from Favorites' : 'Add to Favorites';

    // 3. Update Like Button
    likeBtn.innerHTML = `<i data-lucide="thumbs-up" class="w-5 h-5 ${userRating === 'like' ? 'fill-accent text-accent' : 'text-gray-500 dark:text-gray-400'}"></i><span class="ml-1 text-sm">${likeCount}</span>`;
    likeBtn.title = userRating === 'like' ? 'Remove Like' : 'Like Game';

    // 4. Update Dislike Button
    dislikeBtn.innerHTML = `<i data-lucide="thumbs-down" class="w-5 h-5 ${userRating === 'dislike' ? 'fill-red-500 text-red-500' : 'text-gray-500 dark:text-gray-400'}"></i><span class="ml-1 text-sm">${dislikeCount}</span>`;
    dislikeBtn.title = userRating === 'dislike' ? 'Remove Dislike' : 'Dislike Game';

    // 5. Update Note Button
    if (hasNote) {
        noteBtn.innerHTML = `<i data-lucide="sticky-note" class="w-5 h-5 fill-yellow-400 text-yellow-500"></i>`;
        noteBtn.title = 'Edit Note (Saved)';
    } else {
        noteBtn.innerHTML = `<i data-lucide="sticky-note" class="w-5 h-5 text-gray-500 dark:text-gray-400"></i>`;
        noteBtn.title = 'Add Note';
        noteArea.classList.add('hidden'); // Hide note area by default if no note
    }
    
    lucide.createIcons(); // Re-render icons after changing content
}

/**
 * Opens the game modal and loads the game.
 * @param {string} gameId 
 */
function openGameModal(gameId) {
    const game = allGames[gameId];
    if (!game) return;

    currentModalGameId = gameId;

    const modal = $('gameModal');
    const titleEl = $('modalTitle');
    const tagsEl = $('modalTags');
    const descEl = $('modalDescription');
    const iframe = $('modalGameIframe');
    const noteTextarea = $('modalNoteText');
    const noteArea = $('modalNoteArea');
    
    // 1. Populate modal content
    titleEl.textContent = game.title;
    descEl.textContent = game.description;
    
    tagsEl.innerHTML = (game.tags || []).map(tag => 
        `<span class="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">${tag}</span>`
    ).join('');

    // 2. Load game into iframe
    const url = game.url;
    
    // For flash content, we load a wrapper HTML file that loads Ruffle.js
    if (url.endsWith('.swf')) {
        // This is a common pattern for loading SWF with Ruffle
        const ruffleWrapper = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body, html { margin: 0; padding: 0; width: 100%; height: 100%; background-color: #1f2937; overflow: hidden; }
                    #ruffle-container { width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; }
                </style>
                <script src="https://cdn.jsdelivr.net/gh/u-cvlassrom-y/google@main/ruffle.js"></script>
            </head>
            <body>
                <div id="ruffle-container">
                    <object width="100%" height="100%">
                        <param name="movie" value="${url}">
                        <embed src="${url}" width="100%" height="100%">
                    </object>
                </div>
                <script>
                    window.RufflePlayer = window.RufflePlayer || {};
                    window.RufflePlayer.config = {
                        "autoplay": "on",
                        "unmute-on-click": true,
                        "base": "${url.substring(0, url.lastIndexOf('/') + 1)}",
                        "allow-script-access": true,
                        "quality": "high",
                        "force-embedded-layout": true,
                    };
                    window.addEventListener("load", () => {
                        const ruffle = window.RufflePlayer.newest();
                        const player = ruffle.unmute().play();
                        
                        // Check if the game is embedded or an external SWF file
                        const target = document.querySelector('embed') || document.querySelector('object');
                        if(target) {
                             const container = document.getElementById('ruffle-container');
                             ruffle.load(target, {}).then((player) => {
                                 player.style.width = '100%';
                                 player.style.height = '100%';
                                 container.innerHTML = '';
                                 container.appendChild(player);
                             });
                        }
                    });
                </script>
            </body>
            </html>
        `;
        iframe.srcdoc = ruffleWrapper;
    } else {
        iframe.src = url;
    }

    // 3. Load note
    noteTextarea.value = myGameNotes[gameId] || '';
    if (myGameNotes[gameId]) {
         noteArea.classList.remove('hidden');
    } else {
        noteArea.classList.add('hidden');
    }
    
    // 4. Update stats and UI
    updateGameStats(gameId); // Increments count and updates modal stats
    updateModalStatsUI(gameId); 

    // 5. Show modal
    modal.classList.remove('opacity-0', 'pointer-events-none');
    modal.querySelector('.transform').classList.remove('scale-95');
}

/**
 * Closes the game modal and stops the game.
 */
function closeGameModal() {
    const modal = $('gameModal');
    const iframe = $('modalGameIframe');
    
    // Stop the game by resetting iframe src
    iframe.src = 'about:blank';
    currentModalGameId = null;

    // Hide modal
    modal.classList.add('opacity-0', 'pointer-events-none');
    modal.querySelector('.transform').classList.add('scale-95');
    
    renderAll(); // Re-render to update the play count on the card
}

// --- CLOAKING (PANIC BUTTON) LOGIC ---

/**
 * Toggles the cloak state (panic mode).
 */
function toggleCloak() {
    isCloaked = !isCloaked;
    const favicon = $('favicon');
    const appTitle = $('appTitle');
    
    if (isCloaked) {
        document.title = settings.cloakTitle;
        favicon.href = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${settings.cloakFavicon}</text></svg>`;
        document.body.classList.add('cloaked-mode'); // Use a class for full page styling if needed
        customAlert('Cloaked mode activated!', "Shhh!", "info");
    } else {
        document.title = "Unblocked Game Hub";
        favicon.href = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🎮</text></svg>`;
        document.body.classList.remove('cloaked-mode');
        customAlert('Cloaked mode deactivated.', "Welcome Back", "info");
    }
}

// --- UTILITIES ---

/**
 * Custom alert function to display temporary messages.
 * @param {string} message 
 * @param {string} title 
 * @param {'success'|'info'|'error'} type 
 */
function customAlert(message, title, type = 'success') {
    const modal = $('customAlertModal');
    const titleEl = $('alertTitle');
    const messageEl = $('alertMessage');
    const iconEl = $('alertIcon');
    const alertBox = modal.querySelector('div[role="alert"]');
    
    if (!modal || !titleEl || !messageEl || !iconEl || !alertBox) {
        console.warn('Alert modal elements not found.');
        return;
    }

    let colorClass, iconName;
    
    switch (type) {
        case 'success':
            colorClass = 'border-accent';
            iconName = 'check-circle';
            break;
        case 'error':
            colorClass = 'border-red-500';
            iconName = 'x-circle';
            break;
        case 'info':
        default:
            colorClass = 'border-blue-500';
            iconName = 'info';
            break;
    }

    // Reset classes
    alertBox.className = alertBox.className.replace(/border-(accent|red|blue)-\d{3}/g, '');
    alertBox.classList.add(colorClass);

    titleEl.textContent = title;
    messageEl.textContent = message;
    iconEl.setAttribute('data-lucide', iconName);
    lucide.createIcons(); // Update the icon

    // Show alert
    modal.classList.remove('opacity-0', 'translate-y-4', 'pointer-events-none');

    // Hide after 3 seconds
    setTimeout(() => {
        modal.classList.add('opacity-0', 'translate-y-4', 'pointer-events-none');
    }, 3000);
}


// --- FILTERING AND SORTING ---

/**
 * Filters and sorts an array of game objects based on global state.
 * @param {Array<Object>} games - The array of game objects to process.
 * @returns {Array<Object>} The filtered and sorted array of games.
 */
function processGames(games) {
    let processed = games;

    // 1. Filter by Active Tags
    const activeTags = currentTags.filter(tag => tag.active).map(tag => tag.name);
    if (activeTags.length > 0) {
        processed = processed.filter(game => 
            activeTags.every(activeTag => (game.tags || []).includes(activeTag))
        );
    }
    
    // 2. Filter by Search Query
    if (currentSearchQuery) {
        const query = currentSearchQuery.toLowerCase();
        processed = processed.filter(game => 
            game.title.toLowerCase().includes(query) || 
            (game.description || '').toLowerCase().includes(query) ||
            (game.tags || []).some(tag => tag.toLowerCase().includes(query))
        );
    }

    // 3. Sort
    switch (currentGameSort) {
        case 'newest':
            processed.sort((a, b) => new Date(b.created || 0) - new Date(a.created || 0));
            break;
        case 'mostPlayed':
            processed.sort((a, b) => (stats.counts[b.id] || 0) - (stats.counts[a.id] || 0));
            break;
        case 'name':
        default:
            processed.sort((a, b) => a.title.localeCompare(b.title));
            break;
    }

    return processed;
}

/**
 * Toggles a single tag filter.
 * @param {string} tagName 
 */
function toggleTagFilter(tagName) {
    const tag = currentTags.find(t => t.name === tagName);
    if (tag) {
        tag.active = !tag.active;
    }
    renderAll();
}

/**
 * Clears all active tag filters.
 */
function clearTagFilters() {
    currentTags.forEach(tag => tag.active = false);
    renderAll();
}


// --- ADMIN & DATA MANAGEMENT ---

/**
 * Clears the add/edit game form.
 */
function clearAddForm() {
    $('addGameForm').reset();
    $('gameIdInput').value = '';
    $('saveGameBtn').textContent = 'Add Game';
    $('saveGameBtn').classList.remove('bg-yellow-600', 'hover:bg-yellow-700');
    $('saveGameBtn').classList.add('bg-accent', 'hover:opacity-90');
    customAlert('Form cleared.', "Ready", "info");
}

/**
 * Exports all application data as a JSON file.
 */
function exportData() {
    const exportData = {
        games: allGames,
        settings: settings,
        stats: stats,
        user: hubUser,
        favorites: myFavorites,
        notes: myGameNotes,
        ratings: myGameRatings
    };
    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `GameHub_Data_Export_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    customAlert('All data exported successfully!', "Export Complete", "success");
}

/**
 * Imports data from a JSON file.
 * @param {File} file 
 */
function importData(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            
            // Overwrite existing data with imported data
            allGames = imported.games || allGames;
            settings = imported.settings || settings;
            stats = imported.stats || stats;
            hubUser = imported.user || hubUser;
            myFavorites = imported.favorites || myFavorites;
            myGameNotes = imported.notes || myGameNotes;
            myGameRatings = imported.ratings || myGameRatings;

            // Save to localStorage
            setStorageData('hubGames', allGames);
            setStorageData('hubSettings', settings);
            setStorageData('hubStats', stats);
            setStorageData('hubUser', hubUser);
            setStorageData('myFavorites', myFavorites);
            setStorageData('myGameNotes', myGameNotes);
            setStorageData('myGameRatings', myGameRatings);

            // Re-init to update theme/accent and re-render
            initialize(); 
            customAlert('Data imported successfully! The hub has been reloaded.', "Import Complete", "success");
        } catch (error) {
            console.error("Error importing data:", error);
            customAlert(`Error importing data: ${error.message}`, "Import Error", "error");
        }
    };
    reader.onerror = () => {
        customAlert('Failed to read file.', "Import Error", "error");
    };
    reader.readAsText(file);
    // Reset file input so same file can be selected again
    $('importFileInput').value = '';
}


// --- EVENT LISTENERS ---

document.addEventListener('DOMContentLoaded', () => {
    try {
        // --- Modal Elements ---
        const gameModal = $('gameModal');
        const closeModalBtn = $('closeModalBtn');
        const modalNoteBtn = $('modalNoteBtn');
        const modalNoteSaveBtn = $('modalNoteSaveBtn');
        const modalNoteText = $('modalNoteText');
        const modalNoteArea = $('modalNoteArea');
        const profileModal = $('profileModal');
        const settingsModal = $('settingsModal');
        
        // --- Game Modal Event Handlers ---
        closeModalBtn.onclick = closeGameModal;
        modalNoteBtn.onclick = () => {
            if (modalNoteArea) {
                modalNoteArea.classList.toggle('hidden');
            }
        };
        modalNoteSaveBtn.onclick = () => {
            const gameId = currentModalGameId;
            if (gameId && modalNoteText && modalNoteArea) {
                const note = modalNoteText.value.trim();
                if (note) {
                    myGameNotes[gameId] = note;
                    customAlert('Note saved!', "Saved", "success");
                    updateModalStatsUI(gameId); // Update note button icon
                } else {
                    delete myGameNotes[gameId];
                    customAlert('Note cleared.', "Cleared", "info");
                    modalNoteArea.classList.add('hidden'); // Hide if cleared
                    updateModalStatsUI(gameId); // Update note button icon
                }
                setStorageData('myGameNotes', myGameNotes);
            }
        };
        
        // Modal Action Buttons (Rating, Favorite, Play Count)
        const modalFavoriteBtn = $('modalFavoriteBtn');
        const modalLikeBtn = $('modalLikeBtn');
        const modalDislikeBtn = $('modalDislikeBtn');

        // These handlers now rely on the fix in updateModalStatsUI for initial state,
        // but their event listeners must also use checks if the elements exist.
        if (modalLikeBtn) {
            modalLikeBtn.onclick = () => {
                if (currentModalGameId) toggleGameRating(currentModalGameId, 'like');
            };
        }
        if (modalDislikeBtn) {
            modalDislikeBtn.onclick = () => {
                if (currentModalGameId) toggleGameRating(currentModalGameId, 'dislike');
            };
        }
        if (modalFavoriteBtn) {
            modalFavoriteBtn.onclick = () => {
                if (currentModalGameId) toggleFavorite(currentModalGameId);
            };
        }


        // Global listener for opening the game modal from cards
        const appContainer = $('appContainer');
        if (appContainer) {
            appContainer.addEventListener('click', (e) => {
                let target = e.target;
                while (target !== appContainer && target !== null) {
                    if (target.classList.contains('game-card') && target.dataset.gameId) {
                        openGameModal(target.dataset.gameId);
                        break;
                    }
                    target = target.parentNode;
                }
            });
        }

        // --- Header and Controls ---
        $('sortSelect').onchange = (e) => { currentGameSort = e.target.value; renderAll(); };
        $('searchInput').oninput = (e) => { currentSearchQuery = e.target.value; renderAll(); };
        $('panicBtn').onclick = toggleCloak;

        // Panic Button (Q keypress)
        document.addEventListener('keydown', (e) => {
            // Check if user is typing in an input or textarea
            const isTyping = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';
            if (e.key === 'q' && !isTyping) {
                e.preventDefault();
                toggleCloak();
            }
        });

        // --- Profile Modal Logic ---
        const profileBtn = $('profileBtn');
        const userProfileSaveBtn = $('userProfileSaveBtn');
        const userProfileCancelBtn = $('userProfileCancelBtn');
        const userNicknameInput = $('userNicknameInput');
        const userAvatarGrid = $('userAvatarGrid');
        
        function openProfileModal() {
            if (!profileModal) return;
            userNicknameInput.value = hubUser.nickname;
            
            // Render avatar grid
            userAvatarGrid.innerHTML = AVATARS.map(avatar => 
                `<button type="button" class="avatar-btn ${hubUser.avatar === avatar ? 'active' : ''}" data-avatar="${avatar}">
                    ${avatar}
                </button>`
            ).join('');

            // Add avatar selection handler
            userAvatarGrid.querySelectorAll('.avatar-btn').forEach(btn => {
                btn.onclick = (e) => {
                    userAvatarGrid.querySelectorAll('.avatar-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                };
            });

            profileModal.classList.remove('opacity-0', 'pointer-events-none');
            profileModal.querySelector('.transform').classList.remove('scale-95');
        }

        function closeProfileModal() {
            if (!profileModal) return;
            profileModal.classList.add('opacity-0', 'pointer-events-none');
            profileModal.querySelector('.transform').classList.add('scale-95');
        }

        profileBtn.onclick = openProfileModal;
        userProfileCancelBtn.onclick = closeProfileModal;
        userProfileSaveBtn.onclick = () => {
            const newNickname = userNicknameInput.value.trim();
            const activeAvatarBtn = userAvatarGrid.querySelector('.avatar-btn.active');
            const newAvatar = activeAvatarBtn ? activeAvatarBtn.dataset.avatar : hubUser.avatar;
            
            if (newNickname) {
                hubUser.nickname = newNickname;
                hubUser.avatar = newAvatar;
                setStorageData('hubUser', hubUser);
                customAlert('Profile saved!', "Success", "success");
                renderNavigation(); // Update header avatar
                closeProfileModal();
            } else {
                customAlert('Nickname cannot be empty.', "Error", "error");
            }
        };

        // --- Settings/Admin Modal Logic ---
        const settingsCloseBtn = $('settingsCloseBtn');
        const settingsTabButtons = [$('tabGeneral'), $('tabAdmin')];
        const settingsContentAreas = [$('contentGeneral'), $('contentAdmin')];
        const themeRadios = [$('themeLight'), $('themeDark')];
        const accentColorGrid = $('accentColorGrid');
        const cloakTitleInput = $('cloakTitleInput');
        const cloakFaviconInput = $('cloakFaviconInput');
        const adminLoginBtn = $('adminLoginBtn');
        const adminPassInput = $('adminPassInput');
        const adminLoginArea = $('adminLoginArea');
        const adminToolsArea = $('adminToolsArea');
        const addGameForm = $('addGameForm');
        const clearFormBtn = $('clearFormBtn');
        const exportDataBtn = $('exportDataBtn');
        const importDataBtn = $('importDataBtn');
        const importFileInput = $('importFileInput');

        function openSettingsModal() {
            if (!settingsModal) return;
            
            // General Tab Setup
            (settings.theme === 'dark' ? $('themeDark') : $('themeLight')).checked = true;
            cloakTitleInput.value = settings.cloakTitle;
            cloakFaviconInput.value = settings.cloakFavicon;
            
            // Accent Color Grid
            accentColorGrid.innerHTML = Object.keys(ACCENT_COLORS).map(name => {
                const color = ACCENT_COLORS[name].hex;
                return `<button type="button" class="w-10 h-10 rounded-full border-4 ${settings.accent === name ? 'border-gray-900 dark:border-white' : 'border-transparent'}" style="background-color: ${color};" data-color-name="${name}" title="${name}"></button>`;
            }).join('');

            // Admin Tab Setup
            // Restore last active tab (default to General)
            settingsTabButtons.forEach(btn => {
                const tabName = btn.id.replace('tab', 'content');
                if (btn.classList.contains('border-accent')) {
                    settingsContentAreas.forEach(area => area.classList.add('hidden'));
                    $(tabName).classList.remove('hidden');
                }
            });

            // Check admin status
            if (sessionStorage.getItem('isAdmin') === 'true') {
                adminLoginArea.classList.add('hidden');
                adminToolsArea.classList.remove('hidden');
            } else {
                adminLoginArea.classList.remove('hidden');
                adminToolsArea.classList.add('hidden');
            }

            settingsModal.classList.remove('opacity-0', 'pointer-events-none');
            settingsModal.querySelector('.transform').classList.remove('scale-95');
        }

        function closeSettingsModal() {
            if (!settingsModal) return;
            settingsModal.classList.add('opacity-0', 'pointer-events-none');
            settingsModal.querySelector('.transform').classList.add('scale-95');
        }
        
        // Tab switching
        settingsTabButtons.forEach(btn => {
            btn.onclick = () => {
                settingsTabButtons.forEach(b => {
                    b.classList.remove('text-accent', 'border-accent');
                    b.classList.add('text-gray-500', 'dark:text-gray-400');
                });
                settingsContentAreas.forEach(c => c.classList.add('hidden'));

                btn.classList.add('text-accent', 'border-accent');
                btn.classList.remove('text-gray-500', 'dark:text-gray-400');
                
                const targetId = btn.id.replace('tab', 'content');
                $(targetId).classList.remove('hidden');
            };
        });

        $('settingsBtn').onclick = openSettingsModal;
        settingsCloseBtn.onclick = closeSettingsModal;

        // Theme and Accent changes
        themeRadios.forEach(radio => {
            radio.onchange = (e) => {
                updateTheme(e.target.value);
            };
        });
        accentColorGrid.onclick = (e) => {
            let target = e.target;
            while (target !== accentColorGrid && target !== null) {
                if (target.dataset.colorName) {
                    updateAccentColor(target.dataset.colorName);
                    // Update borders
                    accentColorGrid.querySelectorAll('button').forEach(btn => {
                        btn.classList.remove('border-gray-900', 'dark:border-white');
                        btn.classList.add('border-transparent');
                    });
                    target.classList.remove('border-transparent');
                    target.classList.add('border-gray-900', 'dark:border-white');
                    break;
                }
                target = target.parentNode;
            }
        };

        // Cloaking settings save
        cloakTitleInput.oninput = (e) => {
            settings.cloakTitle = e.target.value.trim() || 'Google Docs';
            setStorageData('hubSettings', settings);
        };
        cloakFaviconInput.oninput = (e) => {
            settings.cloakFavicon = e.target.value.trim().slice(0, 1) || '📄';
            setStorageData('hubSettings', settings);
        };
        
        // Admin Login
        adminLoginBtn.onclick = () => {
            if (adminPassInput.value === ADMIN_PASS) {
                sessionStorage.setItem('isAdmin', 'true');
                adminLoginArea.classList.add('hidden');
                adminToolsArea.classList.remove('hidden');
                customAlert('Admin access granted!', "Welcome", "success");
            } else {
                customAlert('Incorrect password.', "Access Denied", "error");
            }
            adminPassInput.value = '';
        };

        // Admin: Add/Edit Game
        addGameForm.onsubmit = (e) => {
            e.preventDefault();
            try {
                const id = $('gameIdInput').value;
                const title = $('gameTitleInput').value.trim();
                const url = $('gameUrlInput').value.trim();
                const image = $('gameImageInput').value.trim() || `https://placehold.co/400x300/4f46e5/ffffff?text=${encodeURIComponent(title)}`;
                const description = $('gameDescriptionInput').value.trim() || 'No description provided.';
                const tags = ($('gameTagsInput').value.trim() || '').split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag);
                const section = $('gameSectionSelect').value;

                const gameData = { title, url, image, description, tags, section };

                if (id) {
                    // Edit existing game
                    allGames[id] = { ...allGames[id], ...gameData };
                    customAlert(`Game "${title}" updated!`, "Success", "success");
                } else {
                    // Add new game
                    const newId = `g_${new Date().getTime()}`;
                    allGames[newId] = { id: newId, ...gameData, created: new Date().toISOString() };
                    customAlert(`Game "${title}" added!`, "Success", "success");
                }
                
                setStorageData('hubGames', allGames);
                initialize(); // Re-initialize to update tags and re-render
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
        // Remove loading screen after successful initialization
        $('loadingModal').classList.add('opacity-0');
        setTimeout(() => {
            $('loadingModal').classList.add('hidden');
        }, 300);

        console.log("App initialized successfully.");
        
    } catch (err) {
        console.error("A fatal error occurred during initialization:", err);
        // Show a user-friendly error message
        $('loadingModal').innerHTML = `
            <div class="p-4 bg-red-800 border-4 border-red-500 rounded-lg">
                <h2 class="text-xl font-bold text-white">Error: Could not load the application.</h2>
                <p class="mt-2 text-red-100">Check the console (F12) for details.</p>
            </div>`;
    }
});
