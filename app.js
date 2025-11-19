// ==========================================
// CONFIGURATION
// ==========================================
const CONFIG = {
    APP_NAME: 'Unblocked Game Hub',
    VERSION: '2.0.0',
    
    // Feature Flags
    FEATURES: {
        RANDOM_GAME: true,
        RECENTLY_PLAYED: true,
        GAME_REPORTING: true,
        GAME_OF_DAY: true,
        PWA_SUPPORT: false, // Disable if not using HTTPS
        ANALYTICS: true,
        FULLSCREEN_BUTTON: true,
    },
    
    // Limits & Settings
    NEW_GAME_DAYS: 7,
    LOCAL_RECENT_LIMIT: 5,
    GLOBAL_RECENT_LIMIT: 10,
    SEARCH_DEBOUNCE_MS: 300,
    RATE_LIMIT_ACTIONS: 50,
    
    // Security (CHANGE THIS!)
    ADMIN_PASS_HASH: 'bXlwYXNz', // btoa('mypass')
    
    // UI
    ACCENT_COLORS: {
        'Blue': { hex: '#3b82f6', rgb: '59, 130, 246' },
        'Green': { hex: '#10b981', rgb: '16, 185, 129' },
        'Purple': { hex: '#8b5cf6', rgb: '139, 92, 246' },
        'Red': { hex: '#ef4444', rgb: '239, 68, 68' },
    },
    
    AVATARS: ['🎮', '👾', '🚀', '🤖', '🐱', '🐶', '🍕', '⚽', '👑', '🧙'],
    
    // Default Games
    DEFAULT_GAMES: {
        'g_subway_surfers': {
            title: 'Subway Surfers',
            url: 'https://cdn.jsdelivr.net/gh/bubbls/UGS-file-encryption@ae2e3923116cf101ff4d6ddbeec12df3dc78f133/subway-surfers.html',
            image: 'https://placehold.co/400x300/f87171/ffffff?text=Subway+Surfers',
            description: 'Run and dodge trains in this endless runner classic!',
            section: 'featured',
            tags: ['runner', 'mobile', 'action'],
            controls: 'Arrow Keys: Move • Space: Jump',
            created: '2024-10-20T10:00:00.000Z'
        },
        'g_slope': {
            title: 'Slope',
            url: 'https://cdn.jsdelivr.net/gh/bubbls/UGS-file-encryption@ae2e3923116cf101ff4d6ddbeec12df3dc78f133/slope.html',
            image: 'https://placehold.co/400x300/4f46e5/ffffff?text=Slope',
            description: 'Guide a ball down a steep slope, avoid obstacles, and set a high score.',
            section: 'recommended',
            tags: ['3d', 'skill', 'endless'],
            controls: 'Arrow Keys: Steer',
            created: '2024-10-25T10:00:00.000Z'
        },
        'g_penalty_kicks': {
            title: 'Penalty Kicks (Flash)',
            url: 'https://cdn.jsdelivr.net/gh/bubbls/UGS-file-encryption@ae2e3923116cf101ff4d6ddbeec12df3dc78f133/penalty-kicks.swf',
            image: 'https://placehold.co/400x300/1e40af/ffffff?text=Penalty+Kicks',
            description: 'Test your nerve and accuracy in this classic soccer penalty shootout game.',
            section: 'sports',
            tags: ['sports', 'soccer', 'flash'],
            controls: 'Mouse: Aim • Click: Shoot',
            created: '2024-11-18T10:00:00.000Z'
        },
    },
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
const Utils = {
    // Safe localStorage get
    getStorageData(key, defaultValue) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : defaultValue;
        } catch (e) {
            console.error(`Storage get error for ${key}:`, e);
            return defaultValue;
        }
    },
    
    // Safe localStorage set
    setStorageData(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error(`Storage set error for ${key}:`, e);
        }
    },
    
    // Safe DOM creation
    createElement(tag, props = {}, children = []) {
        const el = document.createElement(tag);
        Object.entries(props).forEach(([key, value]) => {
            if (key === 'className') el.className = value;
            else if (key === 'textContent') el.textContent = value;
            else if (key === 'innerHTML') el.innerHTML = value;
            else el.setAttribute(key, value);
        });
        children.forEach(child => el.appendChild(child));
        return el;
    },
    
    // URL validation
    isValidUrl(string) {
        try {
            const url = new URL(string);
            return ['http:', 'https:'].includes(url.protocol);
        } catch {
            return false;
        }
    },
    
    // Debounce utility
    debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    },
    
    // Format numbers
    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    },
    
    // Rate limiting
    checkRateLimit(action, limit = CONFIG.RATE_LIMIT_ACTIONS) {
        const key = `ratelimit_${State.data.user.nickname}_${action}`;
        const count = parseInt(localStorage.getItem(key) || '0');
        if (count >= limit) {
            customAlert('Slow down! Too many actions.', "Rate Limited", "error");
            return false;
        }
        localStorage.setItem(key, (count + 1).toString());
        setTimeout(() => {
            const current = parseInt(localStorage.getItem(key) || '0');
            localStorage.setItem(key, Math.max(0, current - 1));
        }, 3600000); // Reset after 1 hour
        return true;
    },
};

