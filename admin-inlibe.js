const data = load();

// 🔐 Secret key combo: Ctrl + Shift + A
document.addEventListener("keydown", e => {
  if (e.ctrlKey && e.shiftKey && e.key === "A") {
    unlockAdmin();
  }
});

function unlockAdmin() {
  const pass = prompt("Admin password:");
  if (pass === data.password) {
    document.getElementById("adminBtn").hidden = false;
  } else {
    alert("Wrong password");
  }
}

document.getElementById("adminBtn").onclick = () => {
  openAdmin();
};

function openAdmin() {
  const overlay = document.getElementById("adminOverlay");
  overlay.hidden = false;
  overlay.innerHTML = adminUI();
  attachAdminLogic();
}
