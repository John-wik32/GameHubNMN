const data = load();

// Verify Auth
const pass = sessionStorage.getItem("admin_auth");
if (pass !== data.password) {
    const input = prompt("Enter Admin Password:");
    if (input === data.password) {
        sessionStorage.setItem("admin_auth", input);
    } else {
        location.href = "index.html";
    }
}

// Init
applyTheme(data.theme);
renderDashboard();
populateTabSelect();
renderManageList();
renderTabSettings();
initThemeInputs();

// --- Navigation ---
function showSection(id) {
    document.querySelectorAll('.panel-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.sidebar button').forEach(el => el.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.getElementById('btn-' + id).classList.add('active');
}

function logout() {
    sessionStorage.removeItem("admin_auth");
    location.href = "index.html";
}

// --- Dashboard ---
function renderDashboard() {
    const stats = getStats(data);
    
    // Mock Live Users (Random between 10-100)
    setInterval(() => {
        document.getElementById('stat-users').innerText = Math.floor(Math.random() * (120 - 40 + 1) + 40);
    }, 3000);
    document.getElementById('stat-users').innerText = 42; // Initial

    document.getElementById('stat-views').innerText = stats.totalViews;
    document.getElementById('stat-count').innerText = stats.totalGames;

    const topList = document.getElementById('top-games-list');
    if(stats.mostViewed) {
        topList.innerHTML = `
            <p><strong>🔥 Most Viewed:</strong> ${stats.mostViewed.title} (${stats.mostViewed.views})</p>
            <p><strong>❤️ Most Liked:</strong> ${stats.mostLiked.title} (${stats.mostLiked.likes})</p>
        `;
    } else {
        topList.innerHTML = "<p>No data yet.</p>";
    }
}

// --- Add Game ---
function populateTabSelect() {
    const sel = document.getElementById('in-tab');
    sel.innerHTML = "";
    data.tabs.forEach(t => {
        const op = document.createElement("option");
        op.value = t;
        op.innerText = t;
        sel.appendChild(op);
    });
}

function submitGame() {
    const embedRaw = document.getElementById('in-embed').value;
    let embedUrl = embedRaw;
    
    // Extract SRC if user pasted full <iframe> code
    if(embedRaw.includes("<iframe")) {
        const match = embedRaw.match(/src=["'](.*?)["']/);
        if(match) embedUrl = match[1];
    }

    const newGame = {
        id: uid(),
        title: document.getElementById('in-title').value,
        logo: document.getElementById('in-logo').value || "https://placehold.co/400x300?text=No+Image",
        description: document.getElementById('in-desc').value,
        embed: embedUrl,
        tags: document.getElementById('in-tags').value.split(',').map(s=>s.trim()),
        tab: document.getElementById('in-tab').value,
        likes: 0,
        views: 0,
        comments: []
    };

    data.games.push(newGame);
    save(data);
    alert("Game Published!");
    renderManageList();
    renderDashboard();
    
    // Clear inputs
    document.getElementById('in-title').value = "";
    document.getElementById('in-embed').value = "";
}

// --- Manage Games ---
function renderManageList() {
    const list = document.getElementById('game-list-admin');
    list.innerHTML = "";
    
    data.games.forEach((g, index) => {
        const div = document.createElement("div");
        div.style.cssText = "background:var(--bg); padding:10px; display:flex; justify-content:space-between; align-items:center; border-radius:8px;";
        div.innerHTML = `
            <div>
                <strong>${g.title}</strong> <small>(${g.views} views)</small>
            </div>
            <button onclick="deleteGame(${index})" style="background:#ff4757; width:auto; padding:5px 10px;">Delete</button>
        `;
        list.appendChild(div);
    });
}

function deleteGame(index) {
    if(confirm("Are you sure?")) {
        data.games.splice(index, 1);
        save(data);
        renderManageList();
        renderDashboard();
    }
}

// --- Settings ---
function initThemeInputs() {
    document.getElementById('col-primary').value = data.theme.primary;
    document.getElementById('col-bg').value = data.theme.bg;
    document.getElementById('col-card').value = data.theme.card;
    document.getElementById('col-text').value = data.theme.text;
}

function saveThemeSettings() {
    data.theme = {
        primary: document.getElementById('col-primary').value,
        bg: document.getElementById('col-bg').value,
        card: document.getElementById('col-card').value,
        text: document.getElementById('col-text').value
    };
    save(data);
    alert("Theme Updated!");
}

function renderTabSettings() {
    const ul = document.getElementById('tab-list-ul');
    ul.innerHTML = "";
    data.tabs.forEach((t, i) => {
        if(t === "All") return; // Can't delete 'All'
        const li = document.createElement("li");
        li.innerHTML = `${t} <span onclick="removeTab(${i})" style="color:red; cursor:pointer; margin-left:10px;">[x]</span>`;
        ul.appendChild(li);
    });
}

function addNewTab() {
    const val = document.getElementById('new-tab-name').value;
    if(val) {
        data.tabs.push(val);
        save(data);
        renderTabSettings();
        populateTabSelect();
        document.getElementById('new-tab-name').value = "";
    }
}

function removeTab(index) {
    data.tabs.splice(index, 1);
    save(data);
    renderTabSettings();
    populateTabSelect();
}
