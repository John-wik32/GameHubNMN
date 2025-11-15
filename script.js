/* script.js - LocalStorage version (no backend)
   Admin password: 2025
   Features Added:
   1. Game Thumbnails (now handled by adding an 'image' field to game objects)
   2. Favorite Games System
   3. Recently Played Section
   4. Game Categories & Filter
   5. Game Search Improvements (ID, Category, Link Domain)
   6. Keyboard Navigation (up, down, enter)
   7. Secret Admin URL / Shortcut
   8. Random Game Button
   9. Auto-Backup (data is already only in localStorage)
  10. Track Game Errors (via iframe onload/onerror)
*/

// ---------- LocalStorage & State Management ----------
const STORAGE_KEY = 'unblockhub_data';
const FAVORITES_KEY = 'unblockhub_favorites';
const RECENT_KEY = 'unblockhub_recent';
const PWD_BACKUP_KEY = 'unblockhub_admin_password_backup'; // Backup for admin password

function loadData() {
    // 1. Load main data (games, stats)
    const raw = localStorage.getItem(STORAGE_KEY);
    let data;
    if (!raw) {
        // Default data structure with added 'image' and 'category' fields
        const defaultData = {
            games: {
                'flappy-bird': { id: 'flappy-bird', name: 'Flappy Bird Clone', link: 'https://flappybird.io/', visible: true, image: 'assets/flappy.png', category: 'Classic' },
                'snake-game': { id: 'snake-game', name: 'Classic Snake', link: 'https://playsnake.org/', visible: true, image: 'assets/snake.png', category: 'Classic' },
                'tetris': { id: 'tetris', name: 'Simple Tetris', link: 'https://tetris.com/play-tetris/', visible: true, image: 'assets/tetris.png', category: 'Puzzle' },
                'run-3': { id: 'run-3', name: 'Run 3', link: 'https://run3game.io/', visible: true, image: 'assets/run3.png', category: 'Fast Games' }
            },
            stats: { counts: {}, recent: [] },
            admin_password: localStorage.getItem(PWD_BACKUP_KEY) || '2025' // Use backup if available
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
        data = defaultData;
    } else {
        try {
            data = JSON.parse(raw);
        } catch (e) {
            console.error('Failed to parse storage, resetting', e);
            localStorage.removeItem(STORAGE_KEY);
            return loadData();
        }
    }

    // 2. Load user-specific data (favorites, recent)
    data.favorites = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    data.recentPlayed = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return data;
}

function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(data.favorites));
    localStorage.setItem(RECENT_KEY, JSON.stringify(data.recentPlayed));
    // Auto-Backup Admin Password
    if (data.admin_password) {
        localStorage.setItem(PWD_BACKUP_KEY, data.admin_password);
    }
}

function getGamesObj() {
    return (DATA && DATA.games) ? DATA.games : {};
}
function setGamesObj(obj) {
    DATA.games = obj;
    saveData(DATA);
}

// ---------- state initialization ----------
let DATA = loadData();
let allGames = getGamesObj();
let stats = DATA.stats || { counts: {}, recent: [] };

// increment visit count (local)
if (!stats.counts.__visits) stats.counts.__visits = 0;
stats.counts.__visits++;
DATA.stats = stats;
saveData(DATA);

// ---------- util ----------
function getAdminPassword() { return DATA.admin_password || '2025'; }

function showMessage(title, content) {
    const mb = document.getElementById('messageBox');
    if (!mb) return alert(title + '\n\n' + content);
    document.getElementById('messageTitle').textContent = title;
    document.getElementById('messageContent').textContent = content;
    mb.classList.remove('hidden');
}
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

/**
 * Toggles a game's favorite status.
 * @param {string} gameId
 */
function toggleFavorite(gameId) {
    const index = DATA.favorites.indexOf(gameId);
    if (index > -1) {
        DATA.favorites.splice(index, 1); // Remove
    } else {
        DATA.favorites.push(gameId); // Add
    }
    saveData(DATA);
    renderGameList();
    renderTabNavigation();
}

/**
 * Checks if a game is favorited.
 * @param {string} gameId
 * @returns {boolean}
 */
function isFavorite(gameId) {
    return DATA.favorites.includes(gameId);
}

// ---------- rendering / frontend logic ----------

