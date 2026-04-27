/* ═══════════════════════════════════════════════════════════
   Search — fuzzy search powered by Fuse.js + tool launcher
   ═══════════════════════════════════════════════════════════ */
class Search {
    constructor() {
        this.fuse   = null;
        this.input  = document.getElementById('search-input');
        this.box    = document.getElementById('search-results');
        this.selIdx = -1;
        this._items = [];
        this._favKey = 'toolbox_favorites';
        this._favorites = new Set();

        try {
            const saved = JSON.parse(localStorage.getItem(this._favKey));
            if (Array.isArray(saved)) this._favorites = new Set(saved);
        } catch {}

        this.input.addEventListener('input',   () => this._onInput());
        this.input.addEventListener('keydown', e  => this._onKey(e));
        this.input.addEventListener('focus',   () => this._onInput());

        document.addEventListener('click', e => {
            if (!e.target.closest('#search-container')) this.hide();
        });

        // Ctrl+K shortcut
        document.addEventListener('keydown', e => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.input.focus();
                this.input.select();
            }
        });
    }

    refresh() {
        const tools = ToolRegistry.getAll();
        this.fuse = new Fuse(tools, {
            keys: [
                { name: 'name',        weight: 0.5 },
                { name: 'description', weight: 0.3 },
                { name: 'tags',        weight: 0.2 },
            ],
            threshold: 0.45,
            includeScore: true,
        });
    }

    hide() {
        this.box.classList.remove('visible');
        this.box.innerHTML = '';
        this.selIdx = -1;
        this._items = [];
    }

    toggleFavorite(id) {
        if (this._favorites.has(id)) this._favorites.delete(id);
        else this._favorites.add(id);
        try { localStorage.setItem(this._favKey, JSON.stringify([...this._favorites])); } catch {}
    }

    /* ── private ────────────────────────────────────── */

    _onInput() {
        const q = this.input.value.trim();
        if (!this.fuse) this.refresh();

        if (!q) {
            this._showAllTools();
            return;
        }

        const results = this.fuse.search(q);
        if (!results.length) {
            this.box.innerHTML = '<div class="search-empty">No tools found</div>';
            this.box.classList.add('visible');
            this._items = [];
            return;
        }

        this.selIdx = -1;
        this._items = results.map(r => r.item);
        this.box.innerHTML = results.map((r, i) => this._itemHTML(r.item, i)).join('');
        this.box.classList.add('visible');
        this._bindItemEvents();
    }

    _showAllTools() {
        const tools = ToolRegistry.getAll();
        const favs = tools.filter(t => this._favorites.has(t.id));
        const rest = tools.filter(t => !this._favorites.has(t.id));

        this.selIdx = -1;
        this._items = [...favs, ...rest];

        let html = '';

        if (favs.length > 0) {
            html += '<div class="search-section-label">★ Favorites</div>';
            html += favs.map((t, i) => this._itemHTML(t, i, true)).join('');
            html += '<div class="search-divider"></div>';
            html += '<div class="search-section-label">All Tools</div>';
            html += rest.map((t, i) => this._itemHTML(t, i + favs.length, false)).join('');
        } else {
            html += '<div class="search-section-label">All Tools</div>';
            html += tools.map((t, i) => this._itemHTML(t, i, false)).join('');
        }

        this.box.innerHTML = html;
        this.box.classList.add('visible');
        this._bindItemEvents();
    }

    _itemHTML(tool, idx, isFav) {
        const fav = isFav !== undefined ? isFav : this._favorites.has(tool.id);
        return `
            <div class="search-result-item" data-idx="${idx}" data-id="${tool.id}">
                <span class="search-result-icon">${tool.icon}</span>
                <div class="search-result-info">
                    <span class="search-result-name">${tool.name}</span>
                    <span class="search-result-desc">${tool.description}</span>
                </div>
                <button class="search-fav-btn${fav ? ' active' : ''}" data-fav-id="${tool.id}" title="${fav ? 'Unfavorite' : 'Favorite'}">
                    ${fav ? '★' : '☆'}
                </button>
            </div>`;
    }

    _bindItemEvents() {
        this.box.querySelectorAll('.search-result-item').forEach(el => {
            el.addEventListener('click', e => {
                // Don't open tool if clicking the fav button
                if (e.target.closest('.search-fav-btn')) return;
                App.openTool(el.dataset.id);
                this.hide();
                this.input.value = '';
                this.input.blur();
            });
        });

        this.box.querySelectorAll('.search-fav-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const id = btn.dataset.favId;
                this.toggleFavorite(id);
                // Re-render the current list
                this._onInput();
            });
        });
    }

    _onKey(e) {
        const items = this.box.querySelectorAll('.search-result-item');
        if (!items.length) {
            if (e.key === 'Escape') { this.hide(); this.input.blur(); }
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.selIdx = Math.min(this.selIdx + 1, items.length - 1);
            this._highlight(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.selIdx = Math.max(this.selIdx - 1, 0);
            this._highlight(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const idx = this.selIdx >= 0 ? this.selIdx : 0;
            if (items[idx]) {
                App.openTool(items[idx].dataset.id);
                this.hide();
                this.input.value = '';
                this.input.blur();
            }
        } else if (e.key === 'Escape') {
            this.hide();
            this.input.blur();
        }
    }

    _highlight(items) {
        items.forEach((el, i) => el.classList.toggle('selected', i === this.selIdx));
        if (items[this.selIdx]) items[this.selIdx].scrollIntoView({ block: 'nearest' });
    }
}
