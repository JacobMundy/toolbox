const themes = {
    glassy: {
        '--glass-opacity': '0.78',
        '--glass-blur': '24px',
        '--glass-bg-color': '14, 14, 38',
        '--r-sm': '6px',
        '--r-md': '10px',
        '--r-lg': '14px',
        '--r-xl': '20px',
    },
    solidDark: {
        '--glass-opacity': '1',
        '--glass-blur': '0px',
        '--glass-bg-color': '10, 10, 20',
        '--r-sm': '6px',
        '--r-md': '10px',
        '--r-lg': '14px',
        '--r-xl': '20px',
    },
    rounded: {
        '--glass-opacity': '0.85',
        '--glass-blur': '16px',
        '--glass-bg-color': '14, 14, 38',
        '--r-sm': '12px',
        '--r-md': '18px',
        '--r-lg': '24px',
        '--r-xl': '32px',
    },
    sharp: {
        '--glass-opacity': '0.9',
        '--glass-blur': '8px',
        '--glass-bg-color': '20, 20, 20',
        '--r-sm': '0px',
        '--r-md': '0px',
        '--r-lg': '0px',
        '--r-xl': '0px',
    }
};

class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('toolbox-theme') || 'glassy';
        this.applyTheme(this.currentTheme);
    }

    applyTheme(themeName) {
        let theme = themes[themeName];
        if (!theme) {
            console.warn(`Theme "${themeName}" not found, falling back to glassy.`);
            theme = themes['glassy'];
            themeName = 'glassy';
        }
        
        const root = document.documentElement;
        for (const [key, value] of Object.entries(theme)) {
            root.style.setProperty(key, value);
        }
        
        this.currentTheme = themeName;
        localStorage.setItem('toolbox-theme', themeName);
        
        // Dispatch event in case tools need to know
        window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: themeName } }));
    }

    getThemes() {
        return Object.keys(themes);
    }
}

window.themeManager = new ThemeManager();