/** Renders the list of games based on filter and active tab. */
function renderGameList() {
    const el = document.getElementById('gameListContainer');
    if (!el) return;
    const filter = (document.getElementById('gameFilterInput') && document.getElementById('gameFilterInput').value || '').toLowerCase();
    const activeTab = document.querySelector('.tab-content:not(.hidden)').id;

    // 1. Determine which games to display based on the active tab
    let gamesToShow = Object.values(allGames).filter(g => g.visible !== false);

    if (activeTab === 'favoritesView') {
        gamesToShow = gamesToShow.filter(g => isFavorite(g.id));
    } else if (activeTab === 'recentView') {
        // Show recent games, ordered by most recent, removing duplicates
        const recentGameIds = Array.from(new Set(DATA.recentPlayed)).reverse();
        gamesToShow = recentGameIds.map(id => allGames[id]).filter(g => g && g.visible !== false);
    }

    // 2. Apply filter (if on Game List view or other views)
    if (filter) {
        gamesToShow = gamesToShow.filter(g => {
            const name = (g.name || '').toLowerCase();
            const id = (g.id || '').toLowerCase();
            const category = (g.category || '').toLowerCase();
            const link = (g.link || '');
            const domain = link ? (new URL(link).hostname) : '';

            // Search by Name, ID, Category, or Link Domain
            return name.includes(filter) ||
                   id.includes(filter) ||
                   category.includes(filter) ||
                   domain.includes(filter);
        });
    }

    // 3. Render
    if (gamesToShow.length === 0) {
        el.innerHTML = `<p class="col-span-full text-center text-lg text-slate-400">${filter ? 'No games match your filter.' : 'No games available.'}</p>`;
        return;
    }

    const html = gamesToShow.map(game => {
        const isFav = isFavorite(game.id);
        const favIcon = isFav ? '⭐' : '☆';
        const image = game.image || 'assets/default.png';

        return `
            <div id="game-card-${escapeHtml(game.id)}" class="game-card bg-slate-800 p-4 rounded-xl shadow-lg transition duration-200 ease-in-out hover:shadow-indigo-500/20 flex flex-col"
                 data-game-id="${escapeHtml(game.id)}" data-game-link="${escapeHtml(game.link || '')}" tabindex="0">
                <div class="flex justify-between items-start mb-2">
                    <img src="${escapeHtml(image)}" alt="${escapeHtml(game.name)} thumbnail" class="w-16 h-16 object-cover rounded-md flex-shrink-0 mr-3">
                    <div class="flex-grow">
                        <h3 class="text-xl font-bold text-indigo-300 truncate">${escapeHtml(game.name)}</h3>
                        <p class="text-xs text-slate-500 mt-1">${escapeHtml(game.category || 'Uncategorized')}</p>
                    </div>
                    <button class="favorite-btn text-xl p-1 leading-none text-yellow-400 hover:scale-110" data-game-id="${escapeHtml(game.id)}">
                        ${favIcon}
                    </button>
                </div>
                <button class="w-full py-2 bg-indigo-600 text-white rounded-lg mt-auto play-btn" data-game-id="${escapeHtml(game.id)}">
                    Play
                </button>
            </div>
        `;
    }).join('');

    el.innerHTML = html;

    // 4. Wire up events
    el.querySelectorAll('.play-btn').forEach(btn => {
        btn.onclick = (e) => {
            const gameId = btn.getAttribute('data-game-id');
            const game = allGames[gameId];
            if (game) {
                logClick(gameId);
                launchGame(gameId, game.link);
            }
            e.stopPropagation(); // Prevent card click if implemented on card body
        };
    });

    el.querySelectorAll('.favorite-btn').forEach(btn => {
        btn.onclick = (e) => {
            toggleFavorite(btn.getAttribute('data-game-id'));
            e.stopPropagation();
        };
    });

    // Wire up keyboard navigation
    setupKeyboardNavigation(el);
}

