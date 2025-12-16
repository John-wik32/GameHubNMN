const KEY = "GAMEHUB_DATA";

const defaultData = {
  password: "admin123",
  theme: {
    primary: "#7c5cff",
    bg: "#0f111a",
    card: "#181b29",
    text: "#ffffff"
  },
  tabs: ["Popular", "New"],
  games: []
};

function load() {
  return JSON.parse(localStorage.getItem(KEY)) || structuredClone(defaultData);
}

function save(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

function uid() {
  return Math.random().toString(36).slice(2);
}
