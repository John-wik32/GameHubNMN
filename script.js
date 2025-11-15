/* script.js - LocalStorage version (no backend)
   Admin password: 2025
   Keeps the same UI behavior as original Apps Script version.
*/

// ---------- LocalStorage helpers ----------
const STORAGE_KEY = 'unblockhub_data';

function loadData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        const defaultData = {
            games: {
                'flappy-bird': { id: 'flappy-bird', name: 'Flappy Bird Clone', link: 'https://flappybird.io/', visible: true },
                'snake-game': { id: 'snake-game', name: 'Classic Snake', link: 'https://playsnake.org/', visible: true },
                'tetris': { id: 'tetris', name: 'Simple Tetris', link: 'https://tetris.com/play-tetris/', visible: true }
            },
            stats: { counts: {}, recent: [] },
            admin_password: '2025'
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
        return defaultData;
    }
    try {
        return JSON.parse(raw);
    } catch (e) {
        console.error('Failed to parse storage, resetting', e);
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
}

// ---------- state ----------
let DATA = loadData();
let allGames = getGamesObj(); // object keyed by id
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

// ---------- rendering / frontend logic ----------
function renderGameList() {
    const el = document.getElementById('gameListContainer');
    if (!el) return;
    const filter = (document.getElementById('gameFilterInput') && document.getElementById('gameFilterInput').value || '').toLowerCase();

    const visibleGames = Object.values(allGames)
        .filter(g => g.visible !== false)
        .filter(g => (g.name || '').toLowerCase().includes(filter));

    if (visibleGames.length === 0) {
        el.innerHTML = `<p class="col-span-full text-center text-lg text-slate-400">${filter ? 'No games match your filter.' : 'No games available.'}</p>`;
        return;
    }

    const html = visibleGames.map(game => `
        <div id="game-${escapeHtml(game.id)}" class="game-card bg-slate-800 p-5 rounded-xl shadow-lg cursor-pointer transition duration-200 ease-in-out hover:shadow-indigo-500/20"
             data-game-id="${escapeHtml(game.id)}" data-game-link="${escapeHtml(game.link || '')}">
            <h3 class="text-xl font-bold text-indigo-300 truncate">${escapeHtml(game.name)}</h3>
            <p class="text-sm text-slate-400 mt-1">ID: ${escapeHtml(game.id)}</p>
        </div>
    `).join('');

    el.innerHTML = html;

    el.querySelectorAll('.game-card').forEach(card => {
        card.onclick = () => {
            const gameId = card.getAttribute('data-game-id');
            const gameLink = card.getAttribute('data-game-link');
            logClick(gameId);
            launchGame(gameId, gameLink);
        };
    });
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
    const totalClicks = Object.entries(counts).reduce((s,[k,v]) => (k === '__visits' ? s : s + (v||0)), 0);
    el.textContent = `Total Games: ${Object.keys(allGames).length} | Total Clicks: ${totalClicks} | Visits: ${counts.__visits || 0}`;

    // top 3
    const entries = Object.entries(counts).filter(([k]) => k !== '__visits').sort(([,a],[,b]) => b - a).slice(0,3);
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
        out += `<li class="truncate hover:text-white">${t} - ${escapeHtml(name)} (${escapeHtml(r.gameId)}) ${r.userKey ? ' • ' + escapeHtml(r.userKey) : ''}</li>`;
    });
    out += '</ul>';
    el.innerHTML = out;
}

function renderAll() {
    renderGameList();
    renderAdminOptions();
    renderStatsSummary();
    renderRecentClicks();
}

// ---------- game launch ----------
function launchGame(id, link) {
    if (!link) { showMessage('Game Launch Error', `Game '${id}' does not have a link defined.`); return; }
    const frame = document.getElementById('gameIframe');
    const modal = document.getElementById('gameModal');
    if (!frame || !modal) return;
    frame.src = link;
    modal.classList.remove('hidden');
}

function closeGame() {
    const frame = document.getElementById('gameIframe');
    const modal = document.getElementById('gameModal');
    if (!frame || !modal) return;
    frame.src = '';
    modal.classList.add('hidden');
}

// ---------- stats logging ----------
function logClick(gameId, userKey) {
    stats.counts = stats.counts || {};
    stats.counts[gameId] = (stats.counts[gameId] || 0) + 1;
    stats.recent = stats.recent || [];
    const safeKey = (userKey || '').toString().replace(/[^\w-]/g, '');
    stats.recent.push({ gameId, userKey: safeKey, timestamp: Date.now() });
    // keep last 500
    stats.recent = stats.recent.slice(-500);
    DATA.stats = stats;
    saveData(DATA);
}

// ---------- admin operations ----------
function upsertGame(game) {
    // game: { id, name, link, visible }
    allGames[game.id] = {
        id: game.id,
        name: game.name,
        link: game.link || '',
        visible: game.visible !== false
    };
    setGamesObj(allGames);
}

function deleteGame(id) {
    if (allGames[id]) delete allGames[id];
    setGamesObj(allGames);
}

function resetStats() {
    stats = { counts: {}, recent: [] };
    DATA.stats = stats;
    saveData(DATA);
}

// ---------- UI helpers for admin page ----------
function clearGameForm() {
    const idEl = document.getElementById('gameIdInput');
    if (idEl) idEl.value = '';
    const nameEl = document.getElementById('gameNameInput');
    if (nameEl) nameEl.value = '';
    const linkEl = document.getElementById('gameLinkInput');
    if (linkEl) linkEl.value = '';
    const vis = document.getElementById('gameVisibleInput');
    if (vis) vis.checked = true;
    const msg = document.getElementById('adminMessage');
    if (msg) msg.textContent = 'Creating a new game.';
}

// ---------- admin validation / protection ----------
function requireAdmin() {
    if (localStorage.getItem('adminLoggedIn') === 'true') return true;
    return false;
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