// ==========================================
// STATE MANAGER
// ==========================================
const State = {
    data: {
        games: {},
        settings: {},
        stats: { 
            counts: {}, 
            recent: [],
            ratings: { like: {}, dislike: {} },
            reports: {},
            requests: [],
        },
        user: { nickname: 'Player', avatar: '🎮' },
        favorites: [],
        notes: {},
        ratings: {},
        recent: [],
    },
    
    load() {
        this.data.games = Utils.getStorageData('hubGames', CONFIG.DEFAULT_GAMES);
        this.data.settings = Utils.getStorageData('hubSettings', {
            theme: 'light', 
            accent: 'Blue', 
            cloakTitle: 'Google Docs', 
            cloakFavicon: '📄',
            panicKey: 'q',
        });
        this.data.stats = Utils.getStorageData('hubStats', this.data.stats);
        this.data.user = Utils.getStorageData('hubUser', this.data.user);
        this.data.favorites = Utils.getStorageData('myFavorites', []);
        this.data.notes = Utils.getStorageData('myGameNotes', {});
        this.data.ratings = Utils.getStorageData('myGameRatings', {});
        this.data.recent = Utils.getStorageData('localRecent', []);
        
        // Ensure stats structure
        this.data.stats.counts = this.data.stats.counts || {};
        this.data.stats.recent = this.data.stats.recent || [];
        this.data.stats.ratings = this.data.stats.ratings || { like: {}, dislike: {} };
        this.data.stats.reports = this.data.stats.reports || {};
        this.data.stats.requests = this.data.stats.requests || [];
    },
    
    save() {
        Utils.setStorageData('hubGames', this.data.games);
        Utils.setStorageData('hubSettings', this.data.settings);
        Utils.setStorageData('hubStats', this.data.stats);
        Utils.setStorageData('hubUser', this.data.user);
        Utils.setStorageData('myFavorites', this.data.favorites);
        Utils.setStorageData('myGameNotes', this.data.notes);
        Utils.setStorageData('myGameRatings', this.data.ratings);
        Utils.setStorageData('localRecent', this.data.recent);
    },
};

