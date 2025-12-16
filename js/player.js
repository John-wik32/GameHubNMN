const data = load();
const id = new URLSearchParams(location.search).get("id");
const game = data.games.find(g => g.id === id);

title.textContent = game.title;
player.innerHTML =
  game.embed.includes("<")
    ? game.embed
    : `<iframe src="${game.embed}" allowfullscreen></iframe>`;

game.views++;
save(data);

function like() {
  game.likes++;
  save(data);
  alert("Liked");
}

function comment() {
  game.comments.push(commentText.value);
  save(data);
  renderComments();
}

function renderComments() {
  comments.innerHTML = "";
  game.comments.forEach(c => {
    const d = document.createElement("div");
    d.textContent = c;
    comments.appendChild(d);
  });
}

renderComments();
