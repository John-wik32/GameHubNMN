/* script.js - Core Logic for Game Hub */

// ---------- Global State & Constants ----------
const STORAGE_KEY = 'unblockhub_data';
const FAVORITES_KEY = 'unblockhub_favorites';
const DARK_MODE_KEY = 'unblockhub_darkmode';
const ADMIN_PASSWORD = '2025';

let DATA = null;
let allGames = {};
let stats = { counts: {}, recent: [] };

// Default categories for the dropdown
const DEFAULT_CATEGORIES = ['Action', 'Puzzle', 'Strategy', 'Arcade', 'Simulation', 'Other'];

// ---------- LocalStorage & Data Helpers ----------

/** Loads all primary game data from localStorage, or initializes default data. */
function loadData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        // Updated default games with new properties
        const defaultData = {
            games: {
                'flappy-bird': { id: 'flappy-bird', name: 'Flappy Bird Clone', image: 'https://placehold.co/100x70/1e293b/94a3b8?text=FB', category: 'Arcade', type: 'link', content: 'https://flappybird.io/', visible: true, dateAdded: Date.now() - 3600000 },
                'snake-game': { id: 'snake-game', name: 'Classic Snake', image: 'https://placehold.co/100x70/1e293b/94a3b8?text=SNAKE', category: 'Arcade', type: 'link', content: 'https://playsnake.org/', visible: true, dateAdded: Date.now() - 7200000 },
                'tetris': { id: 'tetris', name: 'Simple Tetris', image: 'https://placehold.co/100x70/1e293b/94a3b8?text=TETRIS', category: 'Puzzle', type: 'link', content: 'https://tetris.com/play-tetris/', visible: true, dateAdded: Date.now() }
            },
            stats: { counts: {}, recent: [] },
            admin_password: ADMIN_PASSWORD
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
        return defaultData;
    }
    try {
        const data = JSON.parse(raw);
        // Ensure all new fields exist for old entries
        for (const id in data.games) {
            const game = data.games[id];
            game.image = game.image || '';
            game.category = game.category || 'Other';
            game.type = game.type || (game.link ? 'link' : 'embed');
            game.content = game.content || game.link || '';
            game.dateAdded = game.dateAdded || Date.now();
            delete game.link; // Remove old 'link' property if it exists
        }
        return data;
    } catch (e) {
        console.error('Failed to parse storage, resetting', e);
        localStorage.removeItem(STORAGE_KEY);
        return loadData();
    }
}

/** Saves the global DATA object to localStorage. */
function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DATA));
}

function getGamesObj() { return (DATA && DATA.games) ? DATA.games : {}; }
function setGamesObj(obj) { DATA.games = obj; saveData(); allGames = obj; }
function getStatsObj() { return (DATA && DATA.stats) ? DATA.stats : { counts: {}, recent: [] }; }
function setStatsObj(obj) { DATA.stats = obj; saveData(); stats = obj; }

// ---------- Favorites System ----------

/** Gets the array of favorited game IDs. */
function getFavorites() {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
}