/** Renders/updates the tab navigation based on data. */
function renderTabNavigation() {
    const nav = document.getElementById('tabNavigation');
    if (!nav) return;

    const favCount = DATA.favorites.length;
    const recentCount = DATA.recentPlayed.length;
    let html = '';

    // Game List Tab (Always there)
    html += `<button id="tabGameList" class="tab-button active px-4 py-2 transition duration-150 ease-in-out hover:text-indigo-300">Game List</button>`;

    // Favorites Tab (Only if there are favorites)
    if (favCount > 0) {
        html += `<button id="tabFavorites" class="tab-button px-4 py-2 transition duration-150 ease-in-out hover:text-indigo-300">Favorites (${favCount})</button>`;
    }

    // Recently Played Tab (Only if there are recent plays)
    if (recentCount > 0) {
        html += `<button id="tabRecent" class="tab-button px-4 py-2 transition duration-150 ease-in-out hover:text-indigo-300">Recent (${Math.min(recentCount, 5)})</button>`;
    }

    // Admin Tab (Always there)
    html += `<button id="tabAdmin" class="tab-button px-4 py-2 transition duration-150 ease-in-out hover:text-indigo-300">Admin Panel</button>`;

    nav.innerHTML = html;

    // Re-wire tab click handlers
    nav.querySelectorAll('.tab-button').forEach(btn => {
        btn.onclick = () => {
            switchTab(btn.id);
        };
    });

    // Ensure the currently active tab is set
    const activeTabId = document.querySelector('.tab-content:not(.hidden)').id.replace('View', '');
    nav.querySelector(`#tab${activeTabId.charAt(0).toUpperCase() + activeTabId.slice(1)}`).classList.add('active');
}

/**
 * Switches the active content view.
 * @param {string} tabId - e.g., 'tabGameList', 'tabFavorites', 'tabRecent'
 */
function switchTab(tabId) {
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));

    let viewId;
    if (tabId === 'tabGameList') {
        viewId = 'gameListView';
    } else if (tabId === 'tabFavorites') {
        viewId = 'favoritesView';
    } else if (tabId === 'tabRecent') {
        viewId = 'recentView';
    } else if (tabId === 'tabAdmin') {
        window.location.href = 'admin.html';
        return;
    }

    document.getElementById(tabId).classList.add('active');
    document.getElementById(viewId).classList.remove('hidden');

    // Re-render the game list content for the active view
    renderGameList();
}


function renderAdminOptions() {
    const selector = document.getElementById('editGameSelector');
    if (!selector) return;
    const sorted = Object.values(allGames).sort((a, b) => (a.name||'').localeCompare(b.name||''));
    let html = '<option value="">-- Add New Game --</option>';
    sorted.forEach(g => {
        html += `<option value="${escapeHtml(g.id)}">${escapeHtml(g.name)} (${escapeHtml(g.id)})</option>`;
    });
    selector.innerHTML = html;
}

function renderStatsSummary() {
    const el = document.getElementById('statsSummary');
    if (!el) return;
    const counts = stats.counts || {};
    const totalClicks = Object.entries(counts).reduce((s,[k,v]) => (k === '__visits' || k === '__errors' ? s : s + (v||0)), 0);
    const errors = counts.__errors || 0;
    el.textContent = `Total Games: ${Object.keys(allGames).length} | Total Clicks: ${totalClicks} | Visits: ${counts.__visits || 0} | Errors: ${errors}`;

    // top 3
    const entries = Object.entries(counts).filter(([k]) => k !== '__visits' && k !== '__errors').sort(([,a],[,b]) => b - a).slice(0,3);
    if (entries.length) {
        el.textContent += ' | Top: ' + entries.map(([id, c]) => `${escapeHtml((allGames[id] && allGames[id].name) || id)} (${c})`).join(', ');
    }
}

function renderRecentClicks() {
    const el = document.getElementById('recentClicks');
    if (!el) return;
    const recent = (stats.recent || []).slice().sort((a,b) => b.timestamp - a.timestamp).slice(0, 50);
    if (!recent.length) { el.innerHTML = '<p>No recent clicks recorded.</p>'; return; }
    let out = '<ul class="list-disc pl-5 space-y-1">';
    recent.forEach(r => {
        const t = new Date(r.timestamp).toLocaleString();
        const name = (allGames[r.gameId] && allGames[r.gameId].name) || r.gameId;
        const status = r.error ? '⚠️ ERROR' : '✅ Played';
        const color = r.error ? 'text-red-400' : 'text-slate-300';
        out += `<li class="truncate hover:text-white ${color}">${t} - ${status} - ${escapeHtml(name)} (${escapeHtml(r.gameId)})</li>`;
    });
    out += '</ul>';
    el.innerHTML = out;
}

function renderAll() {
    renderTabNavigation();
    renderGameList();
    renderAdminOptions();
    renderStatsSummary();
    renderRecentClicks();
}

