const data = load();
applyTheme();

/* ---------- UI ---------- */
const gamesEl = document.getElementById("games");
const tabsEl = document.getElementById("tabs");
const adminBtn = document.getElementById("adminBtn");
const adminOverlay = document.getElementById("adminOverlay");

/* ---------- Tabs ---------- */
tabsEl.innerHTML = "";
data.tabs.forEach(tab => {
  const b = document.createElement("button");
  b.textContent = tab;
  b.onclick = () => render(tab);
  tabsEl.appendChild(b);
});

function render(tab) {
  gamesEl.innerHTML = "";
  data.games
    .filter(g => g.tab === tab)
    .forEach(g => {
      const d = document.createElement("div");
      d.className = "game";
      d.innerHTML = `<h3>${g.title}</h3>`;
      d.onclick = () => location.href = `player.html?id=${g.id}`;
      gamesEl.appendChild(d);
    });
}

render(data.tabs[0]);

/* ---------- Theme ---------- */
function applyTheme() {
  const t = data.theme;
  document.documentElement.style.setProperty("--primary", t.primary);
  document.documentElement.style.setProperty("--bg", t.bg);
  document.documentElement.style.setProperty("--card", t.card);
  document.documentElement.style.setProperty("--text", t.text);
}

/* ---------- ADMIN ACCESS ---------- */
// Ctrl + Shift + A
document.addEventListener("keydown", e => {
  if (e.ctrlKey && e.shiftKey && e.key === "A") {
    const pass = prompt("Admin password:");
    if (pass === data.password) {
      adminBtn.hidden = false;
      alert("Admin unlocked");
    } else {
      alert("Wrong password");
    }
  }
});

adminBtn.onclick = openAdmin;

/* ---------- ADMIN UI ---------- */
function openAdmin() {
  adminOverlay.hidden = false;
  adminOverlay.innerHTML = `
    <div class="admin-panel">
      <h2>Admin Panel</h2>

      <h3>Add Game</h3>
      <input id="aTitle" placeholder="Title">
      <textarea id="aEmbed" placeholder="Embed or game URL"></textarea>
      <input id="aTab" placeholder="Tab">
      <button id="addGame">Add Game</button>

      <h3>Theme</h3>
      <input type="color" id="aPrimary" value="${data.theme.primary}">
      <input type="color" id="aBg" value="${data.theme.bg}">
      <input type="color" id="aCard" value="${data.theme.card}">
      <input type="color" id="aText" value="${data.theme.text}">
      <button id="saveTheme">Save Theme</button>

      <h3>Analytics</h3>
      <p>
        Games: ${data.games.length}<br>
        Views: ${data.games.reduce((a,g)=>a+g.views,0)}
      </p>

      <button id="closeAdmin">Close</button>
    </div>
  `;

  document.getElementById("addGame").onclick = () => {
    data.games.push({
      id: uid(),
      title: aTitle.value,
      embed: aEmbed.value,
      tab: aTab.value,
      likes: 0,
      views: 0,
      comments: []
    });
    save(data);
    alert("Game added");
    location.reload();
  };

  document.getElementById("saveTheme").onclick = () => {
    data.theme = {
      primary: aPrimary.value,
      bg: aBg.value,
      card: aCard.value,
      text: aText.value
    };
    save(data);
    location.reload();
  };

  document.getElementById("closeAdmin").onclick = () => {
    adminOverlay.hidden = true;
  };
}
