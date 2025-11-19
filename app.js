// app.js - Main application logic
import CONFIG from './config.js';
import Utils from './utils.js';

// --- STATE MANAGER ---
const State = {
    data: {
        games: {},
        settings: {},
        stats: { counts: {}, recent: [], ratings: { like: {}, dislike: {} }, reports: {}, requests: [] },
        user: { nickname: 'Player', avatar: '🎮' },
        favorites: [],
        notes: {},
        ratings: {},
        recent: [],
    },
    
    load() {
        this.data.games = Utils.getStorageData('hubGames', {});
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

// --- XSS-SAFE RENDERER ---
const Renderer = {
    // Render game card with safe DOM methods
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
            loading: 'lazy', // Performance
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
        
        // Play count
        const playCount = Utils.createElement('div', {
            className: 'flex items-center text-sm text-gray-500 dark:text-gray-400',
        });
        playCount.innerHTML = `<i data-lucide="play" class="w-4 h-4 mr-1"></i><span>${State.data.stats.counts[gameId] || 0}</span>`;
        
        // Rating buttons
        const ratingBtns = Utils.createElement('div', {
            className: 'flex items-center space-x-3',
        });
        
        const likeBtn = this.ratingButton('like', likeCount, userRating === 'like', gameId);
        const dislikeBtn = this.ratingButton('dislike', dislikeCount, userRating === 'dislike', gameId);
        
        ratingBtns.appendChild(likeBtn);
        ratingBtns.appendChild(dislikeBtn);
        
        statsRow.appendChild(playCount);
        statsRow.appendChild(ratingBtns);
        
        content.appendChild(title);
        content.appendChild(desc);
        content.appendChild(statsRow);
        
        card.appendChild(imgContainer);
        card.appendChild(content);
        
        // Click handler for opening modal
        card.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                Actions.openGameModal(gameId);
            }
        });
        
        return card;
    },
    
    ratingButton(type, count, isActive, gameId) {
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
    
    // Render tag filters with proper active state
    tagFilters() {
        const container = $('tagFilters');
        if (!container) return;
        
        const allTags = new Set();
        Object.values(State.data.games).forEach(game => {
            (game.tags || []).forEach(tag => allTags.add(tag));
        });
        
        // Update currentTags array of objects
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
    
    // Render all sections
    pageContent() {
        const container = $('gameContent');
        if (!container) return;
        
        // Add Recently Played section first if enabled
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
        
        // Process and render games by section
        const gamesArray = Object.keys(State.data.games).map(id => ({ ...State.data.games[id], id }));
        const processed = this.processGames(gamesArray);
        
        const sections = processed.reduce((acc, game) => {
            const sectionName = game.section || 'other';
            acc[sectionName] = acc[sectionName] || [];
            acc[sectionName].push(game);
            return acc;
        }, {});
        
        const sectionOrder = ['featured', 'recommended', 'sports', 'other'];
        
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
        
        lucide.createIcons();
    },
    
    // Process games with filters and sorting
    processGames(games) {
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

// --- ACTIONS ---
const Actions = {
    // Open game modal with enhanced features
    openGameModal(gameId) {
        if (!Utils.checkRateLimit('playGame')) {
            customAlert('Slow down! Too many actions.', "Rate Limited", "error");
            return;
        }
        
        const game = State.data.games[gameId];
        if (!game) return;
        
        window.currentModalGameId = gameId;
        
        const modal = $('gameModal');
        const iframe = $('modalGameIframe');
        
        // Populate content
        $('modalTitle').textContent = game.title;
        $('modalDescription').textContent = game.description;
        
        // Tags
        const tagsEl = $('modalTags');
        tagsEl.innerHTML = '';
        (game.tags || []).forEach(tag => {
            const tagSpan = Utils.createElement('span', {
                className: 'text-xs font-medium px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
                textContent: tag,
            });
            tagsEl.appendChild(tagSpan);
        });
        
        // Load game with error handling
        iframe.style.background = 'url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxOCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjM2I4MmY2IiBzdHJva2Utd2lkdGg9IjMiLz48L3N2Zz4=) center no-repeat';
        
        if (game.url.endsWith('.swf')) {
            const ruffleWrapper = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body, html { margin: 0; padding: 0; width: 100%; height: 100%; background-color: #1f2937; overflow: hidden; }
                        #ruffle-container { width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; }
                        .error { color: white; font-family: Arial; padding: 20px; }
                    </style>
                    <script src="https://unpkg.com/@ruffle-rs/ruffle@latest"><\/script>
                </head>
                <body>
                    <div id="ruffle-container">
                        <div class="error">Loading Flash game...</div>
                    </div>
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
                                    '<div class="error">Failed to load Flash content. Game may be incompatible.</div>';
                                console.error("Ruffle error:", e);
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
            iframe.srcdoc = `<div style="padding:40px;text-align:center;font-family:Arial;">
                <h2 style="color:white;">Game Failed to Load</h2>
                <button onclick="Actions.reportGame('${gameId}', 'broken')" 
                        style="margin-top:20px;padding:10px 20px;background:#ef4444;color:white;border:none;border-radius:5px;cursor:pointer;">
                    Report Broken Game
                </button>
            </div>`;
        };
        
        // Load note
        const noteTextarea = $('modalNoteText');
        noteTextarea.value = State.data.notes[gameId] || '';
        $('modalNoteArea').classList.toggle('hidden', !State.data.notes[gameId]);
        
        // Update stats
        this.updateGameStats(gameId);
        this.updateModalStatsUI(gameId);
        
        // Show modal
        modal.classList.remove('opacity-0', 'pointer-events-none');
        modal.querySelector('.transform').classList.remove('scale-95');
        
        // Request fullscreen option
        if (CONFIG.FEATURES.FULLSCREEN) {
            const fullscreenBtn = Utils.createElement('button', {
                className: 'p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-accent hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                title: 'Fullscreen',
                innerHTML: '<i data-lucide="maximize" class="w-5 h-5"></i>',
            });
            fullscreenBtn.onclick = () => iframe.requestFullscreen();
            $('modalTitle').parentNode.appendChild(fullscreenBtn);
        }
    },
    
    // Report broken game
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
    
    // Update stats with rate limiting
    updateGameStats(gameId) {
        State.data.stats.counts[gameId] = (State.data.stats.counts[gameId] || 0) + 1;
        
        // Update recent lists
        State.data.recent = State.data.recent.filter(id => id !== gameId);
        State.data.recent.unshift(gameId);
        State.data.recent = State.data.recent.slice(0, CONFIG.LOCAL_RECENT_LIMIT);
        
        State.data.stats.recent = State.data.stats.recent.filter(id => id !== gameId);
        State.data.stats.recent.unshift(gameId);
        State.data.stats.recent = State.data.stats.recent.slice(0, CONFIG.GLOBAL_RECENT_LIMIT);
        
        State.save();
        this.updateModalStatsUI(gameId);
    },
    
    // Toggle favorite with undo
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
    
    // Toggle rating with rate limiting
    toggleGameRating(gameId, type) {
        if (!Utils.checkRateLimit('rateGame')) {
            customAlert('Too many ratings. Please slow down.', "Rate Limited", "error");
            return;
        }
        
        const game = State.data.games[gameId];
        if (!game) return;
        
        const currentRating = State.data.ratings[gameId];
        const newRating = currentRating === type ? null : type;
        
        // Remove old rating
        if (currentRating) {
            delete State.data.stats.ratings[currentRating][gameId];
        }
        
        // Add new rating
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
    
    // Update modal UI elements
    updateModalStatsUI(gameId) {
        const el = {
            statsCount: $('modalStatsCount'),
            favBtn: $('modalFavoriteBtn'),
            likeBtn: $('modalLikeBtn'),
            dislikeBtn: $('modalDislikeBtn'),
            noteBtn: $('modalNoteBtn'),
            noteArea: $('modalNoteArea'),
        };
        
        if (Object.values(el).some(e => !e)) {
            console.warn("Modal elements not ready");
            return;
        }
        
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
    
    // Save note
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
    
    // Random game
    playRandomGame() {
        const ids = Object.keys(State.data.games);
        if (ids.length === 0) return;
        const randomId = ids[Math.floor(Math.random() * ids.length)];
        this.openGameModal(randomId);
    },
    
    // Export data
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
    
    // Import data with confirmation
    importData(file) {
        if (!confirm('⚠️ This will OVERWRITE all existing data. Continue?')) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                if (!confirm(`Import ${Object.keys(imported.games || {}).length} games and overwrite all settings?`)) return;
                
                State.data = { ...State.data, ...imported };
                State.save();
                initialize();
                customAlert('Data imported successfully! Hub reloaded.', "Import Complete", "success");
            } catch (error) {
                console.error("Import error:", error);
                customAlert(`Import failed: ${error.message}`, "Error", "error");
            }
        };
        reader.readAsText(file);
        $('importFileInput').value = '';
    },
    
    // Admin: Add/edit game with validation
    saveGame(formData) {
        if (!Utils.checkRateLimit('saveGame', 5)) {
            customAlert('Too many saves. Slow down.', "Rate Limited", "error");
            return;
        }
        
        const id = formData.get('id');
        const title = formData.get('title').trim();
        const url = formData.get('url').trim();
        const image = formData.get('image').trim();
        const description = formData.get('description').trim();
        const tags = formData.get('tags').split(',').map(t => t.trim().toLowerCase()).filter(t => t);
        const section = formData.get('section') || 'other';
        const controls = formData.get('controls')?.trim();
        
        // Validation
        if (!title || !url) {
            customAlert('Title and URL are required.', "Validation Error", "error");
            return;
        }
        if (!Utils.isValidUrl(url)) {
            customAlert('Invalid game URL. Must be http:// or https://', "Validation Error", "error");
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
        clearAddForm();
        initialize();
    },
};

// --- EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Initialize state
        State.load();
        
        // DOM cache
        const DOM = {
            search: $('searchInput'),
            sort: $('sortSelect'),
            panic: $('panicBtn'),
            container: $('appContainer'),
            modal: $('gameModal'),
            iframe: $('modalGameIframe'),
            noteText: $('modalNoteText'),
            noteArea: $('modalNoteArea'),
            profileBtn: $('profileBtn'),
            settingsBtn: $('settingsBtn'),
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
        
        // Panic button with custom key
        DOM.panic.onclick = () => Actions.toggleCloak();
        document.addEventListener('keydown', (e) => {
            if (e.key === State.data.settings.panicKey && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
                e.preventDefault();
                Actions.toggleCloak();
            }
        });
        
        // Modal event listeners
        $('closeModalBtn').onclick = () => Actions.closeGameModal();
        $('modalNoteBtn').onclick = () => DOM.noteArea.classList.toggle('hidden');
        $('modalNoteSaveBtn').onclick = () => Actions.saveNote(window.currentModalGameId);
        
        // Rating buttons
        $('modalLikeBtn').onclick = () => Actions.toggleGameRating(window.currentModalGameId, 'like');
        $('modalDislikeBtn').onclick = () => Actions.toggleGameRating(window.currentModalGameId, 'dislike');
        $('modalFavoriteBtn').onclick = () => Actions.toggleFavorite(window.currentModalGameId);
        
        // Random game button
        if (CONFIG.FEATURES.RANDOM_GAME) {
            const randomBtn = Utils.createElement('button', {
                className: 'p-2 rounded-full bg-white dark:bg-gray-800 shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                title: 'Random Game',
                innerHTML: '<i data-lucide="dice" class="w-5 h-5 text-gray-600 dark:text-gray-300"></i>',
            });
            randomBtn.onclick = () => Actions.playRandomGame();
            $('searchInput').parentNode.appendChild(randomBtn);
        }
        
        // Escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (window.currentModalGameId) Actions.closeGameModal();
                if ($('profileModal').classList.contains('pointer-events-none') === false) closeProfileModal();
                if ($('settingsModal').classList.contains('pointer-events-none') === false) closeSettingsModal();
            }
        });
        
        // Initialize UI
        initialize();
        
        // Hide loading screen
        setTimeout(() => {
            $('loadingModal').classList.add('opacity-0');
            setTimeout(() => $('loadingModal').classList.add('hidden'), 300);
        }, 500);
        
        console.log(`${CONFIG.APP_NAME} v${CONFIG.VERSION} initialized successfully.`);
        
    } catch (err) {
        console.error("Fatal initialization error:", err);
        $('loadingModal').innerHTML = `
            <div class="p-6 bg-red-800 border-4 border-red-500 rounded-lg text-white max-w-md">
                <h2 class="text-2xl font-bold mb-2">💥 Critical Error</h2>
                <p class="mb-4">Failed to load the application. Check console (F12) for details.</p>
                <button onclick="location.reload()" class="px-4 py-2 bg-red-600 rounded hover:bg-red-700">Reload</button>
            </div>`;
    }
});