// ==========================================
// RENDERER
// ==========================================
const Renderer = {
    gameCard(gameId) {
        const game = State.data.games[gameId];
        if (!game) return document.createElement('div');
        
        const isFav = State.data.favorites.includes(gameId);
        const dateAdded = new Date(game.created);
        const isNew = (new Date() - dateAdded) / (1000 * 60 * 60 * 24) < CONFIG.NEW_GAME_DAYS;
        
        const userRating = State.data.ratings[gameId];
        const likeCount = Object.keys(State.data.stats.ratings.like || {}).filter(id => id === gameId).length;
        const dislikeCount = Object.keys(State.data.stats.ratings.dislike || {}).filter(id => id === gameId).length;
        
        const card = Utils.createElement('div', {
            className: 'game-card group relative bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden cursor-pointer border border-gray-100 dark:border-gray-700',
            'data-game-id': gameId,
        });
        
        // Image container
        const imgContainer = Utils.createElement('div', { className: 'relative w-full h-48 overflow-hidden' });
        const img = Utils.createElement('img', {
            src: game.image,
            alt: game.title,
            className: 'w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-80',
            loading: 'lazy',
        });
        img.onerror = () => img.src = 'https://placehold.co/400x300/4f46e5/ffffff?text=Image+Missing';
        imgContainer.appendChild(img);
        
        if (isNew) {
            const newBadge = Utils.createElement('span', {
                className: 'absolute top-2 left-2 bg-yellow-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-md z-10',
                textContent: 'NEW',
            });
            imgContainer.appendChild(newBadge);
        }
        
        // Favorite button
        const favBtn = Utils.createElement('button', {
            className: 'absolute top-2 right-2 p-1.5 rounded-full bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm shadow-md hover:bg-white dark:hover:bg-gray-900 transition-colors z-20',
            title: isFav ? 'Remove from Favorites' : 'Add to Favorites',
        });
        const favIcon = Utils.createElement('i', {
            'data-lucide': 'heart',
            className: `w-5 h-5 ${isFav ? 'fill-red-500 text-red-500' : 'text-gray-500 dark:text-gray-300'}`,
        });
        favBtn.appendChild(favIcon);
        favBtn.onclick = (e) => {
            e.stopPropagation();
            Actions.toggleFavorite(gameId);
        };
        imgContainer.appendChild(favBtn);
        
        // Content
        const content = Utils.createElement('div', { className: 'p-4' });
        const title = Utils.createElement('h3', {
            className: 'text-lg font-semibold text-gray-900 dark:text-white truncate',
            textContent: game.title,
        });
        title.title = game.title;
        
        const desc = Utils.createElement('p', {
            className: 'text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2',
            textContent: game.description,
        });
        
        // Stats row
        const statsRow = Utils.createElement('div', {
            className: 'flex justify-between items-center mt-3 pt-3 border-t border-gray-100 dark:border-gray-700',
        });
        
        const playCount = Utils.createElement('div', {
            className: 'flex items-center text-sm text-gray-500 dark:text-gray-400',
        });
        playCount.innerHTML = `<i data-lucide="play" class="w-4 h-4 mr-1"></i><span>${State.data.stats.counts[gameId] || 0}</span>`;
        
        const ratingBtns = Utils.createElement('div', {
            className: 'flex items-center space-x-3',
        });
        
        const likeBtn = this._ratingButton('like', likeCount, userRating === 'like', gameId);
        const dislikeBtn = this._ratingButton('dislike', dislikeCount, userRating === 'dislike', gameId);
        
        ratingBtns.appendChild(likeBtn);
        ratingBtns.appendChild(dislikeBtn);
        
        statsRow.appendChild(playCount);
        statsRow.appendChild(ratingBtns);
        
        content.appendChild(title);
        content.appendChild(desc);
        content.appendChild(statsRow);
        
        card.appendChild(imgContainer);
        card.appendChild(content);
        
        // Click handler
        card.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                Actions.openGameModal(gameId);
            }
        });
        
        return card;
    },
    
    _ratingButton(type, count, isActive, gameId) {
        const btn = Utils.createElement('button', {
            className: `flex items-center text-sm ${isActive ? (type === 'like' ? 'text-accent fill-accent' : 'text-red-500 fill-red-500') : 'text-gray-400 dark:text-gray-500 hover:text-accent'}`,
        });
        btn.innerHTML = `<i data-lucide="thumbs-${type}" class="w-4 h-4 mr-0.5"></i><span class="text-gray-600 dark:text-gray-300">${count}</span>`;
        btn.onclick = (e) => {
            e.stopPropagation();
            Actions.toggleGameRating(gameId, type);
        };
        return btn;
    },
    
    tagFilters() {
        const container = $('tagFilters');
        if (!container) return;
        
        const allTags = new Set();
        Object.values(State.data.games).forEach(game => {
            (game.tags || []).forEach(tag => allTags.add(tag));
        });
        
        window.currentTags = Array.from(allTags).sort().map(tag => ({
            name: tag,
            active: window.currentTags?.find(t => t.name === tag)?.active || false
        }));
        
        container.innerHTML = '';
        
        // All button
        const isAllActive = !window.currentTags.some(t => t.active);
        const allBtn = Utils.createElement('button', {
            className: `tag-button ${isAllActive ? 'bg-accent text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`,
            textContent: 'All',
        });
        allBtn.onclick = () => {
            window.currentTags.forEach(t => t.active = false);
            this.renderAll();
        };
        container.appendChild(allBtn);
        
        // Tag buttons
        window.currentTags.forEach(tag => {
            const btn = Utils.createElement('button', {
                className: `tag-button ${tag.active ? 'bg-accent text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`,
                textContent: tag.name,
            });
            btn.onclick = () => {
                tag.active = !tag.active;
                this.renderAll();
            };
            container.appendChild(btn);
        });
    },
    
    pageContent() {
        const container = $('gameContent');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Recently Played Section
        if (CONFIG.FEATURES.RECENTLY_PLAYED && State.data.recent.length > 0) {
            const recentSection = Utils.createElement('section', { className: 'game-section mb-12' });
            const title = Utils.createElement('h2', {
                className: 'text-2xl font-bold mb-4 border-b border-gray-200 dark:border-gray-700 pb-2',
                textContent: 'Continue Playing',
            });
            const grid = Utils.createElement('div', { className: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' });
            
            State.data.recent.slice(0, CONFIG.LOCAL_RECENT_LIMIT).forEach(id => {
                if (State.data.games[id]) {
                    grid.appendChild(this.gameCard(id));
                }
            });
            
            recentSection.appendChild(title);
            recentSection.appendChild(grid);
            container.appendChild(recentSection);
        }
        
        // Process and render games
        const gamesArray = Object.keys(State.data.games).map(id => ({ ...State.data.games[id], id }));
        const processed = this._processGames(gamesArray);
        
        const sections = processed.reduce((acc, game) => {
            const sectionName = game.section || 'other';
            acc[sectionName] = acc[sectionName] || [];
            acc[sectionName].push(game);
            return acc;
        }, {});
        
        const sectionOrder = ['featured', 'recommended', 'sports', 'puzzle', 'action', 'other'];
        
        sectionOrder.forEach(sectionKey => {
            const sectionGames = sections[sectionKey];
            if (sectionGames && sectionGames.length > 0) {
                const sectionEl = Utils.createElement('section', {
                    className: 'game-section mb-12',
                    id: `section-${sectionKey}`,
                });
                const title = Utils.createElement('h2', {
                    className: 'text-2xl font-bold mb-4 border-b border-gray-200 dark:border-gray-700 pb-2',
                    textContent: sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1),
                });
                const grid = Utils.createElement('div', { className: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' });
                
                sectionGames.forEach(game => grid.appendChild(this.gameCard(game.id)));
                
                sectionEl.appendChild(title);
                sectionEl.appendChild(grid);
                container.appendChild(sectionEl);
            }
        });
        
        // No results
        if (processed.length === 0 && window.currentSearchQuery) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <i data-lucide="frown" class="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600"></i>
                    <h3 class="text-xl font-semibold text-gray-700 dark:text-gray-300">No Games Found</h3>
                    <p class="mt-2 text-gray-500 dark:text-gray-500">Try a different search query or clear your filters.</p>
                </div>
            `;
        }
        
        // Update quick stats
        $('totalGames').textContent = `${Object.keys(State.data.games).length} Games`;
        $('totalPlays').textContent = `${Utils.formatNumber(Object.values(State.data.stats.counts).reduce((a,b) => a+b, 0))} Plays`;
        $('favoriteCount').textContent = `${State.data.favorites.length} Favorites`;
        
        lucide.createIcons();
    },
    
    _processGames(games) {
        let processed = [...games];
        
        // Filter by active tags
        const activeTags = window.currentTags.filter(t => t.active).map(t => t.name);
        if (activeTags.length > 0) {
            processed = processed.filter(game => 
                activeTags.every(tag => (game.tags || []).includes(tag))
            );
        }
        
        // Search filter
        if (window.currentSearchQuery) {
            const query = window.currentSearchQuery.toLowerCase();
            processed = processed.filter(game => 
                game.title.toLowerCase().includes(query) || 
                (game.description || '').toLowerCase().includes(query) ||
                (game.tags || []).some(tag => tag.toLowerCase().includes(query))
            );
        }
        
        // Sort
        const sort = window.currentGameSort || 'name';
        switch (sort) {
            case 'newest':
                processed.sort((a, b) => new Date(b.created || 0) - new Date(a.created || 0));
                break;
            case 'mostPlayed':
                processed.sort((a, b) => (State.data.stats.counts[b.id] || 0) - (State.data.stats.counts[a.id] || 0));
                break;
            case 'random':
                processed.sort(() => Math.random() - 0.5);
                break;
            default:
                processed.sort((a, b) => a.title.localeCompare(b.title));
        }
        
        return processed;
    },
    
    renderAll() {
        this.tagFilters();
        this.pageContent();
        lucide.createIcons();
    },
};

// ==========================================
// ACTIONS
// ==========================================
const Actions = {
    openGameModal(gameId) {
        if (!Utils.checkRateLimit('playGame')) return;
        
        const game = State.data.games[gameId];
        if (!game) return;
        
        window.currentModalGameId = gameId;
        
        const modal = $('gameModal');
        const iframe = $('modalGameIframe');
        
        // Populate content
        $('modalTitle').textContent = game.title;
        $('modalDescription').textContent = game.description;
        
        // Controls
        $('modalControls').textContent = game.controls || 'No controls listed';
        
        // Tags
        const tagsEl = $('modalTags');
        tagsEl.innerHTML = '';
        (game.tags || []).forEach(tag => {
            tagsEl.appendChild(Utils.createElement('span', {
                className: 'text-xs font-medium px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
                textContent: tag,
            }));
        });
        
        // Load game with spinner
        iframe.style.background = 'url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxOCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjM2I4MmY2IiBzdHJva2Utd2lkdGg9IjMiLz48L3N2Zz4=) center no-repeat';
        
        if (game.url.endsWith('.swf')) {
            const ruffleWrapper = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body, html { margin: 0; padding: 0; width: 100%; height: 100%; background-color: #1f2937; overflow: hidden; }
                        #ruffle-container { width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; }
                        .error { color: white; font-family: Arial; padding: 20px; text-align: center; }
                    </style>
                    <script src="https://unpkg.com/@ruffle-rs/ruffle@latest"><\/script>
                </head>
                <body>
                    <div id="ruffle-container"><div class="error">Loading Flash game...</div></div>
                    <script>
                        window.RufflePlayer = window.RufflePlayer || {};
                        window.addEventListener("load", () => {
                            try {
                                const ruffle = window.RufflePlayer.newest();
                                const player = ruffle.createPlayer();
                                player.style.width = '100%';
                                player.style.height = '100%';
                                player.load("${game.url}");
                                document.getElementById('ruffle-container').innerHTML = '';
                                document.getElementById('ruffle-container').appendChild(player);
                            } catch (e) {
                                document.getElementById('ruffle-container').innerHTML = 
                                    '<div class="error">Failed to load Flash content. Game may be incompatible.<br><button onclick="window.parent.Actions.reportGame(\''${gameId}\', \'flash-error\')" class="mt-3 px-3 py-1 bg-red-500 rounded">Report</button></div>';
                            }
                        });
                    <\/script>
                </body>
                </html>
            `;
            iframe.srcdoc = ruffleWrapper;
        } else {
            iframe.src = game.url;
        }
        
        iframe.onload = () => iframe.style.background = '';
        iframe.onerror = () => {
            iframe.srcdoc = `<div style="padding:40px;text-align:center;font-family:Arial;color:white;">
                <h2>Game Failed to Load</h2>
                <button onclick="window.parent.Actions.reportGame('${gameId}', 'broken')" 
                        style="margin-top:20px;padding:10px 20px;background:#ef4444;color:white;border:none;border-radius:5px;cursor:pointer;">
                    Report Broken Game
                </button>
            </div>`;
        };
        
        // Load note
        $('modalNoteText').value = State.data.notes[gameId] || '';
        $('modalNoteArea').classList.toggle('hidden', !State.data.notes[gameId]);
        
        // Update stats
        this.updateGameStats(gameId);
        this.updateModalStatsUI(gameId);
        
        // Show modal
        modal.classList.remove('opacity-0', 'pointer-events-none');
        modal.querySelector('.transform').classList.remove('scale-95');
        
        // Fullscreen button
        if (CONFIG.FEATURES.FULLSCREEN_BUTTON) {
            const fullscreenBtn = Utils.createElement('button', {
                className: 'p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-accent hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                title: 'Fullscreen',
                innerHTML: '<i data-lucide="maximize" class="w-5 h-5"></i>',
            });
            fullscreenBtn.onclick = () => iframe.requestFullscreen();
            $('modalTitle').parentNode.appendChild(fullscreenBtn);
        }
    },
    
    reportGame(gameId, reason = 'broken') {
        State.data.stats.reports[gameId] = {
            reason,
            user: State.data.user.nickname,
            timestamp: Date.now(),
            url: State.data.games[gameId]?.url,
        };
        State.save();
        customAlert('Game reported. Admin will review.', "Reported", "info");
    },
    
    updateGameStats(gameId) {
        State.data.stats.counts[gameId] = (State.data.stats.counts[gameId] || 0) + 1;
        
        State.data.recent = State.data.recent.filter(id => id !== gameId);
        State.data.recent.unshift(gameId);
        State.data.recent = State.data.recent.slice(0, CONFIG.LOCAL_RECENT_LIMIT);
        
        State.data.stats.recent = State.data.stats.recent.filter(id => id !== gameId);
        State.data.stats.recent.unshift(gameId);
        State.data.stats.recent = State.data.stats.recent.slice(0, CONFIG.GLOBAL_RECENT_LIMIT);
        
        State.save();
        this.updateModalStatsUI(gameId);
    },
    
    toggleFavorite(gameId) {
        const game = State.data.games[gameId];
        if (!game) return;
        
        const index = State.data.favorites.indexOf(gameId);
        if (index > -1) {
            State.data.favorites.splice(index, 1);
            customAlert(`Removed ${game.title} from favorites.`, "Removed", "info");
        } else {
            State.data.favorites.push(gameId);
            customAlert(`Added ${game.title} to favorites!`, "Favorited", "success");
        }
        State.save();
        Renderer.renderAll();
        if (window.currentModalGameId === gameId) this.updateModalStatsUI(gameId);
    },
    
    toggleGameRating(gameId, type) {
        if (!Utils.checkRateLimit('rateGame')) return;
        
        const game = State.data.games[gameId];
        if (!game) return;
        
        const currentRating = State.data.ratings[gameId];
        const newRating = currentRating === type ? null : type;
        
        if (currentRating) {
            delete State.data.stats.ratings[currentRating][gameId];
        }
        
        if (newRating) {
            State.data.ratings[gameId] = newRating;
            State.data.stats.ratings[newRating][gameId] = true;
            customAlert(`Rated ${game.title} as ${newRating}!`, "Rated", "success");
        } else {
            delete State.data.ratings[gameId];
            customAlert('Rating removed.', "Removed", "info");
        }
        
        State.save();
        Renderer.renderAll();
        if (window.currentModalGameId === gameId) this.updateModalStatsUI(gameId);
    },
    
    updateModalStatsUI(gameId) {
        const el = {
            statsCount: $('modalStatsCount'),
            favBtn: $('modalFavoriteBtn'),
            likeBtn: $('modalLikeBtn'),
            dislikeBtn: $('modalDislikeBtn'),
            noteBtn: $('modalNoteBtn'),
            noteArea: $('modalNoteArea'),
        };
        
        if (Object.values(el).some(e => !e)) return;
        
        const game = State.data.games[gameId];
        const isFav = State.data.favorites.includes(gameId);
        const userRating = State.data.ratings[gameId];
        const likeCount = Object.keys(State.data.stats.ratings.like || {}).filter(id => id === gameId).length;
        const dislikeCount = Object.keys(State.data.stats.ratings.dislike || {}).filter(id => id === gameId).length;
        const hasNote = !!State.data.notes[gameId];
        
        el.statsCount.innerHTML = `<i data-lucide="play" class="w-4 h-4 mr-1"></i><span>${Utils.formatNumber(State.data.stats.counts[gameId] || 0)}</span>`;
        el.favBtn.innerHTML = `<i data-lucide="heart" class="w-5 h-5 ${isFav ? 'fill-red-500 text-red-500' : 'text-gray-500 dark:text-gray-400'}"></i>`;
        el.favBtn.title = isFav ? 'Remove from Favorites' : 'Add to Favorites';
        el.likeBtn.innerHTML = `<i data-lucide="thumbs-up" class="w-5 h-5 ${userRating === 'like' ? 'fill-accent text-accent' : 'text-gray-500 dark:text-gray-400'}"></i><span class="ml-1 text-sm">${likeCount}</span>`;
        el.likeBtn.title = userRating === 'like' ? 'Remove Like' : 'Like Game';
        el.dislikeBtn.innerHTML = `<i data-lucide="thumbs-down" class="w-5 h-5 ${userRating === 'dislike' ? 'fill-red-500 text-red-500' : 'text-gray-500 dark:text-gray-400'}"></i><span class="ml-1 text-sm">${dislikeCount}</span>`;
        el.dislikeBtn.title = userRating === 'dislike' ? 'Remove Dislike' : 'Dislike Game';
        el.noteBtn.innerHTML = `<i data-lucide="sticky-note" class="w-5 h-5 ${hasNote ? 'fill-yellow-400 text-yellow-500' : 'text-gray-500 dark:text-gray-400'}"></i>`;
        el.noteBtn.title = hasNote ? 'Edit Note (Saved)' : 'Add Note';
        
        lucide.createIcons();
    },
    
    saveNote(gameId) {
        const note = $('modalNoteText').value.trim();
        if (note) {
            State.data.notes[gameId] = note;
            customAlert('Note saved!', "Saved", "success");
        } else {
            delete State.data.notes[gameId];
            customAlert('Note cleared.', "Cleared", "info");
        }
        State.save();
        this.updateModalStatsUI(gameId);
    },
    
    playRandomGame() {
        const ids = Object.keys(State.data.games);
        if (ids.length === 0) return;
        const randomId = ids[Math.floor(Math.random() * ids.length)];
        this.openGameModal(randomId);
    },
    
    exportData() {
        const data = {
            games: State.data.games,
            settings: State.data.settings,
            stats: State.data.stats,
            user: State.data.user,
            favorites: State.data.favorites,
            notes: State.data.notes,
            ratings: State.data.ratings,
            exportDate: new Date().toISOString(),
            version: CONFIG.VERSION,
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = Utils.createElement('a', {
            href: url,
            download: `GameHub_Export_${new Date().toISOString().slice(0, 10)}.json`,
        });
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        customAlert('Data exported successfully!', "Export Complete", "success");
    },
    
    importData(file) {
        if (!confirm('⚠️ This will OVERWRITE all existing data. Continue?')) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                if (!confirm(`Import ${Object.keys(imported.games || {}).length} games?`)) return;
                
                State.data = { ...State.data, ...imported };
                State.save();
                initialize();
                customAlert('Data imported! Hub reloaded.', "Import Complete", "success");
            } catch (error) {
                console.error("Import error:", error);
                customAlert(`Import failed: ${error.message}`, "Error", "error");
            }
        };
        reader.readAsText(file);
        $('importFileInput').value = '';
    },
    
    saveGame(formData) {
        if (!Utils.checkRateLimit('saveGame', 5)) return;
        
        const id = formData.get('id');
        const title = formData.get('title').trim();
        const url = formData.get('url').trim();
        const image = formData.get('image').trim();
        const description = formData.get('description').trim();
        const tags = formData.get('tags').split(',').map(t => t.trim().toLowerCase()).filter(t => t);
        const section = formData.get('section') || 'other';
        const controls = formData.get('controls')?.trim();
        
        if (!title || !url) {
            customAlert('Title and URL are required.', "Validation Error", "error");
            return;
        }
        if (!Utils.isValidUrl(url)) {
            customAlert('Invalid game URL.', "Validation Error", "error");
            return;
        }
        if (image && !Utils.isValidUrl(image)) {
            customAlert('Invalid image URL.', "Validation Error", "error");
            return;
        }
        
        const gameData = {
            title,
            url,
            image: image || `https://placehold.co/400x300/4f46e5/ffffff?text=${encodeURIComponent(title)}`,
            description: description || 'No description provided.',
            tags,
            section,
            controls,
            created: id ? State.data.games[id]?.created : new Date().toISOString(),
        };
        
        const gameId = id || `g_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        State.data.games[gameId] = { ...State.data.games[gameId], ...gameData };
        State.save();
        
        customAlert(`Game "${title}" ${id ? 'updated' : 'added'}!`, "Success", "success");
        $('addGameForm').reset();
        $('gameIdInput').value = '';
        initialize();
    },
};

// ==========================================
// EVENT LISTENERS & INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    try {
        State.load();
        
        // Game of the Day
        if (CONFIG.FEATURES.GAME_OF_DAY) {
            const today = new Date().toDateString();
            const lastFeatured = Utils.getStorageData('lastFeatured', '');
            if (lastFeatured !== today) {
                const ids = Object.keys(State.data.games);
                if (ids.length > 0) {
                    const randomId = ids[Math.floor(Math.random() * ids.length)];
                    Utils.setStorageData('gameOfTheDay', randomId);
                    Utils.setStorageData('lastFeatured', today);
                    setTimeout(() => {
                        customAlert(`🎮 Game of the Day: ${State.data.games[randomId].title}!`, "Featured", "info");
                    }, 2000);
                }
            }
        }
        
        // DOM elements cache
        const DOM = {
            search: $('searchInput'),
            sort: $('sortSelect'),
            panic: $('panicBtn'),
            container: $('appContainer'),
            modal: $('gameModal'),
            iframe: $('modalGameIframe'),
        };
        
        // Debounced search
        DOM.search.oninput = Utils.debounce((e) => {
            window.currentSearchQuery = e.target.value;
            Renderer.renderAll();
        }, CONFIG.SEARCH_DEBOUNCE_MS);
        
        DOM.sort.onchange = (e) => {
            window.currentGameSort = e.target.value;
            Renderer.renderAll();
        };
        
        // Panic button
        DOM.panic.onclick = () => Actions.toggleCloak();
        document.addEventListener('keydown', (e) => {
            if (e.key === State.data.settings.panicKey && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
                e.preventDefault();
                Actions.toggleCloak();
            }
        });
        
        // Modal listeners
        $('closeModalBtn').onclick = () => closeGameModal();
        $('modalNoteBtn').onclick = () => $('modalNoteArea').classList.toggle('hidden');
        $('modalNoteSaveBtn').onclick = () => Actions.saveNote(window.currentModalGameId);
        $('modalLikeBtn').onclick = () => Actions.toggleGameRating(window.currentModalGameId, 'like');
        $('modalDislikeBtn').onclick = () => Actions.toggleGameRating(window.currentModalGameId, 'dislike');
        $('modalFavoriteBtn').onclick = () => Actions.toggleFavorite(window.currentModalGameId);
        
        // Random game button
        if (CONFIG.FEATURES.RANDOM_GAME) {
            const randomBtn = Utils.createElement('button', {
                className: 'p-2 absolute right-2 top-1/2 transform -translate-y-1/2',
                title: 'Random Game',
                innerHTML: '<i data-lucide="dice" class="w-5 h-5 text-gray-400"></i>',
            });
            randomBtn.onclick = () => Actions.playRandomGame();
            DOM.search.parentNode.appendChild(randomBtn);
        }
        
        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (window.currentModalGameId) closeGameModal();
                if (!$('profileModal').classList.contains('pointer-events-none')) $('profileModal').classList.add('opacity-0', 'pointer-events-none');
                if (!$('settingsModal').classList.contains('pointer-events-none')) $('settingsModal').classList.add('opacity-0', 'pointer-events-none');
            }
        });
        
        // Profile modal
        $('profileBtn').onclick = () => {
            $('userNicknameInput').value = State.data.user.nickname;
            const avatarGrid = $('userAvatarGrid');
            avatarGrid.innerHTML = '';
            CONFIG.AVATARS.forEach(avatar => {
                const btn = Utils.createElement('button', {
                    className: `avatar-btn ${State.data.user.avatar === avatar ? 'active' : ''}`,
                    textContent: avatar,
                });
                btn.onclick = () => {
                    avatarGrid.querySelectorAll('.avatar-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                };
                avatarGrid.appendChild(btn);
            });
            $('panicKeySelect').value = State.data.settings.panicKey;
            $('profileModal').classList.remove('opacity-0', 'pointer-events-none');
        };
        
        $('userProfileSaveBtn').onclick = () => {
            const newNickname = $('userNicknameInput').value.trim();
            const activeAvatar = $('userAvatarGrid').querySelector('.avatar-btn.active')?.textContent;
            const newPanicKey = $('panicKeySelect').value;
            
            if (newNickname) {
                State.data.user.nickname = newNickname;
                State.data.user.avatar = activeAvatar || State.data.user.avatar;
                State.data.settings.panicKey = newPanicKey;
                State.save();
                customAlert('Profile saved!', "Success", "success");
                renderNavigation();
                $('profileModal').classList.add('opacity-0', 'pointer-events-none');
            }
        };
        
        $('userProfileCancelBtn').onclick = () => {
            $('profileModal').classList.add('opacity-0', 'pointer-events-none');
        };
        
        // Settings modal
        $('settingsBtn').onclick = () => {
            // Setup general tab
            $(State.data.settings.theme === 'dark' ? 'themeDark' : 'themeLight').checked = true;
            $('cloakTitleInput').value = State.data.settings.cloakTitle;
            $('cloakFaviconInput').value = State.data.settings.cloakFavicon;
            
            // Accent colors
            const colorGrid = $('accentColorGrid');
            colorGrid.innerHTML = '';
            Object.entries(CONFIG.ACCENT_COLORS).forEach(([name, color]) => {
                const btn = Utils.createElement('button', {
                    className: `w-10 h-10 rounded-full border-4 ${State.data.settings.accent === name ? 'border-gray-900 dark:border-white' : 'border-transparent'}`,
                    style: `background-color: ${color.hex}`,
                    title: name,
                });
                btn.onclick = () => updateAccentColor(name);
                colorGrid.appendChild(btn);
            });
            
            // Check admin status
            if (sessionStorage.getItem('isAdmin') === 'true') {
                $('adminLoginArea').classList.add('hidden');
                $('adminToolsArea').classList.remove('hidden');
                renderAdminTools();
            } else {
                $('adminLoginArea').classList.remove('hidden');
                $('adminToolsArea').classList.add('hidden');
            }
            
            $('settingsModal').classList.remove('opacity-0', 'pointer-events-none');
        };
        
        $('settingsCloseBtn').onclick = () => {
            $('settingsModal').classList.add('opacity-0', 'pointer-events-none');
        };
        
        // Tab switching
        $('tabGeneral').onclick = () => switchTab('General');
        $('tabAdmin').onclick = () => switchTab('Admin');
        $('tabAnalytics').onclick = () => {
            switchTab('Analytics');
            if (CONFIG.FEATURES.ANALYTICS) renderAnalytics();
        };
        
        function switchTab(tab) {
            const tabs = {
                General: { button: $('tabGeneral'), content: $('contentGeneral') },
                Admin: { button: $('tabAdmin'), content: $('contentAdmin') },
                Analytics: { button: $('tabAnalytics'), content: $('contentAnalytics') },
            };
            
            Object.entries(tabs).forEach(([name, { button, content }]) => {
                if (name === tab) {
                    button.classList.add('text-accent', 'border-accent');
                    button.classList.remove('text-gray-500', 'dark:text-gray-400');
                    content.classList.remove('hidden');
                } else {
                    button.classList.add('text-gray-500', 'dark:text-gray-400');
                    button.classList.remove('text-accent', 'border-accent');
                    content.classList.add('hidden');
                }
            });
        }
        
        // Admin login
        $('adminLoginBtn').onclick = () => {
            const input = $('adminPassInput').value;
            if (btoa(input) === CONFIG.ADMIN_PASS_HASH) {
                sessionStorage.setItem('isAdmin', 'true');
                $('adminLoginArea').classList.add('hidden');
                $('adminToolsArea').classList.remove('hidden');
                renderAdminTools();
                customAlert('Admin access granted!', "Welcome", "success");
            } else {
                customAlert('Incorrect password.', "Access Denied", "error");
            }
            $('adminPassInput').value = '';
        };
        
        // Add game form
        $('addGameForm').onsubmit = (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            Actions.saveGame(formData);
        };
        
        $('clearFormBtn').onclick = () => {
            $('addGameForm').reset();
            $('gameIdInput').value = '';
        };
        
        // Data management
        $('exportDataBtn').onclick = () => Actions.exportData();
        $('importDataBtn').onclick = () => $('importFileInput').click();
        $('importFileInput').onchange = (e) => {
            if (e.target.files.length > 0) {
                Actions.importData(e.target.files[0]);
            }
        };
        
        $('backupBtn').onclick = () => {
            Utils.setStorageData('backup_' + Date.now(), State.data);
            customAlert('Backup created!', "Backup", "success");
        };
        
        // Theme change
        $('themeLight').onchange = () => updateTheme('light');
        $('themeDark').onchange = () => updateTheme('dark');
        
        // Cloak settings
        $('cloakTitleInput').oninput = (e) => {
            State.data.settings.cloakTitle = e.target.value || 'Google Docs';
            State.save();
        };
        $('cloakFaviconInput').oninput = (e) => {
            State.data.settings.cloakFavicon = e.target.value.slice(0, 1) || '📄';
            State.save();
        };
        
        // Initialize UI
        window.currentTags = [];
        window.currentSearchQuery = '';
        window.currentGameSort = 'name';
        window.currentModalGameId = null;
        window.isCloaked = false;
        
        initialize();
        
        // Hide loading
        setTimeout(() => {
            $('loadingModal').classList.add('opacity-0');
            setTimeout(() => $('loadingModal').classList.add('hidden'), 300);
        }, 500);
        
        console.log(`${CONFIG.APP_NAME} v${CONFIG.VERSION} initialized successfully.`);
        
    } catch (err) {
        console.error("Fatal error:", err);
        $('loadingModal').innerHTML = `
            <div class="p-6 bg-red-800 border-4 border-red-500 rounded-lg text-white max-w-md">
                <h2 class="text-2xl font-bold mb-2">💥 Critical Error</h2>
                <p class="mb-4">${err.message}</p>
                <button onclick="location.reload()" class="px-4 py-2 bg-red-600 rounded hover:bg-red-700">Reload</button>
            </div>`;
    }
});

// ==========================================
// GLOBAL FUNCTIONS
// ==========================================
function $(id) {
    return document.getElementById(id);
}

function initialize() {
    // Apply theme
    updateTheme(State.data.settings.theme, false);
    updateAccentColor(State.data.settings.accent, false);
    
    // Update title
    document.title = CONFIG.APP_NAME;
    $('appTitle').textContent = CONFIG.APP_NAME;
    
    // Setup tags from games
    const allTags = new Set();
    Object.values(State.data.games).forEach(game => {
        (game.tags || []).forEach(tag => allTags.add(tag));
    });
    window.currentTags = Array.from(allTags).sort().map(tag => ({ name: tag, active: false }));
    
    // Render everything
    Renderer.renderAll();
    renderNavigation();
    
    // PWA registration
    if (CONFIG.FEATURES.PWA_SUPPORT && 'serviceWorker' in navigator && window.location.protocol === 'https:') {
        navigator.serviceWorker.register('sw.js').catch(err => console.log('PWA unavailable:', err));
    }
}

function renderNavigation() {
    const profileBtn = $('profileBtn');
    if (profileBtn) {
        profileBtn.innerHTML = `<span class="text-xl">${State.data.user.avatar}</span>`;
        profileBtn.title = `${State.data.user.nickname}'s Profile`;
    }
}

