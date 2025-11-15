/* script.js - LocalStorage version (no backend)
   Admin password: 2025
   Keeps the same UI behavior as original Apps Script version.
*/

// Global variables for data store
let DATA = {};
let allGames = {};
let stats = {};

// Default admin password (can be changed in the data object)
const DEFAULT_PASSWORD = '2025';

// ---------- LocalStorage helpers ----------
const STORAGE_KEY = 'unblockhub_data';

function loadData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        // Updated default games to include 'image' with a working placeholder URL
        const defaultData = {
            games: {
                'flappy-bird': { id: 'flappy-bird', name: 'Flappy Bird Clone', link: 'https://flappybird.io/', visible: true, image: 'https://placehold.co/60x60/312e81/ffffff?text=FB' },
                'snake-game': { id: 'snake-game', name: 'Classic Snake', link: 'https://playsnake.org/', visible: true, image: 'https://placehold.co/60x60/312e81/ffffff?text=Snake' },
                'tetris': { id: 'tetris', name: 'Simple Tetris', link: 'https://tetris.com/play-tetris/', visible: true, image: 'https://placehold.co/60x60/312e81/ffffff?text=T' }
            },
            stats: { counts: {}, recent: [] },
            admin_password: DEFAULT_PASSWORD
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
        return defaultData;
    }
    try {
        const data = JSON.parse(raw);
        // Ensure data structure has image property for old entries
        for (const id in data.games) {
            if (!data.games[id].image) {
                data.games[id].image = ''; // Initialize image property
            }
        }
        // Ensure password exists
        if (!data.admin_password) data.admin_password = DEFAULT_PASSWORD;
        return data;
    } catch (e) {
        console.error('Failed to parse storage, resetting', e);
        // Fallback to clearing storage to prevent perpetual loop
        localStorage.removeItem(STORAGE_KEY);
        return loadData();
    }
}

function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getGamesObj() {
    return (DATA && DATA.games) ? DATA.games : {};
}

function setGamesObj(obj) {
    DATA.games = obj;
    saveData(DATA);
    allGames = obj;
}

function getStatsObj() {
    return (DATA && DATA.stats) ? DATA.stats : { counts: {}, recent: [] };
}

function setStatsObj(obj) {
    DATA.stats = obj;
    saveData(DATA);
    stats = obj;
}

// Simple HTML escaping helper (prevent XSS in logs/display)
function escapeHtml(text) {
    if (typeof text !== 'string') return text;
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
}

// ---------- UI Rendering ----------

// Renders game list on the main page
function renderGameList() {
    const container = document.getElementById('gameListContainer');
    if (!container) return;

    const filterText = document.getElementById('gameFilterInput') ?
        document.getElementById('gameFilterInput').value.toLowerCase() : '';

    // Get games, convert to array, sort by click count (descending)
    const gameArray = Object.values(allGames);
    gameArray.sort((a, b) => {
        const clicksA = stats.counts[a.id] || 0;
        const clicksB = stats.counts[b.id] || 0;
        return clicksB - clicksA;
    });

    // Filter games
    const visibleGames = gameArray.filter(game =>
        game.visible !== false &&
        (game.name.toLowerCase().includes(filterText) || game.id.toLowerCase().includes(filterText))
    );

    // Build the HTML using the new 'image' property
    const html = visibleGames.map(game => `
        <div id="game-${escapeHtml(game.id)}" class="game-card bg-slate-800 p-5 rounded-xl shadow-lg cursor-pointer transition duration-200 ease-in-out hover:shadow-indigo-500/20"
             data-game-id="${escapeHtml(game.id)}" data-game-link="${escapeHtml(game.link || '')}" onclick="window.launchGame('${escapeHtml(game.id)}')">
            
            <!-- Use the provided image URL or a text-based placeholder if none is provided -->
            ${game.image ? 
                `<img src="${escapeHtml(game.image)}" alt="${escapeHtml(game.name)} icon" onerror="this.onerror=null; this.src='https://placehold.co/60x60/475569/ffffff?text=Game'" 
                      class="w-16 h-16 object-cover rounded-md mb-3">` : 
                `<div class="w-16 h-16 bg-slate-700 flex items-center justify-center rounded-md mb-3 text-lg font-bold text-indigo-400">${escapeHtml(game.name.charAt(0))}</div>`
            }

            <h3 class="text-xl font-bold text-indigo-300 truncate">${escapeHtml(game.name)}</h3>
            <p class="text-sm text-slate-400 mt-1">Clicks: <span class="font-bold">${stats.counts[game.id] || 0}</span></p>
        </div>
    `).join('');

    container.innerHTML = html;
}

// Renders the select box in the admin panel
function renderAdminOptions() {
    const selector = document.getElementById('editGameSelector');
    if (!selector) return;

    const gameArray = Object.values(allGames).sort((a, b) => a.name.localeCompare(b.name));

    let html = '<option value="">-- Add New Game --</option>';

    html += gameArray.map(game =>
        `<option value="${escapeHtml(game.id)}">${escapeHtml(game.name)} (${escapeHtml(game.id)})</option>`
    ).join('');

    selector.innerHTML = html;
}

