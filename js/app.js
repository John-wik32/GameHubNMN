const data = load();
applyTheme(data.theme);

const gamesEl = document.getElementById("games");
const tabsEl = document.getElementById("tabs");
let activeTab = "All";

// Render Tabs
function initTabs() {
    tabsEl.innerHTML = "";
    
    // Add 'All' tab manually if not present
    const allTabs = ["All", ...data.tabs.filter(t => t !== "All")];

    allTabs.forEach(tab => {
        const btn = document.createElement("button");
        btn.textContent = tab;
        if(tab !== activeTab) btn.classList.add("secondary");
        
        btn.onclick = () => {
            activeTab = tab;
            initTabs(); // Re-render tabs to update active class
            renderGames();
        };
        tabsEl.appendChild(btn);
    });
}

// Render Games
function renderGames(filterText = "") {
    gamesEl.innerHTML = "";
    
    let filtered = data.games;

    // Filter by Tab
    if (activeTab !== "All") {
        filtered = filtered.filter(g => g.tab === activeTab);
    }

    // Filter by Search
    if (filterText) {
        filtered = filtered.filter(g => 
            g.title.toLowerCase().includes(filterText.toLowerCase()) || 
            g.tags.some(t => t.toLowerCase().includes(filterText.toLowerCase()))
        );
    }

    if(filtered.length === 0) {
        gamesEl.innerHTML = "<p style='grid-column:1/-1; text-align:center; color:gray;'>No games found.</p>";
        return;
    }

    filtered.forEach(g => {
        const card = document.createElement("div");
        card.className = "game-card";
        card.onclick = () => location.href = `player.html?id=${g.id}`;
        
        card.innerHTML = `
            <img src="${g.logo}" alt="${g.title}" onerror="this.src='https://placehold.co/400x300?text=Game'">
            <div class="game-info">
                <h3>${g.title}</h3>
                <p>${g.views} views • ${g.likes} likes</p>
                <div style="margin-top:8px;">
                    ${g.tags.map(t => `<span class="badge">${t}</span>`).join(" ")}
                </div>
            </div>
        `;
        gamesEl.appendChild(card);
    });
}

function searchGames() {
    const text = document.getElementById("searchBar").value;
    renderGames(text);
}

// Init
initTabs();
renderGames();