/** Sets the array of favorited game IDs. */
function setFavorites(favorites) {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

/** Toggles a game's favorite status. */
function toggleFavorite(gameId) {
    const favorites = getFavorites();
    const index = favorites.indexOf(gameId);

    if (index > -1) {
        favorites.splice(index, 1); // Remove
    } else {
        favorites.push(gameId); // Add
    }

    setFavorites(favorites);
    // Re-render the game list if we are on the favorites tab, and update the button state
    renderGameList();
    if (document.getElementById('favoriteBtn')) {
        updateFavoriteButton(gameId);
    }
}

/** Updates the favorite button inside the modal/card. */
function updateFavoriteButton(gameId) {
    const btn = document.getElementById('favoriteBtn');
    if (!btn) return;

    const isFavorited = getFavorites().includes(gameId);
    btn.onclick = () => toggleFavorite(gameId);
    btn.classList.toggle('favorited', isFavorited);
    btn.innerHTML = isFavorited ?
        '<svg class="w-6 h-6 fill-current text-amber-500" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26l6.91 1.01l-5 4.87l1.18 6.88L12 17.77l-6.18 3.25l1.18-6.88l-5-4.87l6.91-1.01L12 2z"/></svg>' :
        '<svg class="w-6 h-6 stroke-current text-slate-400 hover:text-amber-500" fill="none" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.575.575 0 011.04 0l2.125 5.102a.575.575 0 00.463.318l5.584.814a.575.575 0 01.328.986l-4.04 3.931a.575.575 0 00-.16.594l.954 5.577a.575.575 0 01-.836.605L12 18.04l-4.99 2.625a.575.575 0 01-.836-.605l.954-5.577a.575.575 0 00-.16-.594l-4.04-3.931a.575.575 0 01.328-.986l5.584-.814a.575.575 0 00.463-.318l2.125-5.102z" /></svg>';
}

// ---------- Dark Mode System ----------

function applyDarkMode(isDark) {
    document.body.classList.toggle('light-mode', !isDark);
    localStorage.setItem(DARK_MODE_KEY, isDark ? 'dark' : 'light');
}

function loadDarkMode() {
    const preference = localStorage.getItem(DARK_MODE_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Apply dark mode if preference is 'dark', or if no preference is set and system prefers dark
    const isDark = (preference === 'dark') || (preference === null && prefersDark);
    applyDarkMode(isDark);
}

function toggleDarkMode() {
    const isLight = document.body.classList.contains('light-mode');
    applyDarkMode(isLight); // Toggle (if light is present, go dark; if not, go light)
}

// ---------- UI / Rendering Functions ----------

/** Shows a custom message box instead of alert(). */
function showMessage(title, content) {
    document.getElementById('messageTitle').textContent = title;
    document.getElementById('messageContent').textContent = content;
    const box = document.getElementById('messageBox');
    const inner = document.getElementById('messageInner');

    box.classList.remove('hidden');

    setTimeout(() => {
        inner.classList.remove('scale-95', 'opacity-0');
        inner.classList.add('scale-100', 'opacity-100');
    }, 10);
}

/** Renders the game list based on filters, categories, and sorting. */
function renderGameList() {
    const container = document.getElementById('gameListContainer');
    if (!container) return;

    const filterText = document.getElementById('gameFilterInput').value.toLowerCase();
    const categoryFilter = document.getElementById('categoryFilter').value;
    const sortBy = document.getElementById('sortBy').value;
    const isFavoritesTab = document.querySelector('.tab-button[data-tab="favoritesView"]').classList.contains('active');

    let gamesArray = Object.values(getGamesObj());
    const favorites = getFavorites();

    // 1. Filter
    gamesArray = gamesArray.filter(g => {
        // Filter by visibility
        if (g.visible === false) return false;
        // Filter by category
        if (categoryFilter !== 'All' && g.category !== categoryFilter) return false;
        // Filter by search text
        if (!g.name.toLowerCase().includes(filterText) && !g.id.toLowerCase().includes(filterText)) return false;
        // Filter by favorites tab
        if (isFavoritesTab && !favorites.includes(g.id)) return false;
        return true;
    });

    // 2. Sort
    gamesArray.sort((a, b) => {
        const clicksA = stats.counts[a.id] || 0;
        const clicksB = stats.counts[b.id] || 0;

        switch (sortBy) {
            case 'popular':
                return clicksB - clicksA; // Most popular first
            case 'az':
                return a.name.localeCompare(b.name); // A-Z
            case 'newest':
                return b.dateAdded - a.dateAdded; // Newest first
            default:
                return clicksB - clicksA; // Fallback to popular
        }
    });

    // 3. Render
    let html = '';
    if (gamesArray.length === 0) {
        html = `<p class="text-center col-span-full text-slate-500 mt-8">No games found.</p>`;
    } else {
        html = gamesArray.map(game => {
            const clickCount = stats.counts[game.id] || 0;
            const isFavorited = favorites.includes(game.id);

            return `
                <div id="game-card-${game.id}" class="game-card p-4 rounded-xl shadow-lg cursor-pointer flex flex-col justify-between" onclick="launchGame('${game.id}')">
                    <img src="${game.image || 'https://placehold.co/100x70/1e293b/94a3b8?text=NO+IMG'}" alt="${game.name}" class="w-full h-24 object-cover rounded-lg mb-3">
                    <div class="flex items-center justify-between">
                        <h3 class="text-lg font-bold truncate">${game.name}</h3>
                        <div class="p-1 rounded-full ${isFavorited ? 'text-amber-500' : 'text-slate-400'}" title="${isFavorited ? 'Favorited' : 'Add to Favorites'}">
                            <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26l6.91 1.01l-5 4.87l1.18 6.88L12 17.77l-6.18 3.25l1.18-6.88l-5-4.87l6.91-1.01L12 2z"/></svg>
                        </div>
                    </div>
                    <p class="text-sm text-slate-400 mt-1">
                        <span class="font-bold text-xs">${game.category}</span> &bull; ${clickCount.toLocaleString()} plays
                    </p>
                </div>
            `;
        }).join('');
    }

    container.innerHTML = html;
}

// Renders the category filter dropdown
function renderCategoryFilter() {
    const select = document.getElementById('categoryFilter');
    if (!select) return;

    let options = '<option value="All">All Categories</option>';
    DEFAULT_CATEGORIES.forEach(cat => {
        options += `<option value="${cat}">${cat}</option>`;
    });
    select.innerHTML = options;
}

/** Logs a game click and updates stats. */
function logClick(gameId) {
    const currentStats = getStatsObj();

    currentStats.counts[gameId] = (currentStats.counts[gameId] || 0) + 1;

    currentStats.recent.unshift({
        gameId: gameId,
        timestamp: Date.now()
    });
    currentStats.recent = currentStats.recent.slice(0, 50); // Keep max 50 recent logs

    setStatsObj(currentStats);
}

/** Launches a game (new tab for links, modal for embeds). */
function launchGame(gameId) {
    const game = getGamesObj()[gameId];
    if (!game || !game.content) {
        showMessage('Error', 'Game content (link/embed) is missing.');
        return;
    }

    logClick(gameId);
    renderGameList(); // Update count immediately on main page

    const modal = document.getElementById('gameModal');
    const titleEl = document.getElementById('modalGameTitle');
    const gameLinkEl = document.getElementById('modalGameLink');
    const embedContainer = document.getElementById('gameEmbedContainer');

    titleEl.textContent = game.name;

    // Set the state of the favorite button inside the modal
    updateFavoriteButton(gameId);

    if (game.type === 'link') {
        // FIX: Open in new tab for external links to bypass X-Frame-Options
        window.open(game.content, '_blank');
        modal.classList.add('hidden'); // Ensure modal is hidden for link type
        showMessage('Game Launched', `The game '${game.name}' has been opened in a new tab. Embedding is blocked for this game.`);
    } else if (game.type === 'embed') {
        // Embed code type: show in modal
        gameLinkEl.href = 'javascript:void(0)';
        gameLinkEl.textContent = 'External Link Unavailable';
        gameLinkEl.classList.add('opacity-50', 'cursor-not-allowed');

        embedContainer.innerHTML = game.content; // Insert the raw embed code (e.g., iframe)
        modal.classList.remove('hidden');
    }
}

/** Cleans up and closes the game modal. */
function closeGame() {
    const modal = document.getElementById('gameModal');
    const embedContainer = document.getElementById('gameEmbedContainer');

    // Clear content to stop any media/processing
    embedContainer.innerHTML = '';
    modal.classList.add('hidden');
}


// ---------- Admin Functions (Reorganized) ----------

function requireAdmin() {
    return localStorage.getItem('adminLoggedIn') === 'true';
}

function renderAdminOptions() {
    const selector = document.getElementById('editGameSelector');
    if (!selector) return;

    const gameArray = Object.values(allGames).sort((a, b) => a.name.localeCompare(b.name));

    let html = '<option value="">-- Add New Game --</option>';

    html += gameArray.map(game =>
        `<option value="${game.id}">${game.name} (${game.id})</option>`
    ).join('');

    selector.innerHTML = html;

    // Render category list for the admin form
    const categorySelect = document.getElementById('gameCategoryInput');
    if (categorySelect) {
        let options = DEFAULT_CATEGORIES.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        categorySelect.innerHTML = options;
    }
}

function upsertGame(gameData) {
    const games = getGamesObj();
    games[gameData.id] = {
        id: gameData.id,
        name: gameData.name,
        image: gameData.image,
        category: gameData.category,
        type: gameData.type,
        content: gameData.content,
        visible: gameData.visible,
        dateAdded: games[gameData.id] ? games[gameData.id].dateAdded : Date.now() // Preserve existing date or set new
    };
    setGamesObj(games);
    showMessage('Success', `Game "${gameData.name}" has been saved/updated.`);
}

function deleteGame(id) {
    const games = getGamesObj();
    if (games[id]) {
        delete games[id];
        delete stats.counts[id];
        stats.recent = stats.recent.filter(log => log.gameId !== id);
        setGamesObj(games);
        setStatsObj(stats);
    }
}

function clearGameForm() {
    const form = document.getElementById('gameForm');
    if (form) form.reset();

    // Explicitly reset non-form elements
    document.getElementById('editGameSelector').value = '';
    document.getElementById('adminMessage').textContent = 'Creating a new game.';
    document.getElementById('gameTypeLink').checked = true;
    toggleAdminContentType(); // Ensure the link field is visible
}

function renderStatsSummary() {
    const container = document.getElementById('statsSummary');
    if (!container || !requireAdmin()) return;

    const games = getGamesObj();
    const counts = stats.counts;
    const totalGames = Object.keys(games).length;
    const totalClicks = Object.values(counts).reduce((sum, count) => sum + count, 0);

    container.innerHTML = `
        <h2 class="text-2xl font-bold text-indigo-400 mb-4">Stats Summary</h2>
        <p class="text-slate-300">Total Games: <span class="font-bold text-white">${totalGames}</span></p>
        <p class="text-slate-300">Total Clicks: <span class="font-bold text-white">${totalClicks.toLocaleString()}</span></p>
    `;
}

function renderRecentClicks() {
    const container = document.getElementById('recentClicksList');
    if (!container || !requireAdmin()) return;

    const recent = stats.recent || [];
    const games = getGamesObj();

    let listHtml = '<ul class="text-sm space-y-2">';

    if (recent.length === 0) {
        listHtml += '<li class="text-slate-500">No recent clicks recorded.</li>';
    } else {
        recent.slice(0, 10).forEach(click => {
            const game = games[click.gameId];
            const gameName = game ? game.name : `[Deleted: ${click.gameId}]`;
            const time = new Date(click.timestamp).toLocaleTimeString();
            listHtml += `<li class="border-b border-slate-700 pb-1 last:border-b-0"><span class="font-medium text-slate-200">${time}</span> - ${gameName}</li>`;
        });
    }
    listHtml += '</ul>';

    container.innerHTML = listHtml;
}

function resetStats() {
    stats = { counts: {}, recent: [] };
    setStatsObj(stats);
    showMessage('Stats Reset', 'All game click statistics have been cleared.');
}

// Toggle visibility of link/embed code inputs
function toggleAdminContentType() {
    const type = document.querySelector('input[name="gameContentType"]:checked').value;
    document.getElementById('linkInputGroup').classList.toggle('hidden', type === 'embed');
    document.getElementById('embedInputGroup').classList.toggle('hidden', type === 'link');
}

// ---------- Initialization ----------

function loadAll() {
    DATA = loadData();
    allGames = DATA.games || {};
    stats = DATA.stats || { counts: {}, recent: [] };

    // Apply dark mode preference
    loadDarkMode();

    // Hide loading message and render main view
    const loadingMessageEl = document.getElementById('loadingMessage');
    if (loadingMessageEl) loadingMessageEl.classList.add('hidden');

    renderCategoryFilter();
    renderGameList();
    renderAdminOptions(); // Load initial admin data
}

// Expose global functions needed by HTML
window.loadAll = loadAll;
window.renderGameList = renderGameList;
window.launchGame = launchGame;
window.closeGame = closeGame;
window.toggleDarkMode = toggleDarkMode;
window.toggleFavorite = toggleFavorite;
window.showMessage = showMessage; // Expose custom alert

// Expose admin functions for use in admin panel logic
window.requireAdmin = requireAdmin;
window.renderAdminOptions = renderAdminOptions;
window.renderStatsSummary = renderStatsSummary;
window.renderRecentClicks = renderRecentClicks;
window.upsertGame = upsertGame;
window.deleteGame = deleteGame;
window.clearGameForm = clearGameForm;
window.resetStats = resetStats;
window.toggleAdminContentType = toggleAdminContentType;
window.ADMIN_PASSWORD = ADMIN_PASSWORD;
window.getGamesObj = getGamesObj; // Needed for admin loading logic