function updateTheme(theme, save = true) {
    State.data.settings.theme = theme;
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    if (save) State.save();
}

function updateAccentColor(colorName, save = true) {
    const color = CONFIG.ACCENT_COLORS[colorName];
    if (!color) return;
    
    document.documentElement.style.setProperty('--accent-color', color.hex);
    document.documentElement.style.setProperty('--accent-color-rgb', color.rgb);
    
    if (save) {
        State.data.settings.accent = colorName;
        State.save();
    }
}

function toggleCloak() {
    window.isCloaked = !window.isCloaked;
    const favicon = $('favicon');
    
    if (window.isCloaked) {
        document.title = State.data.settings.cloakTitle;
        favicon.href = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${State.data.settings.cloakFavicon}</text></svg>`;
        document.body.classList.add('cloaked-mode');
        customAlert('Cloaked mode activated!', "Shhh!", "info");
    } else {
        document.title = CONFIG.APP_NAME;
        favicon.href = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🎮</text></svg>`;
        document.body.classList.remove('cloaked-mode');
        customAlert('Cloaked mode deactivated.', "Welcome Back", "info");
    }
}

function closeGameModal() {
    const modal = $('gameModal');
    const iframe = $('modalGameIframe');
    
    iframe.src = 'about:blank';
    window.currentModalGameId = null;
    
    modal.classList.add('opacity-0', 'pointer-events-none');
    modal.querySelector('.transform').classList.add('scale-95');
    
    Renderer.renderAll();
}

