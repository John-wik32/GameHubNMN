// --- FIREBASE AND INITIAL SETUP ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection, query, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Enable detailed logging for debugging
setLogLevel('Debug');

// Global Firebase variables
let app;
let db;
let auth;
let userId; // The current user's ID
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};

// --- GLOBAL STATE ---
let allGames = {};
let settings = {};
let stats = { 
    counts: {}, 
    recent: [],
    ratings: { likes: {}, dislikes: {} },
    reports: {} 
};
let localRecent = [];
let myFavorites = [];
let myGameNotes = {};
let myGameRatings = {};
let hubUser = { nickname: 'Player', avatar: '🎮' };
let currentTheme = 'light';
let isCloaked = false;
let currentTags = [];
let currentGameSort = 'name';
let currentSearchQuery = '';
let currentGameUrl = null;
const NEW_GAME_DAYS = 7;
const ADMIN_PASS = '2025'; // The admin password for this hub

// --- FIREBASE PATH HELPERS ---

/** Returns the path for public, shared data (games, settings, hub stats) */
const getPublicCollectionPath = (collectionName) => 
    `artifacts/${appId}/public/data/${collectionName}`;

/** Returns the path for user-specific, private data (favorites, notes, profile) */
const getPrivateCollectionPath = (collectionName) => 
    `artifacts/${appId}/users/${userId}/${collectionName}`;


// --- LOCALSTORAGE HELPER FUNCTIONS (Used only for settings/state persistence) ---

function getStorageData(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    try {
        return JSON.parse(raw);
    } catch (e) {
        console.error(`Failed to parse localStorage key "${key}":`, e);
        return defaultValue;
    }
}

function setStorageData(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.error(`Failed to set localStorage key "${key}":`, e);
    }
}


// --- UI / MODAL UTILITIES ---

/** Creates and displays a custom non-blocking alert modal */
function customAlert(message, title = "Info", type = "info") {
    const container = document.getElementById('customModalContainer');
    if (!container) return;

    // Type styling
    let icon = '';
    let bgColor = '';
    let textColor = '';
    
    switch (type) {
        case 'success':
            icon = '<i data-lucide="check-circle" class="w-6 h-6"></i>';
            bgColor = 'bg-green-600';
            textColor = 'text-green-50';
            break;
        case 'error':
            icon = '<i data-lucide="x-octagon" class="w-6 h-6"></i>';
            bgColor = 'bg-red-600';
            textColor = 'text-red-50';
            break;
        case 'warning':
            icon = '<i data-lucide="alert-triangle" class="w-6 h-6"></i>';
            bgColor = 'bg-yellow-600';
            textColor = 'text-yellow-50';
            break;
        case 'confirm':
        case 'info':
        default:
            icon = '<i data-lucide="info" class="w-6 h-6"></i>';
            bgColor = 'bg-accent';
            textColor = 'text-white';
            break;
    }

    const modalHTML = `
        <div id="modalContent" class="w-full max-w-sm p-4 ${bgColor} ${textColor} rounded-xl shadow-2xl animate-fade-in">
            <div class="flex items-start">
                <div class="mr-3">${icon}</div>
                <div class="flex-grow">
                    <h4 class="text-lg font-bold">${title}</h4>
                    <p class="mt-1 text-sm">${message}</p>
                </div>
                <button class="modal-close-btn p-1 ml-4 rounded-full hover:bg-black hover:bg-opacity-10 transition duration-150">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            ${type === 'confirm' ? `
                <div class="flex justify-end mt-4 space-x-2">
                    <button class="confirm-yes-btn px-4 py-1 text-sm font-semibold bg-white text-gray-800 rounded-lg hover:bg-gray-100">Yes</button>
                    <button class="confirm-no-btn px-4 py-1 text-sm font-semibold bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400">No</button>
                </div>
            ` : ''}
        </div>
    `;

    container.innerHTML = modalHTML;
    container.classList.remove('hidden');
    lucide.createIcons();

    const closeBtn = container.querySelector('.modal-close-btn');
    const modalContent = container.querySelector('#modalContent');

    const close = () => {
        modalContent.classList.add('animate-fade-out');
        modalContent.addEventListener('animationend', () => {
            container.classList.add('hidden');
            container.innerHTML = '';
        }, { once: true });
    };

    if (closeBtn) {
        closeBtn.onclick = close;
    }

    if (type !== 'confirm') {
        // Auto-close after 3 seconds for non-confirm messages
        setTimeout(close, 3000);
    }

    return new Promise((resolve) => {
        if (type === 'confirm') {
            const yesBtn = container.querySelector('.confirm-yes-btn');
            const noBtn = container.querySelector('.confirm-no-btn');
            yesBtn.onclick = () => { close(); resolve(true); };
            noBtn.onclick = () => { close(); resolve(false); };
        } else {
            // Resolve immediately for non-confirm messages
            resolve();
        }
    });
}

// --- RENDERING FUNCTIONS ---