// --- INITIALIZATION ---
function initialize() {
    // Apply theme
    updateTheme(State.data.settings.theme, false);
    updateAccentColor(State.data.settings.accent, false);
    
    // Update document title and favicon
    document.title = CONFIG.APP_NAME;
    $('appTitle').textContent = CONFIG.APP_NAME;
    
    // Setup tag filters
    const allTags = new Set();
    Object.values(State.data.games).forEach(game => {
        (game.tags || []).forEach(tag => allTags.add(tag));
    });
    window.currentTags = Array.from(allTags).sort().map(tag => ({ name: tag, active: false }));
    
    // Render everything
    Renderer.renderAll();
    renderNavigation();
    
    // Setup PWA if enabled
    if (CONFIG.FEATURES.PWA_SUPPORT && 'serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').then(() => {
            console.log('PWA Service Worker registered');
        }).catch(err => console.log('PWA not available:', err));
    }
    
    // Check for updates (weekly)
    checkForUpdates();
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
    const appTitle = $('appTitle');
    
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

function checkForUpdates() {
    // Check if new games were added in the last week
    const lastCheck = Utils.getStorageData('lastUpdateCheck', 0);
    if (Date.now() - lastCheck > 7 * 24 * 60 * 60 * 1000) {
        const newGames = Object.values(State.data.games).filter(g => 
            (new Date() - new Date(g.created)) / (1000 * 60 * 60 * 24) < 7
        ).length;
        if (newGames > 0) {
            customAlert(`${newGames} new games added this week!`, "Update", "info");
        }
        Utils.setStorageData('lastUpdateCheck', Date.now());
    }
}
