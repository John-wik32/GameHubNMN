/* ===========================================================
   UnblockHub – LocalStorage Version
   Admin Password: 2025
   No backend, all data stored in browser
   =========================================================== */

// ----------------------------
// LocalStorage Helper
// ----------------------------
function saveData(data) {
    localStorage.setItem("unblockhub_data", JSON.stringify(data));
}

function loadData() {
    const raw = localStorage.getItem("unblockhub_data");
    if (!raw) {
        // First time user – create default structure
        const defaultData = {
            games: [],
            stats: { visits: 0 },
            admin_password: "2025"
        };
        saveData(defaultData);
        return defaultData;
    }
    return JSON.parse(raw);
}

// Global data object
let DATA = loadData();

// ----------------------------
// Stats: Increase visit count
// ----------------------------
DATA.stats.visits++;
saveData(DATA);

// ----------------------------
// Game Functions
// ----------------------------

// Add a game
function addGame(title, url) {
    DATA.games.push({ title, url });
    saveData(DATA);
    displayGames();
}

// Delete a game
function deleteGame(index) {
    DATA.games.splice(index, 1);
    saveData(DATA);
    displayGames();
}

// ----------------------------
// Display Games (for index.html)
// ----------------------------
function displayGames() {
    const container = document.getElementById("gameList");
    if (!container) return;

    container.innerHTML = "";

    DATA.games.forEach((game, i) => {
        const div = document.createElement("div");
        div.className = "game-card";
        div.innerHTML = `
            <h3>${game.title}</h3>
            <button onclick="playGame('${game.url}')">Play</button>
            <button onclick="deleteGame(${i})" class="delete-btn">Delete</button>
        `;
        container.appendChild(div);
    });
}

// ----------------------------
// Play Game (iframe modal)
// ----------------------------
function playGame(url) {
    const frame = document.getElementById("gameFrame");
    const modal = document.getElementById("gameModal");

    if (!frame || !modal) return;

    frame.src = url;
    modal.style.display = "flex";
}

function closeGame() {
    const frame = document.getElementById("gameFrame");
    const modal = document.getElementById("gameModal");

    if (!frame || !modal) return;

    frame.src = "";
    modal.style.display = "none";
}

// ----------------------------
// Admin Login
// ----------------------------
function adminLogin() {
    const input = document.getElementById("adminPassword").value;

    if (input === DATA.admin_password) {
        localStorage.setItem("adminLoggedIn", "true");
        window.location.href = "admin.html";
    } else {
        alert("Wrong password");
    }
}

// Check admin page access
function requireAdmin() {
    if (localStorage.getItem("adminLoggedIn") !== "true") {
        alert("You must log in first.");
        window.location.href = "index.html";
    }
}

// Admin logout
function adminLogout() {
    localStorage.removeItem("adminLoggedIn");
    window.location.href = "index.html";
}

// ----------------------------
// Initialize on page load
// ----------------------------
document.addEventListener("DOMContentLoaded", () => {
    displayGames();
});
