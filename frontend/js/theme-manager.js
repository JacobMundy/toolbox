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

const DEFAULT_THEME_PROPS = {
    '--accent-rgb': '124, 108, 240',
    '--bg-body': '#07071a',
    '--bg-primary': '#0c0c24',
    '--bg-secondary': '#111135',
    '--bg-input': '#13132e',
    '--glass-opacity': '0.78',
    '--glass-blur': '24px',
    '--glass-bg-color': '14, 14, 38',
    '--r-sm': '6px',
    '--r-md': '10px',
    '--r-lg': '14px',
    '--r-xl': '20px',
};

class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('toolbox_theme') || localStorage.getItem('toolbox-theme') || 'glassy';
        this.customBase = localStorage.getItem('toolbox_custom_base') || localStorage.getItem('toolbox-custom-base') || 'glassy';
        this.overrides = JSON.parse(localStorage.getItem('toolbox_custom_overrides')) || JSON.parse(localStorage.getItem('toolbox-custom-overrides')) || {};
        this.profiles = JSON.parse(localStorage.getItem('toolbox_theme_profiles')) || JSON.parse(localStorage.getItem('toolbox-theme-profiles')) || {};
        
        // Migrate keys if necessary
        if (localStorage.getItem('toolbox-theme')) {
            this._saveAll();
            // Optional: clean up old keys
        }
        
        this.applyTheme(this.currentTheme);
    }

    _saveAll() {
        localStorage.setItem('toolbox_theme', this.currentTheme);
        localStorage.setItem('toolbox_custom_base', this.customBase);
        localStorage.setItem('toolbox_custom_overrides', JSON.stringify(this.overrides));
        localStorage.setItem('toolbox_theme_profiles', JSON.stringify(this.profiles));
        // Also trigger state sync if available
        if (window.ToolboxState) window.ToolboxState.sync();
    }

    applyTheme(themeName) {
        let themeValues = {};
        
        if (themeName === 'custom') {
            const base = themes[this.customBase] || themes['glassy'];
            themeValues = { ...base, ...this.overrides };
        } else {
            themeValues = themes[themeName] || themes['glassy'];
        }
        
        const root = document.documentElement;

        // 1. Reset/Apply core theme values from the theme object
        for (const [key, value] of Object.entries(themeValues)) {
            root.style.setProperty(key, value);
        }

        // 2. Apply/Reset Global Overrides (Background & Accent)
        const accentRgb = this.overrides['--accent-rgb'] || DEFAULT_THEME_PROPS['--accent-rgb'];
        root.style.setProperty('--accent-rgb', accentRgb);
        root.style.setProperty('--accent', `rgb(${accentRgb})`);
        root.style.setProperty('--accent-dim', `rgba(${accentRgb}, 0.15)`);
        root.style.setProperty('--accent-glow', `rgba(${accentRgb}, 0.35)`);

        // 3. Body Background
        const bgBody = this.overrides['--bg-body'] || DEFAULT_THEME_PROPS['--bg-body'];
        root.style.setProperty('--bg-body', bgBody);
        
        // 4. Secondary/Element Colors
        const bgSec = this.overrides['--bg-secondary'] || DEFAULT_THEME_PROPS['--bg-secondary'];
        root.style.setProperty('--bg-primary', this.overrides['--bg-primary'] || (this.overrides['--bg-secondary'] ? bgSec : DEFAULT_THEME_PROPS['--bg-primary']));
        root.style.setProperty('--bg-secondary', bgSec);
        root.style.setProperty('--bg-input', this.overrides['--bg-input'] || (this.overrides['--bg-secondary'] ? bgSec : DEFAULT_THEME_PROPS['--bg-input']));
        
        // Update glass base if it's been overridden specifically via secondary color
        if (this.overrides['--bg-secondary']) {
            const rgb = this.hexToRgb(bgSec);
            if (rgb) root.style.setProperty('--glass-bg-color', rgb);
        } else if (!themeValues['--glass-bg-color']) {
            root.style.setProperty('--glass-bg-color', DEFAULT_THEME_PROPS['--glass-bg-color']);
        }

        // 5. Background Image
        if (this.overrides['--bg-image']) {
            document.body.style.backgroundImage = `url(${this.overrides['--bg-image']})`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundPosition = 'center';
        } else {
            document.body.style.backgroundImage = 'none';
        }
        
        this.currentTheme = themeName;
        this._saveAll();
        window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: themeName } }));
    }

    hexToRgb(hex) {
        if (!hex || hex[0] !== '#') return null;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return isNaN(r) ? null : `${r}, ${g}, ${b}`;
    }

    updateOverride(key, value) {
        this.overrides[key] = value;
        this._saveAll();
        this.applyTheme(this.currentTheme);
    }

    updateOverrides(updates) {
        Object.assign(this.overrides, updates);
        this._saveAll();
        this.applyTheme(this.currentTheme);
    }

    saveProfile(name) {
        this.profiles[name] = {
            base: this.customBase,
            overrides: { ...this.overrides }
        };
        this._saveAll();
    }

    loadProfile(name) {
        const p = this.profiles[name];
        if (p) {
            this.customBase = p.base;
            this.overrides = { ...p.overrides };
            this._saveAll();
            this.applyTheme('custom');
        }
    }

    deleteProfile(name) {
        delete this.profiles[name];
        this._saveAll();
    }

    setCustomBase(baseTheme) {
        this.customBase = baseTheme;
        this._saveAll();
        if (this.currentTheme === 'custom') {
            this.applyTheme('custom');
        }
    }

    resetCustom() {
        this.overrides = {};
        this.customBase = 'glassy';
        this._saveAll();
        
        // Re-apply current theme to clear global overrides from the root element
        this.applyTheme(this.currentTheme);
    }

    getEffectiveValues() {
        const base = themes[this.customBase] || themes['glassy'];
        return { ...DEFAULT_THEME_PROPS, ...base, ...this.overrides };
    }

    getThemes() {
        return [...Object.keys(themes), 'custom'];
    }
}

window.themeManager = new ThemeManager();

