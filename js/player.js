const data = load();
applyTheme(data.theme);

const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get('id');
const gameIndex = data.games.findIndex(g => g.id === gameId);
const game = data.games[gameIndex];

if (!game) {
    alert("Game not found!");
    location.href = "index.html";
} else {
    // Increment Views
    game.views = (game.views || 0) + 1;
    data.games[gameIndex] = game;
    save(data);
    initPlayer();
}

function initPlayer() {
    document.getElementById("gameTitle").innerText = game.title;
    document.getElementById("gameDesc").innerText = game.description;
    document.getElementById("likeCount").innerText = game.likes;

    // Secure Embed
    const wrapper = document.getElementById("playerWrapper");
    wrapper.innerHTML = `<iframe src="${game.embed}" allowfullscreen sandbox="allow-scripts allow-same-origin allow-pointer-lock"></iframe>`;
    
    renderComments();
}

function toggleLike() {
    game.likes++;
    document.getElementById("likeCount").innerText = game.likes;
    save(data);
    // Add visual feedback
    const btn = document.getElementById("likeBtn");
    btn.style.background = "#ff4757";
    setTimeout(() => btn.style.background = "", 200);
}

function goFullscreen() {
    const elem = document.getElementById("playerWrapper");
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    }
}

function shareGame() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        alert("Link copied to clipboard!");
    });
}

function postComment() {
    const input = document.getElementById("commentInput");
    if(input.value.trim() === "") return;

    game.comments.push(input.value);
    save(data);
    input.value = "";
    renderComments();
}

function renderComments() {
    const list = document.getElementById("commentsList");
    list.innerHTML = "";
    
    // Show newest first
    [...game.comments].reverse().forEach(c => {
        const div = document.createElement("div");
        div.style.cssText = "border-bottom:1px solid rgba(255,255,255,0.1); padding:8px 0;";
        div.textContent = c;
        list.appendChild(div);
    });
}
