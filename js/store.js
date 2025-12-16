const KEY_DATA = "GAMEHUB_DATA_V3"; // Main Site Data
const KEY_USER = "GAMEHUB_USER_V1"; // User Preferences (History, Likes)

// Default Site Data (The "Database")
const defaultData = {
  password: "admin",
  theme: {
    primary: "#7c5cff",
    bg: "#0b0e14",
    card: "#1e2332",
    text: "#ffffff"
  },
  tabs: ["Action", "Strategy", "Puzzle", "Racing"],
  // Pre-filling one example so the site isn't empty
  games: [
    {
      id: "demo1",
      title: "Space Shooter Demo",
      logo: "https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?w=400&q=80",
      description: "A classic space shooter game example.",
      embed: "https://itch.io/embed-upload/263678?color=333333", // Example valid embed
      tags: ["Action", "Space"],
      tab: "Action",
      views: 120,
      likes: 45,
      comments: []
    }
  ]
};

// Default User Data (Private to the user)
const defaultUser = {
  recent: [], // IDs of games played
  favorites: [] // IDs of liked games
};

// --- DATA FUNCTIONS ---

function loadData() {
  const stored = localStorage.getItem(KEY_DATA);
  return stored ? JSON.parse(stored) : structuredClone(defaultData);
}

function saveData(data) {
  localStorage.setItem(KEY_DATA, JSON.stringify(data));
  applyTheme(data.theme);
}

// --- USER FUNCTIONS ---

function loadUser() {
  const stored = localStorage.getItem(KEY_USER);
  return stored ? JSON.parse(stored) : structuredClone(defaultUser);
}

function saveUser(user) {
  localStorage.setItem(KEY_USER, JSON.stringify(user));
}

function addToRecent(gameId) {
  const user = loadUser();
  // Remove if exists (to move to top)
  user.recent = user.recent.filter(id => id !== gameId);
  // Add to front
  user.recent.unshift(gameId);
  // Keep only last 4
  if (user.recent.length > 4) user.recent.pop();
  saveUser(user);
}

// --- UTILS ---

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function applyTheme(t) {
  if(!t) return;
  const root = document.documentElement.style;
  root.setProperty("--primary", t.primary);
  root.setProperty("--bg", t.bg);
  root.setProperty("--card", t.card);
  root.setProperty("--text", t.text);
}
