/* script.js - Core Logic for Game Hub (Fixed & Enhanced) */

// ---------- Global State & Constants ----------
const STORAGE_KEY = 'unblockhub_data';
const FAVORITES_KEY = 'unblockhub_favorites';
const PLACEHOLDER_IMG_URL = 'https://placehold.co/100x70/334155/94a3b8?text=NO+IMG';
const DEFAULT_CATEGORIES = ['Action', 'Puzzle', 'Strategy', 'Arcade', 'Simulation', 'Other'];
const ADMIN_PASSWORD = '2025'; // Default admin password

let DATA = null;
let allGames = {};
let stats = { counts: {}, recent: [] };

// ---------- LocalStorage & Data Helpers ----------

/** Loads all primary game data from localStorage, or initializes default data. */
function loadData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        // Initial setup with new properties
        const defaultData = {
            games: {
                'flappy-bird': { id: 'flappy-bird', name: 'Flappy Bird Clone', image: '', category: 'Arcade', type: 'link', content: 'https://flappybird.io/', visible: true, dateAdded: Date.now() - 3600000 },
                'snake-game': { id: 'snake-game', name: 'Classic Snake', image: '', category: 'Arcade', type: 'link', content: 'https://playsnake.org/', visible: true, dateAdded: Date.now() - 7200000 },
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
        // Migration logic for older games that only had 'link'
        for (const id in data.games) {
            const game = data.games[id];
            game.image = game.image || '';
            game.category = game.category || 'Other';
            
            // New type/content logic
            if (game.link) {
                game.type = 'link';
                game.content = game.link;
                delete game.link; // Clean up old property
            } else {
                game.type = game.type || 'embed'; // Assume embed if no link found
                game.content = game.content || '';
            }
            
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

// ---------- Favorites System ----------

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
    renderGameList(); // Update main view card
    updateFavoriteButton(gameId); // Update modal button if open
}

/** Updates the favorite button inside the modal. */
function updateFavoriteButton(gameId) {
    const btn = document.getElementById('favoriteBtn');
    if (!btn) return;

    const isFavorited = getFavorites().includes(gameId);
    
    btn.onclick = (e) => { 
        toggleFavorite(gameId);
        if (e) e.stopPropagation();
    };

    btn.classList.toggle('favorited', isFavorited);
    
    // Star icon SVG
    const svgContent = `<svg class="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26l6.91 1.01l-5 4.87l1.18 6.88L12 17.77l-6.18 3.25l1.18-6.88l-5-4.87l6.91-1.01L12 2z"/></svg>`;

    btn.innerHTML = svgContent;
    // Apply Tailwind classes for styling
    btn.querySelector('svg').classList.remove('text-slate-400', 'hover:text-amber-500', 'text-amber-500');
    btn.querySelector('svg').classList.add(isFavorited ? 'text-amber-500' : 'text-slate-400', isFavorited ? '' : 'hover:text-amber-500');
}

// ---------- UI / Rendering Functions ----------

function showMessage(title, content) {
    document.getElementById('messageTitle').textContent = title;
    document.getElementById('messageContent').textContent = content;
    const box = document.getElementById('messageBox');
    const inner = document.getElementById('messageInner');

    box.classList.remove('hidden');

    setTimeout(() => {
        // Simple transition logic for the alert box
        const dialog = document.querySelector('#messageBox > div');
        if (dialog) dialog.style.opacity = '1';
    }, 10);
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
    const isFavoritesTab = document.querySelector('#tabFavorites').classList.contains('active');
    
    let gamesArray = Object.values(getGamesObj());
    const favorites = getFavorites();

    // 1. Filter
    gamesArray = gamesArray.filter(g => {
        if (g.visible === false) return false;
        if (categoryFilter !== 'All' && g.category !== categoryFilter) return false;
        if (!g.name.toLowerCase().includes(filterText) && !g.id.toLowerCase().includes(filterText)) return false;
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
        html = `<p class="text-center col-span-full text-slate-500 mt-8">No games found.</p>`;
    } else {
        html = gamesArray.map(game => {
            const clickCount = stats.counts[game.id] || 0;
            const isFavorited = favorites.includes(game.id);
            const imageSrc = game.image || PLACEHOLDER_IMG_URL;

            return `
                <div id="game-card-${game.id}" class="game-card p-4 rounded-xl shadow-lg flex flex-col justify-between relative">
                    
                    <div onclick="window.launchGame('${game.id}')" class="cursor-pointer">
                        <img src="${imageSrc}" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG_URL}'" 
                             alt="${game.name}" loading="lazy" class="w-full h-24 object-cover rounded-lg mb-3">
                        <h3 class="text-lg font-bold truncate">${game.name}</h3>
                    </div>

                    <div class="flex justify-between items-center mt-2">
                        <p class="text-sm text-slate-400">
                            <span class="font-bold text-xs">${game.category || 'Other'}</span> &bull; ${clickCount.toLocaleString()} plays
                        </p>
                        <button onclick="window.toggleFavorite('${game.id}'); event.stopPropagation();" class="p-1 z-10" title="Toggle Favorite">
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
    currentStats.recent = currentStats.recent.slice(0, 50);
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
    renderGameList();

    const modal = document.getElementById('gameModal');
    const titleEl = document.getElementById('modalGameTitle');
    const gameLinkEl = document.getElementById('modalGameLink');
    const embedContainer = document.getElementById('gameEmbedContainer');

    titleEl.textContent = game.name;
    updateFavoriteButton(gameId);
    
    // Clear previous content before inserting new one
    embedContainer.innerHTML = '';
    
    if (game.type === 'link') {
        window.open(game.content, '_blank');
        modal.classList.add('hidden'); // Ensure modal is closed if it was open
        showMessage('Game Launched', `The game '${game.name}' has been opened in a new tab.`);
        
        // Hide/disable open source link for external links
        gameLinkEl.classList.add('opacity-50', 'cursor-not-allowed');
        gameLinkEl.href = 'javascript:void(0)';
        gameLinkEl.textContent = 'Opened in New Tab';
        
    } else if (game.type === 'embed') {
        
        // Prepare link element for embed type (try to extract the src)
        const srcMatch = game.content.match(/src=["'](.*?)["']/);
        gameLinkEl.href = srcMatch ? srcMatch[1] : 'javascript:void(0)';
        gameLinkEl.textContent = 'View Embed Source Link';
        gameLinkEl.classList.remove('opacity-50', 'cursor-not-allowed');

        // FIX: Wrap the embed content in a full-size div for proper sizing and inject
        // This is the Custom Player Logic
        embedContainer.innerHTML = `<div class="w-full h-full">${game.content}</div>`;
        
        // FIX: Find any iframe inside the content and explicitly set full size
        const iframe = embedContainer.querySelector('iframe');
        if(iframe) {
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.setAttribute('loading', 'lazy');
        }

        modal.classList.remove('hidden');
    }
}

function closeGame() {
    const modal = document.getElementById('gameModal');
    const embedContainer = document.getElementById('gameEmbedContainer');

    // Clear content to stop any media/processing
    embedContainer.innerHTML = '';
    modal.classList.add('hidden');
}

// ---------- Admin Functions ----------

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
    // ... (logic remains the same, assuming it was correct in the original)
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

function clearGameForm() {
    const form = document.getElementById('gameForm');
    if (form) form.reset();

    document.getElementById('editGameSelector').value = '';
    document.getElementById('adminMessage').textContent = 'Creating a new game.';
    document.getElementById('gameTypeLink').checked = true;
    toggleAdminContentType();
}

function resetStats() {
    stats = { counts: {}, recent: [] };
    setStatsObj(stats);
    showMessage('Stats Reset', 'All game click statistics have been cleared.');
}

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

    const loadingMessageEl = document.getElementById('loadingMessage');
    if (loadingMessageEl) loadingMessageEl.classList.add('hidden');

    renderCategoryFilter();
    renderGameList();
    renderAdminOptions();
    // No need to render stats here, they are rendered on admin tab activation
}

window.loadAll = loadAll;
window.renderGameList = renderGameList;
window.launchGame = launchGame;
window.closeGame = closeGame;
window.toggleFavorite = toggleFavorite;
window.showMessage = showMessage;
window.requireAdmin = requireAdmin;
window.renderAdminOptions = renderAdminOptions;
window.renderStatsSummary = renderStatsSummary;
window.renderRecentClicks = renderRecentClicks;
window.upsertGame = upsertGame;
window.deleteGame = deleteGame;
window.clearGameForm = clearGameForm;
window.resetStats = resetStats;
window.toggleAdminContentType = toggleAdminContentType;
window.getAdminPassword = getAdminPassword;
window.getGamesObj = getGamesObj;