// Renders summary statistics in the admin panel
function renderStatsSummary() {
    const totalGames = Object.keys(allGames).length;
    const totalClicks = Object.values(stats.counts).reduce((sum, count) => sum + count, 0);

    const totalGamesEl = document.getElementById('statTotalGames');
    if (totalGamesEl) totalGamesEl.textContent = totalGames;

    const totalClicksEl = document.getElementById('statTotalClicks');
    if (totalClicksEl) totalClicksEl.textContent = totalClicks;
}

// Renders the recent clicks list in the admin panel
function renderRecentClicks() {
    const listEl = document.getElementById('recentClicksList');
    if (!listEl) return;

    // Display the last 10 entries, reversed so newest is on top
    const logHtml = stats.recent.slice(-10).reverse().map(log => {
        const date = new Date(log.timestamp);
        const timeStr = date.toLocaleTimeString();
        return `<p class="text-slate-400 mb-1">${escapeHtml(log.id)} - ${timeStr}</p>`;
    }).join('');

    listEl.innerHTML = logHtml || '<p class="text-slate-400">No clicks recorded yet.</p>';
}

// Renders all dynamic components
function renderAll() {
    renderGameList();
    renderAdminOptions();
    renderStatsSummary();
    renderRecentClicks();
}

// ---------- Game Management ----------

function upsertGame(game) {
    // game: { id, name, link, image, visible }
    allGames[game.id] = {
        id: game.id,
        name: game.name,
        link: game.link || '',
        image: game.image || '', // Save the image link
        visible: game.visible !== false
    };
    setGamesObj(allGames);
}

function deleteGame(id) {
    if (allGames[id]) {
        delete allGames[id];
        delete stats.counts[id]; // Also delete stats for this game
        // Filter recent logs to remove entries for this game
        stats.recent = stats.recent.filter(log => log.id !== id);
        setGamesObj(allGames);
        setStatsObj(stats);
    }
}

function clearGameForm() {
    const idEl = document.getElementById('gameIdInput');
    if (idEl) idEl.value = '';
    const nameEl = document.getElementById('gameNameInput');
    if (nameEl) nameEl.value = '';
    const linkEl = document.getElementById('gameLinkInput');
    if (linkEl) linkEl.value = '';
    const imageEl = document.getElementById('gameImageInput');
    if (imageEl) imageEl.value = '';
    const vis = document.getElementById('gameVisibleInput');
    if (vis) vis.checked = true;
    const msg = document.getElementById('adminMessage');
    if (msg) msg.textContent = 'Creating a new game.';
}

// ---------- Stats Management ----------

function logClick(gameId) {
    // 1. Update counts
    stats.counts[gameId] = (stats.counts[gameId] || 0) + 1;

    // 2. Add to recent log
    stats.recent.push({
        id: gameId,
        timestamp: Date.now()
    });

    // Keep log size reasonable (e.g., last 100 entries)
    if (stats.recent.length > 100) {
        stats.recent = stats.recent.slice(-100);
    }

    setStatsObj(stats);
}

function resetStats() {
    stats = { counts: {}, recent: [] };
    setStatsObj(stats);
}

// ---------- Game Launching ----------

function launchGame(gameId) {
    const game = allGames[gameId];
    if (!game || !game.link) {
        window.showAlert('Launch Error', `Game ID "${gameId}" not found or link is missing.`);
        return;
    }

    // 1. Log the click
    logClick(gameId);

    // 2. Display the modal
    const modal = document.getElementById('gameModal');
    const iframe = document.getElementById('gameIframe');
    const title = document.getElementById('gameTitle');
    const link = document.getElementById('gameLink');

    title.textContent = game.name;
    link.href = game.link;
    link.textContent = 'Open in New Tab';

    // Set the iframe source and show the modal
    iframe.src = game.link;
    modal.classList.remove('hidden');

    // Re-render the game list to update the click count immediately
    renderGameList();
}

function closeGame() {
    const modal = document.getElementById('gameModal');
    const iframe = document.getElementById('gameIframe');

    // Clear the iframe source to stop any audio/video/processing
    iframe.src = '';
    modal.classList.add('hidden');
}

// ---------- admin validation / protection ----------
// (Kept for completeness, logic is mostly in admin.html)
function requireAdmin() {
    return localStorage.getItem('adminLoggedIn') === 'true';
}

// ---------- initial load ----------
function loadAll() {
    // refresh state from DATA
    DATA = loadData();
    allGames = DATA.games || {};
    stats = DATA.stats || { counts: {}, recent: [] };

    // hide loading message (only present in index.html)
    const loadingMessageEl = document.getElementById('loadingMessage');
    if (loadingMessageEl) loadingMessageEl.classList.add('hidden');

    renderAll();
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
window.DATA = DATA; // Expose DATA for admin.html access