function customAlert(message, title, type = 'success') {
    const modal = $('customAlertModal');
    if (!modal) return;
    
    const types = {
        success: { color: 'border-accent', icon: 'check-circle' },
        error: { color: 'border-red-500', icon: 'x-circle' },
        info: { color: 'border-blue-500', icon: 'info' },
    };
    
    $('alertIcon').setAttribute('data-lucide', types[type].icon);
    $('alertTitle').textContent = title;
    $('alertMessage').textContent = message;
    
    const alertBox = modal.querySelector('div[role="alert"]');
    alertBox.className = alertBox.className.replace(/border-\w+-\d{3}/g, '');
    alertBox.classList.add(types[type].color);
    
    modal.classList.remove('opacity-0', 'translate-y-4', 'pointer-events-none');
    lucide.createIcons();
    
    setTimeout(() => {
        modal.classList.add('opacity-0', 'translate-y-4', 'pointer-events-none');
    }, 3000);
}

function renderAdminTools() {
    // Tag manager
    const tagManager = $('tagManager');
    if (tagManager) {
        const tagCounts = {};
        Object.values(State.data.games).forEach(game => {
            (game.tags || []).forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        });
        
        tagManager.innerHTML = Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([tag, count]) => `
                <div class="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-700 rounded">
                    <span>${tag} <span class="text-sm text-gray-500">(${count} games)</span></span>
                    <button onclick="Actions.mergeTag('${tag}')" class="text-xs px-2 py-1 bg-yellow-500 text-white rounded">Merge</button>
                </div>
            `).join('');
    }
}

