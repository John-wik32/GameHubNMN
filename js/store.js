const KEY = "GAMEHUB_DB_V2";

const defaultData = {
  password: "admin", // Change this immediately in real usage
  siteName: "GameHub",
  theme: {
    primary: "#7c5cff",
    bg: "#0b0e14",
    card: "#1e2332",
    text: "#ffffff"
  },
  tabs: ["All", "Action", "Strategy"],
  games: [], // { id, title, logo, description, embed, tags, tab, likes, views, comments: [] }
  analytics: {
    totalVisits: 0
  }
};

function load() {
  const stored = localStorage.getItem(KEY);
  if (!stored) return structuredClone(defaultData);
  return JSON.parse(stored);
}

function save(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
  applyTheme(data.theme);
}

function applyTheme(t) {
  if(!t) return;
  const root = document.documentElement.style;
  root.setProperty("--primary", t.primary);
  root.setProperty("--bg", t.bg);
  root.setProperty("--card", t.card);
  root.setProperty("--text", t.text);
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Helper to get top games
function getStats(data) {
  const sortedByViews = [...data.games].sort((a,b) => b.views - a.views);
  const sortedByLikes = [...data.games].sort((a,b) => b.likes - a.likes);
  
  return {
    mostViewed: sortedByViews[0] || null,
    mostLiked: sortedByLikes[0] || null,
    totalGames: data.games.length,
    totalViews: data.games.reduce((acc, g) => acc + g.views, 0)
  };
}
