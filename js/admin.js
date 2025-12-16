const data = load();

function addGame() {
  data.games.push({
    id: uid(),
    title: title.value,
    logo: logo.value,
    description: description.value,
    embed: embed.value,
    tags: tags.value.split(","),
    tab: tab.value,
    likes: 0,
    views: 0,
    comments: []
  });
  save(data);
  alert("Game added");
}

function addTab() {
  data.tabs.push(newTab.value);
  save(data);
  renderTabs();
}

function renderTabs() {
  tabList.innerHTML = "";
  data.tabs.forEach(t => {
    const li = document.createElement("li");
    li.textContent = t;
    tabList.appendChild(li);
  });
}

function saveTheme() {
  data.theme = {
    primary: primary.value,
    bg: bg.value,
    card: card.value,
    text: text.value
  };
  save(data);
  alert("Theme saved");
}

stats.innerHTML = `
Games: ${data.games.length}<br>
Views: ${data.games.reduce((a,g)=>a+g.views,0)}
`;

renderTabs();
