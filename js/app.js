const data = load();
applyTheme();

const gamesEl = document.getElementById("games");
const tabsEl = document.getElementById("tabs");

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

function applyTheme() {
  const t = data.theme;
  document.documentElement.style.setProperty("--primary", t.primary);
  document.documentElement.style.setProperty("--bg", t.bg);
  document.documentElement.style.setProperty("--card", t.card);
  document.documentElement.style.setProperty("--text", t.text);
}

