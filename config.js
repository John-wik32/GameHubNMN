// config.js - All settings in one place
const CONFIG = {
    APP_NAME: 'Unblocked Game Hub',
    VERSION: '2.0.0',
    
    // Feature Flags (toggle features on/off)
    FEATURES: {
        RANDOM_GAME: true,
        RECENTLY_PLAYED: true,
        GAME_REPORTING: true,
        PWA_SUPPORT: true,
        BULK_IMPORT: true,
        ANALYTICS: true,
        SEASONAL: true,
        SWIPE_GESTURES: false, // Requires hammer.js
    },
    
    // Limits
    NEW_GAME_DAYS: 7,
    LOCAL_RECENT_LIMIT: 5,
    GLOBAL_RECENT_LIMIT: 10,
    SEARCH_DEBOUNCE_MS: 300,
    RATE_LIMIT_ACTIONS: 50,
    
    // Security
    ADMIN_PASS_HASH: 'bXlwYXNz', // btoa('mypass') - CHANGE THIS!
    SANDBOX_IFRAME: true,
    
    // UI
    ACCENT_COLORS: {
        'Blue': { hex: '#3b82f6', rgb: '59, 130, 246' },
        'Green': { hex: '#10b981', rgb: '16, 185, 129' },
        'Purple': { hex: '#8b5cf6', rgb: '139, 92, 246' },
        'Red': { hex: '#ef4444', rgb: '239, 68, 68' },
    },
    
    AVATARS: ['🎮', '👾', '🚀', '🤖', '🐱', '🐶', '🍕', '⚽', '👑', '🧙'],
};

// Export for use in other files
if (typeof module !== 'undefined') module.exports = CONFIG;
