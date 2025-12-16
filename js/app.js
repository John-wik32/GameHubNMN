const data = loadData();
const user = loadUser();
applyTheme(data.theme);

const gamesEl = document.getElementById("games");
const tabsEl = document.getElementById("tabs");
const recentEl = document.getElementById("recent-games");
const recentSec = document.getElementById("recent-section");

let activeTab = "All";

function init() {
    renderTabs();
    
    // Simulate network delay to show off the skeleton loader (Optional polish)
    setTimeout(() => {
        renderGames();
        renderRecent();
    }, 400); 
}

// --- RENDER FUNCTIONS ---

function renderTabs() {
    tabsEl.innerHTML = "";
    const allTabs = ["All", ...data.tabs];

    allTabs.forEach(tab => {
        const btn = document.createElement("button");
        btn.textContent = tab;
        if(tab !== activeTab) btn.classList.add("secondary");
        
        btn.onclick = () => {
            activeTab = tab;
            renderTabs();
            renderGames();
        };
        tabsEl.appendChild(btn);
    });
}

function renderGames(filterText = "") {
    gamesEl.innerHTML = "";
    
    let filtered = data.games;

    if (activeTab !== "All") filtered = filtered.filter(g => g.tab === activeTab);
    if (filterText) {
        const term = filterText.toLowerCase();
        filtered = filtered.filter(g => 
            g.title.toLowerCase().includes(term) || 
            g.tags.some(t => t.toLowerCase().includes(term))
        );
    }

    if(filtered.length === 0) {
        gamesEl.innerHTML = "<p style='grid-column:1/-1; text-align:center; color:gray;'>No games found.</p>";
        return;
    }

    filtered.forEach(g => {
        gamesEl.appendChild(createGameCard(g));
    });
}

function renderRecent() {
    if (user.recent.length === 0) {
        recentSec.classList.add("hide");
        return;
    }
    
    recentSec.classList.remove("hide");
    recentEl.innerHTML = "";
    
    user.recent.forEach(id => {
        const g = data.games.find(game => game.id === id);
        if (g) recentEl.appendChild(createGameCard(g));
    });
}

function createGameCard(g) {
    const card = document.createElement("div");
    card.className = "game-card";
    card.onclick = () => location.href = `player.html?id=${g.id}`;
    
    card.innerHTML = `
        <img src="${g.logo}" alt="${g.title}" loading="lazy" onerror="this.src='https://placehold.co/400x300/1e2332/FFF?text=Game'">
        <div class="game-info">
            <h3>${g.title}</h3>
            <p style="font-size:0.85rem; color:#888;">${g.views} views • ${g.likes} likes</p>
            <div style="margin-top:8px;">
                ${g.tags.slice(0, 3).map(t => `<span class="badge">${t}</span>`).join(" ")}
            </div>
        </div>
    `;
    return card;
}

function searchGames() {
    const text = document.getElementById("searchBar").value;
    renderGames(text);
}

// Start
init();