function renderAnalytics() {
    if (!CONFIG.FEATURES.ANALYTICS) return;
    
    const totalPlays = Object.values(State.data.stats.counts).reduce((a, b) => a + b, 0);
    $('analyticsTotalPlays').textContent = Utils.formatNumber(totalPlays);
    $('analyticsTotalGames').textContent = Object.keys(State.data.games).length;
    
    // Popular games
    const popular = Object.entries(State.data.stats.counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    $('popularGamesList').innerHTML = popular.map(([id, count]) => `
        <li>${State.data.games[id]?.title || 'Unknown'} - ${Utils.formatNumber(count)} plays</li>
    `).join('');
    
    // Reported games
    const reports = Object.entries(State.data.stats.reports || {});
    $('reportedGamesList').innerHTML = reports.length ? reports.map(([id, report]) => `
        <div class="p-2 bg-red-100 dark:bg-red-900/30 rounded">
            <strong>${State.data.games[id]?.title || 'Unknown'}</strong><br>
            <small>Reason: ${report.reason} • Reported by ${report.user}</small>
        </div>
    `).join('') : '<p class="text-gray-500">No reports</p>';
}

// Merge tag function for admin
Actions.mergeTag = function(oldTag) {
    const newTag = prompt(`Merge "${oldTag}" into tag:`);
    if (!newTag) return;
    
    Object.values(State.data.games).forEach(game => {
        const idx = game.tags.indexOf(oldTag);
        if (idx > -1) {
            game.tags[idx] = newTag;
        }
    });
    State.save();
    customAlert(`Merged "${oldTag}" into "${newTag}"`, "Success", "success");
    renderAdminTools();
};