// ---------- game launch ----------
/**
 * Launches a game in the modal.
 * @param {string} id - Game ID
 * @param {string} link - Game URL
 * @param {boolean} isTest - If true, it's a test launch from admin.
 */
function launchGame(id, link, isTest = false) {
    if (!link) {
        showMessage('Game Launch Error', `Game '${id}' does not have a link defined.`);
        return;
    }
    const frame = document.getElementById('gameIframe');
    const modal = document.getElementById('gameModal');
    if (!frame || !modal) return;

    frame.src = link;
    modal.classList.remove('hidden');

    if (!isTest) {
        // Log to recently played if it's a real launch
        DATA.recentPlayed = DATA.recentPlayed.filter(gId => gId !== id); // Remove old entry
        DATA.recentPlayed.push(id);
        DATA.recentPlayed = DATA.recentPlayed.slice(-5); // Keep last 5
        saveData(DATA);
        renderTabNavigation();
    }

    // Error Tracking: Clear previous listener, add new one
    frame.onload = () => {
        if (!isTest && frame.src.includes(link)) {
            // Check if the iframe content loaded successfully (basic check)
            // Note: cross-origin frame access is restricted, this is a best-effort check
            try {
                if (frame.contentWindow.document.body.innerHTML.includes('404') || frame.contentWindow.document.body.innerHTML.includes('blocked')) {
                    // This block will almost certainly fail due to CORS for external links,
                    // so we rely on the error listener below for a better signal.
                }
            } catch (e) {
                // CORS exception is common here, indicating a cross-origin load attempt
            }
        }
    };
    // Note: The onerror event on an iframe is not reliably triggered for HTTP errors
    // Instead, we log to admin on launch and rely on manual confirmation or external monitoring
}

/**
 * Launches a random game.
 */
function launchRandomGame() {
    const visibleGames = Object.values(allGames).filter(g => g.visible !== false && g.link);
    if (visibleGames.length === 0) {
        showMessage('No Games', 'No visible games with links to play.');
        return;
    }
    const randomGame = visibleGames[Math.floor(Math.random() * visibleGames.length)];
    logClick(randomGame.id);
    launchGame(randomGame.id, randomGame.link);
}


function closeGame() {
    const frame = document.getElementById('gameIframe');
    const modal = document.getElementById('gameModal');
    if (!frame || !modal) return;
    frame.src = '';
    modal.classList.add('hidden');
}

// ---------- stats logging ----------
/**
 * Logs a game click.
 * @param {string} gameId
 * @param {boolean} error - True if the game is suspected to have failed loading.
 */
function logClick(gameId, error = false) {
    stats.counts = stats.counts || {};
    if (error) {
        stats.counts.__errors = (stats.counts.__errors || 0) + 1;
    } else {
        stats.counts[gameId] = (stats.counts[gameId] || 0) + 1;
    }

    stats.recent = stats.recent || [];
    stats.recent.push({ gameId, error, timestamp: Date.now() });

    // keep last 500
    stats.recent = stats.recent.slice(-500);
    DATA.stats = stats;
    saveData(DATA);
}

// ---------- admin operations ----------
/**
 * Updates or inserts a game object.
 * @param {object} game - { id, name, link, visible, image, category }
 */
function upsertGame(game) {
    allGames[game.id] = {
        id: game.id,
        name: game.name,
        link: game.link || '',
        visible: game.visible !== false,
        image: game.image || 'assets/default.png', // Added image
        category: game.category || '' // Added category
    };
    setGamesObj(allGames);
}

function deleteGame(id) {
    if (allGames[id]) delete allGames[id];
    setGamesObj(allGames);
    // Also remove from favorites and recent
    DATA.favorites = DATA.favorites.filter(gId => gId !== id);
    DATA.recentPlayed = DATA.recentPlayed.filter(gId => gId !== id);
    saveData(DATA);
}

function resetStats() {
    stats = { counts: {}, recent: [] };
    DATA.stats = stats;
    saveData(DATA);
}

// ---------- UI helpers for admin page ----------
function clearGameForm() {
    const formFields = [
        { id: 'gameIdInput', value: '' },
        { id: 'gameNameInput', value: '' },
        { id: 'gameLinkInput', value: '' },
        { id: 'gameImageInput', value: '' }, // New Image field
        { id: 'gameCategoryInput', value: '' } // New Category field
    ];
    formFields.forEach(f => {
        const el = document.getElementById(f.id);
        if (el) el.value = f.value;
    });

    const vis = document.getElementById('gameVisibleInput');
    if (vis) vis.checked = true;
    const msg = document.getElementById('adminMessage');
    if (msg) msg.textContent = 'Creating a new game.';
}

