// utils.js - Security & Performance helpers
const Utils = {
    // Safe DOM creation to prevent XSS
    createElement: (tag, props = {}, children = []) => {
        const el = document.createElement(tag);
        Object.keys(props).forEach(key => {
            if (key === 'className') el.className = props[key];
            else if (key === 'textContent') el.textContent = props[key];
            else if (key === 'innerHTML') {
                console.warn('Warning: innerHTML used, potential XSS');
                el.innerHTML = props[key];
            }
            else el.setAttribute(key, props[key]);
        });
        children.forEach(child => el.appendChild(child));
        return el;
    },
    
    // Validate URLs strictly
    isValidUrl: (string) => {
        try {
            const url = new URL(string);
            return ['http:', 'https:'].includes(url.protocol);
        } catch (_) {
            return false;
        }
    },
    
    // Debounce function
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Format numbers (1K, 1M)
    formatNumber: (num) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    },
    
    // Get time ago string
    timeAgo: (date) => {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutes ago";
        return Math.floor(seconds) + " seconds ago";
    },
    
    // Rate limiting
    checkRateLimit: (action, limit = CONFIG.RATE_LIMIT_ACTIONS) => {
        const key = `ratelimit_${hubUser.nickname}_${action}`;
        const count = parseInt(localStorage.getItem(key) || '0');
        if (count >= limit) return false;
        localStorage.setItem(key, (count + 1).toString());
        setTimeout(() => localStorage.setItem(key, (count - 1).toString()), 3600000);
        return true;
    },
};

// HTML Sanitizer for user content
Utils.sanitizeHtml = (html) => {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
};
