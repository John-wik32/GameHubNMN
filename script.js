/* script.js - Core Logic for Game Hub (Fixed & Enhanced) */

// ---------- Global State & Constants ----------
const STORAGE_KEY = 'unblockhub_data';
const FAVORITES_KEY = 'unblockhub_favorites';
// FIX: Use a robust placeholder image URL to avoid 404 errors
const PLACEHOLDER_IMG_URL = 'https://placehold.co/100x70/334155/94a3b8?text=NO+IMG'; 
const DEFAULT_CATEGORIES = ['Action', 'Puzzle', 'Strategy', 'Arcade', 'Simulation', 'Other'];
const ADMIN_PASSWORD = '2025'; // Default admin password

let DATA = null;
let allGames = {}; // object keyed by id
let stats = {};

// ---------- LocalStorage & Data Helpers ----------

/** Loads all primary game data from localStorage, or initializes default data. */
function loadData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        // Initial setup with new, richer properties
        const defaultData = {
            games: {
                'flappy-bird': { id: 'flappy-bird', name: 'Flappy Bird Clone', image: '', category: 'Arcade', type: 'link', content: 'https://flappybird.io/', visible: true, dateAdded: Date.now() - 3600000 },
                'snake-game': { id: 'snake-game', name: 'Classic Snake', image: '', category: 'Arcade', type: 'link', content: 'https://playsnake.org/', visible: true, dateAdded: Date.now() - 7200000 },
                // Example of an embed game using a YouTube iframe
                'embed-example': { id: 'embed-example', name: 'Embedded Game Test', image: '', category: 'Other', type: 'embed', content: '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1" style="width: 100%; height: 100%; border:0;" allow="autoplay; fullscreen; picture-in-picture"></iframe>', visible: true, dateAdded: Date.now() }
            },
            stats: { counts: {}, recent: [] },
            admin_password: ADMIN_PASSWORD
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
        return defaultData;
    }
    try {
        const data = JSON.parse(raw);
        // Data migration and cleanup logic to ensure all games have new properties
        for (const id in data.games) {
            const game = data.games[id];
            // If the old 'link' property exists, convert it to the new 'type'/'content' model
            if (game.link && !game.content) {
                game.type = 'link';
                game.content = game.link;
                delete game.link;
            }
            game.image = game.image || '';
            game.category = game.category || 'Other';
            game.type = game.type || 'link';
            game.content = game.content || '';
            game.dateAdded = game.dateAdded || Date.now();
        }
        return data;
    } catch (e) {
        console.error('Failed to parse storage, resetting', e);
        localStorage.removeItem(STORAGE_KEY);
        return loadData();
    }
}

function saveData() { localStorage.setItem(STORAGE_KEY, JSON.stringify(DATA)); }
function getGamesObj() { return (DATA && DATA.games) ? DATA.games : {}; }
function setGamesObj(obj) { DATA.games = obj; saveData(); allGames = obj; }
function getStatsObj() { return (DATA && DATA.stats) ? DATA.stats : { counts: {}, recent: [] }; }
function setStatsObj(obj) { DATA.stats = obj; saveData(); stats = obj; }
function getAdminPassword() { return DATA.admin_password || ADMIN_PASSWORD; }

// ---------- Favorites System (NEW/FIXED) ----------

function getFavorites() {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
}

