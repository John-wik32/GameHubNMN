const data = loadData();

// Auth Check
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

// --- NAVIGATION ---
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

// --- LOGIC ---

function renderDashboard() {
    const totalViews = data.games.reduce((acc, g) => acc + (g.views || 0), 0);
    document.getElementById('stat-views').innerText = totalViews;
    document.getElementById('stat-count').innerText = data.games.length;
}

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
    if(embedRaw.includes("<iframe")) {
        const match = embedRaw.match(/src=["'](.*?)["']/);
        if(match) embedUrl = match[1];
    }

    const newGame = {
        id: uid(),
        title: document.getElementById('in-title').value,
        logo: document.getElementById('in-logo').value || "https://placehold.co/400x300",
        description: document.getElementById('in-desc').value,
        embed: embedUrl,
        tags: document.getElementById('in-tags').value.split(',').map(s=>s.trim()),
        tab: document.getElementById('in-tab').value,
        likes: 0,
        views: 0,
        comments: []
    };

    data.games.push(newGame);
    saveData(data);
    alert("Game Published (Locally)");
    renderManageList();
    renderDashboard();
    
    // Reset Form
    document.getElementById('in-title').value = "";
    document.getElementById('in-embed').value = "";
}

function renderManageList() {
    const list = document.getElementById('game-list-admin');
    list.innerHTML = "";
    data.games.forEach((g, index) => {
        const div = document.createElement("div");
        div.style.cssText = "background:var(--bg); padding:10px; display:flex; justify-content:space-between; align-items:center; border-radius:8px;";
        div.innerHTML = `
            <div><strong>${g.title}</strong></div>
            <button onclick="deleteGame(${index})" style="background:#ff4757; width:auto; padding:5px 10px;">Delete</button>
        `;
        list.appendChild(div);
    });
}

function deleteGame(index) {
    if(confirm("Delete this game?")) {
        data.games.splice(index, 1);
        saveData(data);
        renderManageList();
        renderDashboard();
    }
}

// --- SETTINGS ---
function initThemeInputs() {
    document.getElementById('col-primary').value = data.theme.primary;
    document.getElementById('col-bg').value = data.theme.bg;
}

function saveThemeSettings() {
    data.theme = {
        primary: document.getElementById('col-primary').value,
        bg: document.getElementById('col-bg').value,
        card: document.getElementById('col-card').value,
        text: document.getElementById('col-text').value
    };
    saveData(data);
    alert("Theme Updated");
}

function renderTabSettings() {
    const ul = document.getElementById('tab-list-ul');
    ul.innerHTML = "";
    data.tabs.forEach((t, i) => {
        const li = document.createElement("li");
        li.innerHTML = `${t} <span onclick="removeTab(${i})" style="color:red; cursor:pointer; margin-left:10px;">[x]</span>`;
        ul.appendChild(li);
    });
}

function addNewTab() {
    const val = document.getElementById('new-tab-name').value;
    if(val) {
        data.tabs.push(val);
        saveData(data);
        renderTabSettings();
        populateTabSelect();
        document.getElementById('new-tab-name').value = "";
    }
}

function removeTab(index) {
    data.tabs.splice(index, 1);
    saveData(data);
    renderTabSettings();
    populateTabSelect();
}

// --- SYSTEM ---

function checkLinks() {
    const report = document.getElementById("link-report");
    report.innerHTML = "Checking links... (Check console for CORS errors)";
    
    let broken = 0;
    data.games.forEach(g => {
        // Simple check (Real validation requires backend usually)
        if(!g.embed.startsWith("http")) {
            report.innerHTML += `<br><span style="color:red">Invalid URL: ${g.title}</span>`;
            broken++;
        }
    });
    
    if(broken === 0) report.innerHTML = "<span style='color:green'>All URL formats look valid!</span>";
}

function exportData() {
    const str = JSON.stringify(data, null, 2);
    const box = document.getElementById("export-area");
    box.value = str;
    box.select();
    document.execCommand("copy");
    alert("Data copied! Paste this into the 'defaultData' object in js/store.js to make it permanent for everyone.");
}