function renderNavigation() {
    const desktopNav = document.getElementById('desktopNav');
    const mobileNav = document.getElementById('mobileNav');
    if (!desktopNav || !mobileNav) {
        console.error("Navigation elements not found.");
        return;
    }

    const navItems = [
        { id: 'home', name: 'Home', icon: 'home' },
        { id: 'favorites', name: 'Favorites', icon: 'heart' },
        { id: 'tags', name: 'Tags', icon: 'tag' }
    ];

    // Check if the user is an admin to show the admin link
    const isAdmin = getStorageData('isAdmin', false);
    if (isAdmin) {
        navItems.push({ id: 'admin', name: 'Admin', icon: 'lock' });
    }

    // Clear existing navs
    desktopNav.innerHTML = '';
    mobileNav.innerHTML = '';

    const currentSection = document.querySelector('.page:not([style*="display:none"])')?.id.replace('page-', '') || 'home';

    navItems.forEach(item => {
        const isActive = item.id === currentSection;
        const buttonClass = `flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-150 page-link ${
            isActive
                ? 'bg-accent text-white shadow-md hover:bg-opacity-90'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`;
        
        // Desktop Button
        const deskBtn = document.createElement('button');
        deskBtn.className = buttonClass;
        deskBtn.dataset.page = item.id;
        deskBtn.innerHTML = `<i data-lucide="${item.icon}" class="w-5 h-5"></i><span>${item.name}</span>`;
        desktopNav.appendChild(deskBtn);

        // Mobile Button
        const mobileBtn = document.createElement('button');
        mobileBtn.className = buttonClass + ' w-full justify-start'; // Full width for mobile
        mobileBtn.dataset.page = item.id;
        mobileBtn.innerHTML = `<i data-lucide="${item.icon}" class="w-5 h-5"></i><span>${item.name}</span>`;
        mobileNav.querySelector('.flex-col').appendChild(mobileBtn);
    });

    // Re-create lucide icons for the new elements
    lucide.createIcons();
}

function switchPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.style.display = 'none';
    });
    const targetPage = document.getElementById(`page-${pageId}`);
    if (targetPage) {
        targetPage.style.display = 'block';
    }
    
    // Rerender navigation to highlight the new active page
    renderNavigation();
    
    // Collapse mobile menu if open
    const mobileNav = document.getElementById('mobileNav');
    if (mobileNav && !mobileNav.classList.contains('hidden')) {
        mobileNav.classList.add('hidden');
    }
    
    // Run specific page renderers
    if (pageId === 'favorites') {
        renderFavoritesPage();
    } else if (pageId === 'tags') {
        renderTagsPage();
    }
}

// Global click handler for page navigation
function handlePageNavigation(e) {
    const link = e.target.closest('.page-link');
    if (link && link.dataset.page) {
        switchPage(link.dataset.page);
    }
}


function renderGameCard(gameId, isFeatured = false) {
    const game = allGames[gameId];
    if (!game) return '';

    const isFav = myFavorites.includes(gameId);
    const userRating = myGameRatings[gameId];
    const isLiked = userRating === 'like';
    const isDisliked = userRating === 'dislike';
    
    // Check if the game is new
    const gameCreatedDate = new Date(game.created || '2000-01-01');
    const isNew = (new Date() - gameCreatedDate) / (1000 * 60 * 60 * 24) < NEW_GAME_DAYS;

    const likeCount = stats.ratings.likes[gameId] || 0;
    const dislikeCount = stats.ratings.dislikes[gameId] || 0;

    // Determine card background and size based on featured status
    const sizeClasses = isFeatured 
        ? 'col-span-1 md:col-span-3 lg:col-span-5 flex-col md:flex-row' 
        : 'flex-col';
    const bgClasses = isFeatured 
        ? 'bg-gradient-to-br from-accent/10 to-transparent dark:from-accent/20' 
        : 'bg-white dark:bg-gray-800 hover:shadow-xl';
    
    const imagePlaceholder = game.title.substring(0, 1).toUpperCase();

    return `
        <div data-game-id="${gameId}" class="game-card flex ${sizeClasses} p-4 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg transition-all duration-300 cursor-pointer ${bgClasses}">
            <!-- Game Image/Placeholder -->
            <div class="relative flex items-center justify-center ${isFeatured ? 'w-full h-40 md:w-60 md:h-full' : 'w-full h-40'} flex-shrink-0 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                <!-- Placeholder Text -->
                <span class="text-6xl font-extrabold text-gray-500 dark:text-gray-400 opacity-70">
                    ${imagePlaceholder}
                </span>
                ${isNew ? '<span class="absolute top-2 right-2 px-2 py-1 text-xs font-bold text-white bg-green-500 rounded-full">NEW</span>' : ''}
            </div>
            
            <div class="flex flex-col ${isFeatured ? 'p-4 md:p-6 md:ml-6' : 'mt-4 w-full'}">
                <div class="flex justify-between items-center">
                    <h3 class="text-xl font-bold truncate ${isFeatured ? 'text-accent' : ''}">${game.title}</h3>
                    <!-- Favorite Button -->
                    <button class="favorite-toggle-btn p-1 text-yellow-500 hover:text-yellow-400" data-game-id="${gameId}" title="${isFav ? 'Remove from Favorites' : 'Add to Favorites'}">
                        <i data-lucide="${isFav ? 'star-fill' : 'star'}" class="w-5 h-5 ${isFav ? 'fill-yellow-500' : 'fill-none'}"></i>
                    </button>
                </div>
                
                <p class="mt-2 text-sm text-gray-600 dark:text-gray-400 ${isFeatured ? 'line-clamp-4' : 'line-clamp-2'}">${game.description || 'No description provided.'}</p>
                
                <div class="flex flex-wrap gap-2 mt-3">
                    ${(game.tags || '').split(',').filter(t => t.trim()).map(tag => `
                        <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 tag-filter-btn cursor-pointer" data-tag="${tag.trim()}">${tag.trim()}</span>
                    `).join('')}
                </div>

                <div class="flex items-center justify-between mt-4 border-t border-gray-100 dark:border-gray-700 pt-3 text-xs text-gray-500 dark:text-gray-400">
                    <!-- Rating Stats -->
                    <div class="flex items-center space-x-3">
                        <div class="flex items-center text-green-500">
                            <i data-lucide="thumbs-up" class="w-4 h-4 mr-1 ${isLiked ? 'fill-green-500' : 'fill-none'}"></i>
                            <span class="font-bold">${likeCount}</span>
                        </div>
                        <div class="flex items-center text-red-500">
                            <i data-lucide="thumbs-down" class="w-4 h-4 mr-1 ${isDisliked ? 'fill-red-500' : 'fill-none'}"></i>
                            <span class="font-bold">${dislikeCount}</span>
                        </div>
                    </div>
                    <span>Section: ${game.section.toUpperCase()}</span>
                </div>
            </div>
        </div>
    `;
}