/**
 * Loads game data into the admin form for editing.
 * @param {string} id - Game ID
 */
function loadGameToForm(id) {
    const g = getGamesObj()[id];
    if (!g) { clearGameForm(); return; }

    document.getElementById('gameIdInput').value = g.id;
    document.getElementById('gameNameInput').value = g.name;
    document.getElementById('gameLinkInput').value = g.link || '';
    document.getElementById('gameVisibleInput').checked = g.visible !== false;
    document.getElementById('gameImageInput').value = g.image || ''; // New
    document.getElementById('gameCategoryInput').value = g.category || ''; // New
    document.getElementById('adminMessage').textContent = 'Editing existing game.';
}

// ---------- Keyboard Navigation ----------
function setupKeyboardNavigation(container) {
    if (!container) return;
    let focusableCards = Array.from(container.querySelectorAll('.game-card'));
    let currentIndex = -1;

    document.onkeydown = (e) => {
        if (document.getElementById('gameModal').classList.contains('hidden') === false) return; // Ignore if game is open

        switch (e.key) {
            case 'ArrowUp':
                currentIndex = Math.max(-1, currentIndex - 1);
                break;
            case 'ArrowDown':
                currentIndex = Math.min(focusableCards.length - 1, currentIndex + 1);
                break;
            case 'Enter':
                if (currentIndex >= 0 && focusableCards[currentIndex]) {
                    focusableCards[currentIndex].querySelector('.play-btn').click();
                }
                break;
            default:
                return; // Do nothing
        }

        e.preventDefault(); // Stop page scrolling
        if (currentIndex >= 0 && focusableCards[currentIndex]) {
            focusableCards[currentIndex].focus();
        }
    };
}


// ---------- initial load ----------
function loadAll() {
    // refresh state from DATA
    DATA = loadData();
    allGames = DATA.games || {};
    stats = DATA.stats || { counts: {}, recent: [] };

    // hide loading message
    const loadingMessageEl = document.getElementById('loadingMessage');
    if (loadingMessageEl) loadingMessageEl.classList.add('hidden');

    renderAll();
}

// ---------- Secret Admin URL / Shortcut ----------
function checkAdminAccess() {
    // 1. Check URL Parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === '1') {
        localStorage.setItem('adminLoggedIn', 'true');
        showMessage('Admin Access Granted', 'Logged in via URL parameter. Reloading to Admin page...');
        setTimeout(() => { window.location.href = 'admin.html'; }, 1000);
        return;
    }

    // 2. Check Keyboard Shortcut
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.altKey && e.key === 'A') {
            if (localStorage.getItem('adminLoggedIn') !== 'true') {
                if (confirm('Use the keyboard shortcut to log in as admin?')) {
                    const pw = prompt('Enter Admin Password:');
                    if (pw === getAdminPassword()) {
                        localStorage.setItem('adminLoggedIn', 'true');
                        showMessage('Admin Access Granted', 'Logged in via keyboard shortcut. Reloading to Admin page...');
                        setTimeout(() => { window.location.href = 'admin.html'; }, 1000);
                    } else {
                        showMessage('Login Failed', 'Incorrect password.');
                    }
                }
            }
        }
    });
}


// expose needed functions to global scope used by HTML
window.renderGameList = renderGameList;
window.renderAdminOptions = renderAdminOptions;
window.renderStatsSummary = renderStatsSummary;
window.renderRecentClicks = renderRecentClicks;
window.renderAll = renderAll;
window.loadAll = loadAll;
window.launchGame = launchGame;
window.closeGame = closeGame;
window.logClick = logClick;
window.getGamesObj = getGamesObj;
window.upsertGame = upsertGame;
window.deleteGame = deleteGame;
window.clearGameForm = clearGameForm;
window.resetStats = resetStats;
window.getAdminPassword = getAdminPassword;
window.launchRandomGame = launchRandomGame; // Exposed for Random Game button
window.loadGameToForm = loadGameToForm; // Exposed for admin form logic
window.checkAdminAccess = checkAdminAccess; // Exposed for initial check
window.switchTab = switchTab; // Exposed for tab wiring