function setFavorites(favorites) {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

/** Toggles a game's favorite status and updates UI. */
function toggleFavorite(gameId) {
    const favorites = getFavorites();
    const index = favorites.indexOf(gameId);

    if (index > -1) {
        favorites.splice(index, 1); // Remove
    } else {
        favorites.push(gameId); // Add
    }

    setFavorites(favorites);
    renderGameList(); // Refresh the list to update the star icon
}

// ---------- UI / Rendering Functions ----------

function showMessage(title, content) {
    const mb = document.getElementById('messageBox');
    if (!mb) return alert(title + '\n\n' + content);
    document.getElementById('messageTitle').textContent = title;
    document.getElementById('messageContent').textContent = content;
    mb.classList.remove('hidden');

    // Add close handler (if not already set in HTML)
    document.getElementById('messageCloseBtn').onclick = () => {
        document.getElementById('messageBox').classList.add('hidden');
    };
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function renderCategoryFilter() {
    const select = document.getElementById('categoryFilter');
    if (!select) return;

    let options = '<option value="All">All Categories</option>';
    DEFAULT_CATEGORIES.forEach(cat => {
        options += `<option value="${cat}">${cat}</option>`;
    });
    select.innerHTML = options;
}

/** Renders the game list based on filters, categories, and sorting. */
function renderGameList() {
    const container = document.getElementById('gameListContainer');
    if (!container) return;

    const filterText = (document.getElementById('gameFilterInput') && document.getElementById('gameFilterInput').value || '').toLowerCase();
    const categoryFilter = (document.getElementById('categoryFilter') && document.getElementById('categoryFilter').value) || 'All';
    const sortBy = (document.getElementById('sortBy') && document.getElementById('sortBy').value) || 'popular';
    
    // Determine active tab to filter for favorites
    const isFavoritesTab = document.querySelector('#tabFavorites') && document.querySelector('#tabFavorites').classList.contains('active');
    
    let gamesArray = Object.values(getGamesObj());
    const favorites = getFavorites();

    // 1. Filter
    gamesArray = gamesArray.filter(g => {
        if (g.visible === false) return false;
        if (categoryFilter !== 'All' && g.category !== categoryFilter) return false;
        if (!g.name.toLowerCase().includes(filterText) && !g.id.toLowerCase().includes(filterText)) return false;
        // FIX: Filtering logic for Favorites tab
        if (isFavoritesTab && !favorites.includes(g.id)) return false;
        return true;
    });

    // 2. Sort
    gamesArray.sort((a, b) => {
        const clicksA = stats.counts[a.id] || 0;
        const clicksB = stats.counts[b.id] || 0;
        switch (sortBy) {
            case 'popular': return clicksB - clicksA;
            case 'az': return a.name.localeCompare(b.name);
            case 'newest': return b.dateAdded - a.dateAdded;
            default: return clicksB - clicksA;
        }
    });

    // 3. Render
    let html = '';
    if (gamesArray.length === 0) {
        html = `<p class="text-center col-span-full text-slate-500 mt-8">${isFavoritesTab ? 'You have no favorite games.' : 'No games match your criteria.'}</p>`;
    } else {
        html = gamesArray.map(game => {
            const clickCount = stats.counts[game.id] || 0;
            const isFavorited = favorites.includes(game.id);
            const imageSrc = game.image || PLACEHOLDER_IMG_URL;

            return `
                <div id="game-card-${escapeHtml(game.id)}" class="game-card p-4 rounded-xl shadow-lg flex flex-col justify-between relative">
                    
                    <div onclick="window.launchGame('${escapeHtml(game.id)}')" class="cursor-pointer">
                        <img src="${escapeHtml(imageSrc)}" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG_URL}'" 
                             alt="${escapeHtml(game.name)}" loading="lazy" class="w-full h-24 object-cover rounded-lg mb-3">
                        <h3 class="text-lg font-bold truncate">${escapeHtml(game.name)}</h3>
                    </div>

                    <div class="flex justify-between items-center mt-2">
                        <p class="text-sm text-slate-400">
                            <span class="font-bold text-xs">${escapeHtml(game.category || 'Other')}</span> &bull; ${clickCount.toLocaleString()} plays
                        </p>
                        <button onclick="window.toggleFavorite('${escapeHtml(game.id)}'); event.stopPropagation();" class="p-1 z-10" title="Toggle Favorite">
                            <svg class="w-5 h-5 fill-current ${isFavorited ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'}" viewBox="0 0 24 24">
                                <path d="M12 2l3.09 6.26l6.91 1.01l-5 4.87l1.18 6.88L12 17.77l-6.18 3.25l1.18-6.88l-5-4.87l6.91-1.01L12 2z"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    container.innerHTML = html;
}

function logClick(gameId) {
    const currentStats = getStatsObj();
    currentStats.counts[gameId] = (currentStats.counts[gameId] || 0) + 1;
    currentStats.recent.unshift({ gameId: gameId, timestamp: Date.now() });
    currentStats.recent = currentStats.recent.slice(0, 500); // Keep last 500
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
    renderGameList(); // Update play count on card

    // FIX: Get elements for the new custom player modal
    const modal = document.getElementById('gameModal');
    const titleEl = document.getElementById('modalGameTitle');
    const embedContainer = document.getElementById('gameEmbedContainer');

    titleEl.textContent = game.name;
    
    // Clear previous content before inserting new one
    embedContainer.innerHTML = '';
    
    if (game.type === 'link') {
        // FIX: Open external link in new tab
        window.open(game.content, '_blank');
        if(modal) modal.classList.add('hidden'); 
        showMessage('Game Launched', `The game '${game.name}' has been opened in a new tab.`);
        
    } else if (game.type === 'embed') {
        
        // FIX: Inject embed code into the container
        embedContainer.innerHTML = `<div class="w-full h-full">${game.content}</div>`;
        
        // FIX: Ensure any iframe inside the content is full size to fix "plugin not supported"
        const iframe = embedContainer.querySelector('iframe');
        if(iframe) {
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.setAttribute('loading', 'lazy');
        }

        if(modal) modal.classList.remove('hidden');
    }
}

function closeGame() {
    const modal = document.getElementById('gameModal');
    const embedContainer = document.getElementById('gameEmbedContainer');
    if (!modal || !embedContainer) return;

    // Clear content to stop any media/processing
    embedContainer.innerHTML = '';
    modal.classList.add('hidden');
}


// ---------- Admin Functions (For admin.html) ----------

function requireAdmin() {
    return localStorage.getItem('adminLoggedIn') === 'true';
}

function renderAdminOptions() {
    const selector = document.getElementById('editGameSelector');
    if (!selector) return;

    const gameArray = Object.values(allGames).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    let html = '<option value="">-- Add New Game --</option>';
    html += gameArray.map(game =>
        `<option value="${escapeHtml(game.id)}">${escapeHtml(game.name)} (${escapeHtml(game.id)})</option>`
    ).join('');

    selector.innerHTML = html;
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
        // Preserve original dateAdded if editing, otherwise set new date
        dateAdded: games[gameData.id] ? games[gameData.id].dateAdded : Date.now() 
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

function renderStatsSummary() {
    const el = document.getElementById('statsSummary');
    if (!el) return;
    const counts = stats.counts || {};
    const totalClicks = Object.entries(counts).reduce((s,[k,v]) => (k === '__visits' ? s : s + (v||0)), 0);
    
    // Top 3 logic
    const entries = Object.entries(counts).filter(([k]) => k !== '__visits').sort(([,a],[,b]) => b - a).slice(0,3);
    let topHtml = '';
    if (entries.length) {
        topHtml = '<p class="text-sm text-slate-400 mt-2">Top Games: ' + entries.map(([id, c]) => `${escapeHtml((allGames[id] && allGames[id].name) || id)} (${c})`).join(', ') + '</p>';
    }

    el.innerHTML = `
        <p>Total Games: <span class="font-bold">${Object.keys(allGames).length}</span></p>
        <p>Total Clicks: <span class="font-bold">${totalClicks.toLocaleString()}</span></p>
        ${topHtml}
    `;
}

function renderRecentClicks() {
    const el = document.getElementById('recentClicks');
    if (!el) return;
    const recent = (stats.recent || []).slice().sort((a,b) => b.timestamp - a.timestamp).slice(0, 50);
    if (!recent.length) { el.innerHTML = '<p class="text-slate-500">No recent clicks recorded.</p>'; return; }
    let out = '<ul class="list-disc pl-5 space-y-1 text-sm">';
    recent.forEach(r => {
        const t = new Date(r.timestamp).toLocaleTimeString();
        const name = (allGames[r.gameId] && allGames[r.gameId].name) || r.gameId;
        out += `<li class="truncate hover:text-white">${t} - ${escapeHtml(name)} (${escapeHtml(r.gameId)})</li>`;
    });
    out += '</ul>';
    el.innerHTML = out;
}

function clearGameForm() {
    const form = document.getElementById('gameForm');
    if (form) form.reset();

    const msg = document.getElementById('adminMessage');
    if (msg) msg.textContent = 'Creating a new game.';
    
    document.getElementById('gameTypeLink').checked = true;
    toggleAdminContentType();
}

function resetStats() {
    stats = { counts: {}, recent: [] };
    DATA.stats = stats;
    saveData(DATA);
}

// Logic to show/hide Link or Embed input fields
function toggleAdminContentType() {
    const type = document.querySelector('input[name="gameContentType"]:checked').value;
    document.getElementById('linkInputGroup').classList.toggle('hidden', type === 'embed');
    document.getElementById('embedInputGroup').classList.toggle('hidden', type === 'link');
}

// ---------- Initial Load ----------
function loadAll() {
    DATA = loadData();
    allGames = DATA.games || {};
    stats = DATA.stats || { counts: {}, recent: [] };

    // hide loading message
    const loadingMessageEl = document.getElementById('loadingMessage');
    if (loadingMessageEl) loadingMessageEl.classList.add('hidden');

    renderCategoryFilter();
    renderGameList();
    
    // Only call admin functions if on the admin page
    if (document.getElementById('adminPanel')) {
        renderAdminOptions();
        renderStatsSummary();
        renderRecentClicks();
    }
}

// expose needed functions to global scope used by HTML
window.allGames = allGames; // for admin.html access
window.DATA = DATA; // for admin.html access
window.loadAll = loadAll;
window.renderGameList = renderGameList;
window.launchGame = launchGame;
window.closeGame = closeGame;
window.toggleFavorite = toggleFavorite; // NEW: Favorite toggle
window.getFavorites = getFavorites; // NEW
window.showMessage = showMessage;
window.requireAdmin = requireAdmin;
window.renderAdminOptions = renderAdminOptions;
window.renderStatsSummary = renderStatsSummary;
window.renderRecentClicks = renderRecentClicks;
window.upsertGame = upsertGame;
window.deleteGame = deleteGame;
window.clearGameForm = clearGameForm;
window.resetStats = resetStats;
window.getAdminPassword = getAdminPassword;
window.toggleAdminContentType = toggleAdminContentType; // NEW