function renderGameSections() {
    const container = document.getElementById('gameSectionsContainer');
    if (!container) return;

    // Clear existing dynamic pages
    container.innerHTML = '';

    const sections = {}; // Group games by section
    Object.values(allGames).forEach(game => {
        if (!sections[game.section]) {
            sections[game.section] = [];
        }
        sections[game.section].push(game);
    });

    // Map section titles for display order and nice titles
    const sectionTitles = {
        'popular': '🔥 Popular Picks',
        'new': '✨ New Games',
        'action': '💥 Action & Adventure',
        'puzzle': '🧩 Puzzle & Logic',
    };

    // Render each section
    Object.keys(sectionTitles).forEach(sectionKey => {
        const games = sections[sectionKey] || [];
        if (games.length > 0) {
            // Sort games alphabetically by title for consistent display
            games.sort((a, b) => a.title.localeCompare(b.title));

            const sectionHTML = `
                <section id="page-${sectionKey}" class="page mt-8">
                    <h2 class="text-3xl font-bold text-gray-900 dark:text-white">${sectionTitles[sectionKey]}</h2>
                    <div class="grid grid-cols-1 gap-6 mt-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        ${games.map(game => renderGameCard(game.id)).join('')}
                    </div>
                </section>
            `;
            container.innerHTML += sectionHTML;
        }
    });
}

function renderFeaturedGame() {
    const container = document.getElementById('featuredGameContainer');
    if (!container) return;

    // Find the most recently added game to feature
    const sortedGames = Object.values(allGames).sort((a, b) => {
        return new Date(b.created || 0) - new Date(a.created || 0);
    });

    if (sortedGames.length > 0) {
        container.innerHTML = `
            <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Featured Game of the Week</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                ${renderGameCard(sortedGames[0].id, true)}
            </div>
        `;
    } else {
        container.innerHTML = '';
    }
}

function renderRecentlyPlayed() {
    const grid = document.getElementById('recentlyPlayedGrid');
    if (!grid) return;

    // Filter out games that don't exist anymore and limit to 5
    const recentGames = localRecent
        .filter(id => allGames[id])
        .slice(0, 5);

    if (recentGames.length === 0) {
        grid.innerHTML = '<p class="text-gray-500 dark:text-gray-400 col-span-5">No games played recently. Start playing!</p>';
        return;
    }

    grid.innerHTML = recentGames.map(id => renderGameCard(id)).join('');
}

function renderFavoritesPage() {
    const grid = document.getElementById('favoritesGrid');
    if (!grid) return;

    const favoriteGames = myFavorites
        .map(id => allGames[id])
        .filter(game => game) // filter out deleted games
        .sort((a, b) => a.title.localeCompare(b.title));

    if (favoriteGames.length === 0) {
        grid.innerHTML = '<p class="text-gray-500 dark:text-gray-400 col-span-5">You haven\'t added any favorites yet. Click the ⭐ on a game card to save it here!</p>';
        return;
    }

    grid.innerHTML = favoriteGames.map(game => renderGameCard(game.id)).join('');
}

function renderTagsPage() {
    const grid = document.getElementById('tagsPageGrid');
    if (!grid) return;

    // Aggregate all unique tags
    const uniqueTags = new Set();
    Object.values(allGames).forEach(game => {
        (game.tags || '').split(',').forEach(tag => {
            const trimmedTag = tag.trim();
            if (trimmedTag) {
                uniqueTags.add(trimmedTag);
            }
        });
    });

    if (uniqueTags.size === 0) {
        grid.innerHTML = '<p class="text-gray-500 dark:text-gray-400">No tags found.</p>';
        return;
    }

    grid.innerHTML = Array.from(uniqueTags).map(tag => `
        <button class="px-3 py-1 text-sm font-medium rounded-full bg-accent/20 text-accent dark:bg-accent/40 dark:text-white hover:bg-accent hover:text-white transition-colors duration-150 tag-filter-btn" data-tag="${tag}">
            #${tag}
        </button>
    `).join('');
}

