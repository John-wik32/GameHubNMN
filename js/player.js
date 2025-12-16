const data = loadData();
const user = loadUser();
applyTheme(data.theme);

const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get('id');
const gameIndex = data.games.findIndex(g => g.id === gameId);
const game = data.games[gameIndex];

if (!game) {
    alert("Game not found!");
    location.href = "index.html";
} else {
    // 1. Update Title and Views
    document.title = `Playing ${game.title} - GameHub`;
    game.views = (game.views || 0) + 1;
    data.games[gameIndex] = game;
    saveData(data);
    
    // 2. Add to Recently Played
    addToRecent(game.id);

    // 3. Render
    initPlayer();
}

function initPlayer() {
    document.getElementById("gameTitle").innerText = game.title;
    document.getElementById("gameDesc").innerText = game.description;
    document.getElementById("likeCount").innerText = game.likes;
    
    // Render Tags
    const tagContainer = document.getElementById("gameTags");
    game.tags.forEach(t => {
        const span = document.createElement("span");
        span.className = "badge";
        span.style.marginRight = "5px";
        span.innerText = t;
        tagContainer.appendChild(span);
    });

    // Check if Favorite
    updateFavButton();

    // Secure Embed
    const wrapper = document.getElementById("playerWrapper");
    wrapper.innerHTML = `<iframe src="${game.embed}" allowfullscreen sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-forms"></iframe>`;
    
    renderComments();
}

function toggleLike() {
    game.likes++;
    document.getElementById("likeCount").innerText = game.likes;
    saveData(data);
    
    const btn = document.getElementById("likeBtn");
    btn.style.background = "#ff4757";
    setTimeout(() => btn.style.background = "", 200);
}

function toggleFav() {
    if (user.favorites.includes(game.id)) {
        user.favorites = user.favorites.filter(id => id !== game.id);
    } else {
        user.favorites.push(game.id);
    }
    saveUser(user);
    updateFavButton();
}

function updateFavButton() {
    const btn = document.getElementById("favBtn");
    if (user.favorites.includes(game.id)) {
        btn.style.background = "#f1c40f";
        btn.innerText = "⭐ Favorited";
    } else {
        btn.style.background = "";
        btn.innerText = "⭐ Favorite";
        btn.classList.add("secondary");
    }
}

function goFullscreen() {
    const elem = document.getElementById("playerWrapper");
    if (elem.requestFullscreen) elem.requestFullscreen();
}

function shareGame() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => alert("Link copied!"));
}

function postComment() {
    const input = document.getElementById("commentInput");
    if(!input.value.trim()) return;
    game.comments.push(input.value);
    saveData(data);
    input.value = "";
    renderComments();
}

function renderComments() {
    const list = document.getElementById("commentsList");
    list.innerHTML = "";
    [...game.comments].reverse().forEach(c => {
        const div = document.createElement("div");
        div.style.cssText = "border-bottom:1px solid rgba(255,255,255,0.1); padding:8px 0;";
        div.textContent = c;
        list.appendChild(div);
    });
}
