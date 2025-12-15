const data = load();

function login() {
  if (pass.value === data.password) {
    login.style.display = "none";
    panel.hidden = false;
    renderAdmin();
  } else alert("Wrong password");
}

function renderAdmin() {
  stats.innerHTML =
    "Games: " + data.games.length + "<br>" +
    "Views: " + data.games.reduce((a,g)=>a+g.views,0);

  tabList.innerHTML = "";
  data.tabs.forEach((t,i)=>{
    const li=document.createElement("li");
    li.textContent=t;
    li.draggable=true;
    li.ondragstart=e=>e.dataTransfer.setData("i",i);
    li.ondrop=e=>{
      const from=e.dataTransfer.getData("i");
      data.tabs.splice(i,0,data.tabs.splice(from,1)[0]);
      save(data); renderAdmin();
    };
    li.ondragover=e=>e.preventDefault();
    tabList.appendChild(li);
  });
}

function addGame() {
  data.games.push({
    id: uid(),
    title: title.value,
    embed: embed.value,
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
  renderAdmin();
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