function renderAdminList() {
    const list = document.getElementById('existingGamesList');
    if (!list) return;

    const gamesArray = Object.values(allGames).sort((a, b) => a.title.localeCompare(b.title));

    if (gamesArray.length === 0) {
        list.innerHTML = '<p class="text-gray-500 dark:text-gray-400">No games currently in the hub.</p>';
        return;
    }

    list.innerHTML = gamesArray.map(game => `
        <div class="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700">
            <span class="text-sm font-medium truncate">${game.title}</span>
            <div class="flex space-x-2">
                <button data-game-id="${game.id}" class="admin-edit-btn p-1 text-blue-500 hover:text-blue-400" title="Edit Game">
                    <i data-lucide="pencil" class="w-4 h-4"></i>
                </button>
                <button data-game-id="${game.id}" class="admin-delete-btn p-1 text-red-500 hover:text-red-400" title="Delete Game">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

function renderAll() {
    // Rerender all components that depend on global state
    renderNavigation();
    renderFeaturedGame();
    renderRecentlyPlayed();
    renderGameSections();
    // Only render admin list if on admin page, but let's re-render it for consistency
    renderAdminList(); 
}

// --- GAME MODAL LOGIC ---

function updateGameStats(gameId, type) {
    if (!allGames[gameId] || !userId) return;

    const gameDocRef = doc(db, getPublicCollectionPath('hubStats'), 'ratings');
    
    // 1. Update the local user rating state
    const currentRating = myGameRatings[gameId];
    let newRating = null;

    if (type === 'like') {
        newRating = currentRating === 'like' ? null : 'like'; // Toggle like
    } else if (type === 'dislike') {
        newRating = currentRating === 'dislike' ? null : 'dislike'; // Toggle dislike
    }
    
    // 2. Prepare the Firestore update for public stats
    const updatePayload = {};

    // Decrement old count if switching or un-rating
    if (currentRating === 'like') {
        updatePayload[`likes.${gameId}`] = (stats.ratings.likes[gameId] || 1) - 1;
    } else if (currentRating === 'dislike') {
        updatePayload[`dislikes.${gameId}`] = (stats.ratings.dislikes[gameId] || 1) - 1;
    }

    // Increment new count if rating
    if (newRating === 'like') {
        updatePayload[`likes.${gameId}`] = (updatePayload[`likes.${gameId}`] || stats.ratings.likes[gameId] || 0) + 1;
    } else if (newRating === 'dislike') {
        updatePayload[`dislikes.${gameId}`] = (updatePayload[`dislikes.${gameId}`] || stats.ratings.dislikes[gameId] || 0) + 1;
    }

    // Clean up zero or negative counts before sending
    Object.keys(updatePayload).forEach(key => {
        if (updatePayload[key] <= 0) {
            updatePayload[key] = deleteField(); // Firestore function to delete a field (if available) - assuming here we use 0 instead as deleteField might not be in imported functions
            updatePayload[key] = 0; // Use 0 instead of deletion to simplify state sync
        }
    });

    // 3. Update the user's private rating
    const userRatingRef = doc(db, getPrivateCollectionPath('userProfile'), userId);
    
    setDoc(userRatingRef, {
        ratings: {
            ...myGameRatings,
            [gameId]: newRating
        }
    }, { merge: true }).catch(err => console.error("Error updating private rating:", err));

    // 4. Update the public game stats
    if (Object.keys(updatePayload).length > 0) {
        updateDoc(gameDocRef, updatePayload)
            .catch(err => console.error("Error updating public game stats:", err));
    }
}

function openGameModal(gameId) {
    const game = allGames[gameId];
    const gameModal = document.getElementById('gameModal');
    const modalGameTitle = document.getElementById('modalGameTitle');
    const gameIframe = document.getElementById('gameIframe');
    const likeCountSpan = document.getElementById('likeCount');
    const dislikeCountSpan = document.getElementById('dislikeCount');
    
    if (!game || !gameModal || !modalGameTitle || !gameIframe) return;

    // Update global state and UI
    currentGameUrl = game.url;
    modalGameTitle.textContent = game.title;
    gameIframe.src = game.url;
    gameModal.classList.remove('hidden');

    // Update stats UI
    likeCountSpan.textContent = stats.ratings.likes[gameId] || 0;
    dislikeCountSpan.textContent = stats.ratings.dislikes[gameId] || 0;
    
    // Highlight user's own rating
    const userRating = myGameRatings[gameId];
    const likeBtnIcon = document.querySelector('#modalLikeBtn i');
    const dislikeBtnIcon = document.querySelector('#modalDislikeBtn i');

    if (userRating === 'like') {
        likeBtnIcon.classList.add('fill-green-500');
        dislikeBtnIcon.classList.remove('fill-red-500');
    } else if (userRating === 'dislike') {
        dislikeBtnIcon.classList.add('fill-red-500');
        likeBtnIcon.classList.remove('fill-green-500');
    } else {
        likeBtnIcon.classList.remove('fill-green-500');
        dislikeBtnIcon.classList.remove('fill-red-500');
    }

    // Update recently played list (local only)
    localRecent = localRecent.filter(id => id !== gameId); // Remove if exists
    localRecent.unshift(gameId); // Add to front
    setStorageData('localRecent', localRecent);
}

function closeGameModal() {
    const gameModal = document.getElementById('gameModal');
    const gameIframe = document.getElementById('gameIframe');
    if (!gameModal || !gameIframe) return;

    gameModal.classList.add('hidden');
    gameIframe.src = ''; // Stop the game/audio
    currentGameUrl = null;

    // Re-render home page sections (especially recent list)
    renderRecentlyPlayed();
}


// --- FIREBASE AND INITIALIZATION ---

async function signInUser() {
    try {
        if (!firebaseConfig.apiKey) {
            console.warn("Firebase config is missing API key. Falling back to anonymous sign-in.");
        }
        
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            await signInAnonymously(auth);
        }
    } catch (error) {
        console.error("Firebase Auth Error:", error);
        document.getElementById('authMessage').textContent = 'Error';
    }
}

function startListeners() {
    // 1. Games Listener
    onSnapshot(collection(db, getPublicCollectionPath('games')), (snapshot) => {
        const newGames = {};
        snapshot.forEach(doc => {
            const data = doc.data();
            newGames[doc.id] = { id: doc.id, ...data };
        });
        allGames = newGames;
        console.log(`Fetched ${Object.keys(allGames).length} games.`);
        renderAll();
    }, (error) => console.error("Games Listener Error:", error));

    // 2. Settings Listener (public settings, like hub description)
    onSnapshot(doc(db, getPublicCollectionPath('hubSettings'), 'main'), (docSnap) => {
        if (docSnap.exists()) {
            settings = docSnap.data();
            document.getElementById('homeDesc').textContent = settings.hubDescription || 'A growing collection of unblocked games!';
            // Apply theme from settings
            applyThemeColor(settings.accentColor || 'blue');
        }
    }, (error) => console.error("Settings Listener Error:", error));
    
    // 3. Stats Listener (game ratings, popular counts)
    onSnapshot(doc(db, getPublicCollectionPath('hubStats'), 'ratings'), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            stats.ratings.likes = data.likes || {};
            stats.ratings.dislikes = data.dislikes || {};
            // Re-render everything that uses ratings
            renderAll();
        }
    }, (error) => console.error("Stats Listener Error:", error));

    // 4. User Profile Listener (private data)
    const userDocRef = doc(db, getPrivateCollectionPath('userProfile'), userId);
    onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            hubUser = data.profile || hubUser;
            myFavorites = data.favorites || [];
            myGameNotes = data.notes || {};
            myGameRatings = data.ratings || {};
            
            // Update UI elements dependent on user state
            updateUserProfileUI();
            renderAll();
        }
    }, (error) => console.error("Profile Listener Error:", error));
}

function updateAuthUI(user) {
    if (user) {
        userId = user.uid;
        document.getElementById('authMessage').textContent = 'Online';
        document.getElementById('authStatus').classList.remove('bg-gray-100', 'dark:bg-gray-700');
        document.getElementById('authStatus').classList.add('bg-green-100', 'text-green-800', 'dark:bg-green-900', 'dark:text-green-300');
    } else {
        // Should not happen after sign-in, but good practice
        document.getElementById('authMessage').textContent = 'Offline';
    }
}

async function initialize() {
    if (!firebaseConfig.projectId) {
         console.error("Firebase is not configured. Cannot initialize database.");
         document.getElementById('loadingModal').innerHTML = `<h2 class="text-xl font-bold text-white">Error: Firebase is not configured.</h2>`;
         return;
    }
    
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);

    // Get initial state from localStorage
    localRecent = getStorageData('localRecent', []);
    currentTheme = getStorageData('currentTheme', 'light');
    const savedCloak = getStorageData('cloakSettings', null);

    if (savedCloak) {
        document.getElementById('cloakTitleInput').value = savedCloak.title || 'Google Drive';
        document.getElementById('cloakFaviconInput').value = savedCloak.favicon || '📚';
    }

    // Apply initial theme and cloaking state (if any)
    document.documentElement.classList.toggle('dark', currentTheme === 'dark');
    updateThemeToggleUI();
    
    // Auth Listener and Data Loading
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            updateAuthUI(user);
            startListeners();
            // Hide loading modal once authenticated and data listeners are set up
            document.getElementById('loadingModal').classList.add('hidden');
        } else {
            // Sign in anonymously if no user is present
            await signInUser();
        }
    });
}

// --- APP LOGIC WRAPPED IN DOMContentLoaded TO FIX 'null' ERROR ---
document.addEventListener('DOMContentLoaded', () => {
    try {
        // --- DOM ELEMENT SELECTION (CRITICAL: Must be inside DOMContentLoaded) ---
        
        // Header
        const themeToggle = document.getElementById('themeToggle');
        const userProfileButton = document.getElementById('userProfileButton');
        const mobileMenuButton = document.getElementById('mobileMenuButton');
        const mobileNav = document.getElementById('mobileNav');
        const randomGameBtn = document.getElementById('randomGameBtn');

        // Modals
        const userProfileModal = document.getElementById('userProfileModal');
        const userProfileSaveBtn = document.getElementById('userProfileSaveBtn');
        const userProfileCancelBtn = document.getElementById('userProfileCancelBtn');
        const userNicknameInput = document.getElementById('userNicknameInput');
        const settingsModal = document.getElementById('settingsModal');
        const settingsButton = document.getElementById('settingsButton');
        const settingsSaveBtn = document.getElementById('settingsSaveBtn');
        const hubDescriptionInput = document.getElementById('hubDescriptionInput');
        const panicButton = document.getElementById('panicButton');
        const saveCloakSettingsBtn = document.getElementById('saveCloakSettingsBtn');

        // Game Modal
        const gameModal = document.getElementById('gameModal');
        const modalCloseBtn = document.getElementById('modalCloseBtn');
        const modalNewWindowBtn = document.getElementById('modalNewWindowBtn');
        const modalLikeBtn = document.getElementById('modalLikeBtn');
        const modalDislikeBtn = document.getElementById('modalDislikeBtn');
        const modalFavoriteBtn = document.getElementById('modalFavoriteBtn');

        // Admin
        const adminLoginBtn = document.getElementById('adminLoginBtn');
        const adminPasswordInput = document.getElementById('adminPasswordInput');
        const saveGameBtn = document.getElementById('saveGameBtn');
        const clearFormBtn = document.getElementById('clearFormBtn'); // THIS WAS LIKELY THE NULL ELEMENT
        const exportDataBtn = document.getElementById('exportDataBtn');
        const importDataBtn = document.getElementById('importDataBtn');
        const importFileInput = document.getElementById('importFileInput');
        
        // --- HANDLER FUNCTIONS ---

        function toggleTheme() {
            currentTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
            document.documentElement.classList.toggle('dark', currentTheme === 'dark');
            setStorageData('currentTheme', currentTheme);
            updateThemeToggleUI();
        }

        function updateThemeToggleUI() {
            const icon = themeToggle.querySelector('i');
            if (currentTheme === 'dark') {
                icon.dataset.lucide = 'moon';
            } else {
                icon.dataset.lucide = 'sun';
            }
            lucide.createIcons();
        }

        function applyThemeColor(color) {
            const root = document.documentElement;
            // Get the RGB value for the selected Tailwind color (e.g., 'blue-500')
            // For simplicity, we'll hardcode some defaults here or use a helper object
            const colorMap = {
                'blue': { hex: '#3b82f6', rgb: '59, 130, 246' },
                'green': { hex: '#22c55e', rgb: '34, 197, 94' },
                'red': { hex: '#ef4444', rgb: '239, 68, 68' },
                'indigo': { hex: '#6366f1', rgb: '99, 102, 241' },
                // ... add more colors as needed
            };
            const theme = colorMap[color] || colorMap['blue'];

            root.style.setProperty('--accent-color', theme.hex);
            root.style.setProperty('--accent-color-rgb', theme.rgb);
        }

        function toggleFavorite(gameId) {
            if (!gameId) return;
            const index = myFavorites.indexOf(gameId);
            if (index > -1) {
                myFavorites.splice(index, 1); // Remove
                customAlert('Removed from Favorites!', 'Removed', 'info');
            } else {
                myFavorites.push(gameId); // Add
                customAlert('Added to Favorites!', 'Favorite', 'success');
            }
            
            // Save to Firestore (private data)
            const userDocRef = doc(db, getPrivateCollectionPath('userProfile'), userId);
            setDoc(userDocRef, { favorites: myFavorites }, { merge: true })
                .catch(err => console.error("Error updating favorites:", err));
        }
        
        function handleAdminLogin() {
            const password = adminPasswordInput.value;
            if (password === ADMIN_PASS) {
                setStorageData('isAdmin', true);
                document.getElementById('adminLogin').classList.add('hidden');
                document.getElementById('adminTools').classList.remove('hidden');
                customAlert('Admin access granted!', 'Success', 'success');
                renderNavigation(); // Rerender nav to show the Admin link
            } else {
                customAlert('Incorrect password.', 'Denied', 'error');
            }
        }
        
        function clearAddForm() {
            document.getElementById('gameIdInput').value = '';
            document.getElementById('gameTitleInput').value = '';
            document.getElementById('gameUrlInput').value = '';
            document.getElementById('gameDescriptionInput').value = '';
            document.getElementById('gameTagsInput').value = '';
            document.getElementById('gameSectionInput').value = 'popular';
            document.getElementById('gameIdInput').classList.add('bg-gray-100');
            document.getElementById('gameIdInput').readOnly = true;
        }

        async function saveGame() {
            const idInput = document.getElementById('gameIdInput').value;
            const title = document.getElementById('gameTitleInput').value.trim();
            const url = document.getElementById('gameUrlInput').value.trim();
            const description = document.getElementById('gameDescriptionInput').value.trim();
            const tags = document.getElementById('gameTagsInput').value.trim();
            const section = document.getElementById('gameSectionInput').value;

            if (!title || !url || !section) {
                customAlert("Title, URL, and Section are required.", "Error", "error");
                return;
            }

            try {
                const gameData = { title, url, description, tags, section };
                const gamesRef = collection(db, getPublicCollectionPath('games'));
                
                if (idInput) {
                    // Edit existing game
                    const gameDocRef = doc(gamesRef, idInput);
                    await updateDoc(gameDocRef, gameData);
                    customAlert(`Game "${title}" updated!`, "Success", "success");
                } else {
                    // Add new game
                    // Auto-generate a simple ID for the new game
                    const newId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-*|-*$/g, '') + `-${new Date().getTime()}`;
                    await setDoc(doc(gamesRef, newId), { id: newId, ...gameData, created: new Date().toISOString() });
                    customAlert(`Game "${title}" added!`, "Success", "success");
                }
                
                // Data will re-render automatically via the Firestore listener
                clearAddForm();
            } catch (error) {
                console.error("Error saving game:", error);
                customAlert(`Error saving game: ${error.message}`, "Error", "error");
            }
        }
        
        function editGame(gameId) {
            const game = allGames[gameId];
            if (!game) return;
            
            document.getElementById('gameIdInput').value = game.id;
            document.getElementById('gameTitleInput').value = game.title;
            document.getElementById('gameUrlInput').value = game.url;
            document.getElementById('gameDescriptionInput').value = game.description;
            document.getElementById('gameTagsInput').value = game.tags;
            document.getElementById('gameSectionInput').value = game.section;

            document.getElementById('gameIdInput').readOnly = false;
            document.getElementById('gameIdInput').classList.remove('bg-gray-100');
            switchPage('admin');
        }

        async function deleteGame(gameId) {
            if (!gameId) return;

            const isConfirmed = await customAlert(`Are you sure you want to permanently delete game ID: ${gameId}?`, "Confirm Deletion", "confirm");
            
            if (isConfirmed) {
                try {
                    await deleteDoc(doc(db, getPublicCollectionPath('games'), gameId));
                    customAlert('Game deleted successfully!', 'Success', 'success');
                } catch (error) {
                    console.error("Error deleting game:", error);
                    customAlert(`Error deleting game: ${error.message}`, "Error", "error");
                }
            }
        }

        function exportData() {
            const dataToExport = {
                games: allGames,
                settings: settings,
                stats: stats
            };
            const jsonString = JSON.stringify(dataToExport, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `unblocked_hub_data_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            customAlert('Data export started!', 'Exporting', 'info');
        }

        async function importData(file) {
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);

                    if (data.games) {
                        for (const gameId in data.games) {
                            const game = data.games[gameId];
                            const gameDocRef = doc(db, getPublicCollectionPath('games'), gameId);
                            // Use setDoc to overwrite or create the game
                            await setDoc(gameDocRef, game);
                        }
                        customAlert(`Imported ${Object.keys(data.games).length} games.`, "Success", "success");
                    }

                    // Optional: Import settings and stats here if needed, 
                    // but usually, admin manages this manually or through dedicated inputs.

                } catch (err) {
                    console.error("Error during data import:", err);
                    customAlert(`Failed to import data: ${err.message}`, "Error", "error");
                }
            };
            reader.readAsText(file);
        }

        function handlePanic() {
            const settings = getStorageData('cloakSettings', {});
            const newTitle = settings.title || 'Google Drive';
            const newFavicon = settings.favicon || '📚';
            
            if (!isCloaked) {
                document.title = newTitle;
                document.getElementById('favicon').href = newFavicon;
                document.getElementById('appWrapper').style.display = 'none';
                isCloaked = true;
                customAlert(`Cloaked! Title: ${newTitle}, Favicon: ${newFavicon}`, 'Panic Mode Activated', 'warning');
            } else {
                document.title = 'Unblocked Game Hub';
                document.getElementById('favicon').href = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🎮</text></svg>';
                document.getElementById('appWrapper').style.display = 'block';
                isCloaked = false;
                customAlert('Uncloaked!', 'Panic Mode Deactivated', 'info');
            }
        }
        
        function saveCloakSettings() {
            const title = document.getElementById('cloakTitleInput').value.trim();
            const favicon = document.getElementById('cloakFaviconInput').value.trim();
            setStorageData('cloakSettings', { title, favicon });
            customAlert('Cloak settings saved!', 'Settings Updated', 'success');
        }

        function updateUserProfileUI() {
            document.getElementById('userProfileAvatar').textContent = hubUser.avatar;
            document.getElementById('userProfileName').textContent = hubUser.nickname;
        }

        function openUserProfileModal() {
            userNicknameInput.value = hubUser.nickname;
            userProfileModal.classList.remove('hidden');
            renderAvatarGrid();
        }

        function renderAvatarGrid() {
            const grid = document.getElementById('userAvatarGrid');
            const avatars = ['🎮', '🚀', '⭐', '👽', '👾', '🤖', '👑', '🐱', '🐶', '🍕', '⚽', '🏀', '🎸', '📚', '🧪', '💡'];

            grid.innerHTML = avatars.map(av => `
                <button class="avatar-btn ${hubUser.avatar === av ? 'avatar-selected' : ''}" data-avatar="${av}">
                    ${av}
                </button>
            `).join('');

            grid.querySelectorAll('.avatar-btn').forEach(btn => {
                btn.onclick = () => {
                    grid.querySelectorAll('.avatar-btn').forEach(b => b.classList.remove('avatar-selected'));
                    btn.classList.add('avatar-selected');
                    hubUser.avatar = btn.dataset.avatar; // Temporarily update user object
                };
            });
        }

        async function saveUserProfile() {
            const newNickname = userNicknameInput.value.trim() || 'Player';
            const newAvatar = hubUser.avatar; // Gets updated by the grid click handler

            hubUser = { nickname: newNickname, avatar: newAvatar };
            updateUserProfileUI();
            
            // Save to Firestore (private data)
            const userDocRef = doc(db, getPrivateCollectionPath('userProfile'), userId);
            await setDoc(userDocRef, { profile: hubUser }, { merge: true })
                .catch(err => console.error("Error saving profile:", err));

            userProfileModal.classList.add('hidden');
            customAlert('Profile saved!', 'Success', 'success');
        }

        // --- ATTACH EVENT LISTENERS ---

        // General Navigation
        document.addEventListener('click', handlePageNavigation);
        
        // Theme Toggle
        if (themeToggle) themeToggle.onclick = toggleTheme;
        
        // Mobile Menu
        if (mobileMenuButton) mobileMenuButton.onclick = () => mobileNav.classList.toggle('hidden');

        // Game Modal Listeners
        if (modalCloseBtn) modalCloseBtn.onclick = closeGameModal;
        if (modalNewWindowBtn) modalNewWindowBtn.onclick = () => {
            if (currentGameUrl) window.open(currentGameUrl, '_blank');
        };
        if (gameModal) {
             gameModal.onclick = (e) => {
                 if (e.target === gameModal) closeGameModal(); // Close on backdrop click
             };
        }
        
        // Game Interaction Buttons
        if (modalLikeBtn) modalLikeBtn.onclick = () => updateGameStats(modalLikeBtn.closest('#gameModal').querySelector('iframe').src.split('/').pop().split('.').shift(), 'like');
        if (modalDislikeBtn) modalDislikeBtn.onclick = () => updateGameStats(modalDislikeBtn.closest('#gameModal').querySelector('iframe').src.split('/').pop().split('.').shift(), 'dislike');
        if (modalFavoriteBtn) modalFavoriteBtn.onclick = () => toggleFavorite(modalFavoriteBtn.closest('#gameModal').querySelector('iframe').src.split('/').pop().split('.').shift());
        
        // Game Card Click Handler
        document.addEventListener('click', (e) => {
            const card = e.target.closest('.game-card');
            if (card) {
                // If the click target is the favorite button, let that handler run
                if (e.target.closest('.favorite-toggle-btn')) {
                    toggleFavorite(card.dataset.gameId);
                    return;
                }
                // If the click target is a tag, filter games
                if (e.target.closest('.tag-filter-btn')) {
                    // Implement tag filtering logic here if needed, for now just show a message
                    customAlert(`Filtering by tag: ${e.target.dataset.tag}`, "Filter", "info");
                    return;
                }
                // Otherwise, open the game modal
                openGameModal(card.dataset.gameId);
            }
        });

        // User Profile Modal
        if (userProfileButton) userProfileButton.onclick = openUserProfileModal;
        if (userProfileSaveBtn) userProfileSaveBtn.onclick = saveUserProfile;
        if (userProfileCancelBtn) userProfileCancelBtn.onclick = () => userProfileModal.classList.add('hidden');

        // Settings Modal
        if (settingsButton) settingsButton.onclick = () => settingsModal.classList.remove('hidden');
        if (settingsSaveBtn) settingsSaveBtn.onclick = () => {
             // Save hub description
             if (hubDescriptionInput && settings.hubDescription !== hubDescriptionInput.value) {
                 const settingsRef = doc(db, getPublicCollectionPath('hubSettings'), 'main');
                 updateDoc(settingsRef, { hubDescription: hubDescriptionInput.value.trim() })
                    .catch(err => customAlert(`Error saving description: ${err.message}`, "Error", "error"));
             }
             settingsModal.classList.add('hidden');
        };
        if (panicButton) panicButton.onclick = handlePanic;
        if (saveCloakSettingsBtn) saveCloakSettingsBtn.onclick = saveCloakSettings;
        
        // Admin: Login
        if (adminLoginBtn) adminLoginBtn.onclick = handleAdminLogin;

        // Admin: Game Management
        if (saveGameBtn) saveGameBtn.onclick = saveGame;
        if (clearFormBtn) clearFormBtn.onclick = clearAddForm;
        
        document.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.admin-edit-btn');
            const deleteBtn = e.target.closest('.admin-delete-btn');
            
            if (editBtn) editGame(editBtn.dataset.gameId);
            if (deleteBtn) deleteGame(deleteBtn.dataset.gameId);
        });

        // Admin: Data
        if (exportDataBtn) exportDataBtn.onclick = exportData;
        if (importDataBtn) importDataBtn.onclick = () => importFileInput.click();
        if (importFileInput) importFileInput.onchange = (e) => {
            if (e.target.files.length > 0) {
                importData(e.target.files[0]);
            }
        };

        // --- MAIN INITIALIZATION CALL ---
        initialize();
        console.log("App initialization process started.");
        
    } catch (err) {
        console.error("A fatal error occurred during initialization:", err);
        // Show a user-friendly error message
        const loadingModal = document.getElementById('loadingModal');
        if (loadingModal) {
            loadingModal.innerHTML = `
                <div class="p-4 bg-red-800 border-4 border-red-500 rounded-lg">
                    <h2 class="text-xl font-bold text-white">Error: Could not load the application.</h2>
                    <p class="mt-2 text-red-100">Check the console (F12) for details.</p>
                </div>`;
        }
    }
});
