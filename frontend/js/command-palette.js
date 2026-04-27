/* ═══════════════════════════════════════════════════════════
   CommandPalette — Ctrl+P spotlight-style action runner
   ═══════════════════════════════════════════════════════════ */
class CommandPalette {
    constructor() {
        this._actions = [];
        this._selIdx = 0;
        this._visible = false;

        // Build DOM
        this._overlay = document.createElement('div');
        this._overlay.className = 'cmd-palette-overlay';
        this._overlay.innerHTML = `
            <div class="cmd-palette">
                <div class="cmd-palette-input-wrap">
                    <svg class="cmd-palette-icon" width="18" height="18" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" stroke-width="2" stroke-linecap="round">
                        <path d="M4 17V7l7-4 7 4v4"/><polyline points="18 15 22 19 18 23"/>
                    </svg>
                    <input type="text" class="cmd-palette-input" placeholder="Type a command…"
                           autocomplete="off" spellcheck="false">
                </div>
                <div class="cmd-palette-list"></div>
                <div class="cmd-palette-footer">
                    <span><kbd>↑↓</kbd> Navigate</span>
                    <span><kbd>↵</kbd> Run</span>
                    <span><kbd>Esc</kbd> Close</span>
                </div>
            </div>`;
        document.body.appendChild(this._overlay);

        this._input = this._overlay.querySelector('.cmd-palette-input');
        this._list  = this._overlay.querySelector('.cmd-palette-list');

        // Events
        this._overlay.addEventListener('click', e => {
            if (e.target === this._overlay) this.hide();
        });
        this._input.addEventListener('input', () => this._filter());
        this._input.addEventListener('keydown', e => this._onKey(e));

        // Global shortcut: Ctrl+P
        document.addEventListener('keydown', e => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
                e.preventDefault();
                this.toggle();
            }
        });

        this._injectStyles();
    }

    /* ── Public API ──────────────────────────────────── */

    /** Register a command action */
    register(action) {
        // { id, name, icon, description, section, handler }
        this._actions.push(action);
    }

    /** Bulk register from tool registry */
    registerTools() {
        const tools = ToolRegistry.getAll();
        tools.forEach(tool => {
            this.register({
                id: `open-${tool.id}`,
                name: `Open ${tool.name}`,
                icon: tool.icon,
                description: tool.description || '',
                section: 'Tools',
                handler: () => App.openTool(tool.id),
            });
        });
    }

    toggle() {
        this._visible ? this.hide() : this.show();
    }

    show() {
        // Refresh tool commands in case new tools registered
        this._actions = this._actions.filter(a => !a.id.startsWith('open-'));
        this.registerTools();

        this._visible = true;
        this._overlay.classList.add('open');
        this._input.value = '';
        this._selIdx = 0;
        this._filter();
        // Delayed focus to avoid keypress propagation
        requestAnimationFrame(() => this._input.focus());
    }

    hide() {
        this._visible = false;
        this._overlay.classList.remove('open');
        this._input.blur();
    }

    /* ── Private ─────────────────────────────────────── */

    _filter() {
        const q = this._input.value.trim().toLowerCase();
        let filtered = this._actions;

        if (q) {
            filtered = this._actions.filter(a =>
                a.name.toLowerCase().includes(q) ||
                (a.description && a.description.toLowerCase().includes(q)) ||
                (a.section && a.section.toLowerCase().includes(q))
            );
        }

        // Group by section
        const grouped = {};
        filtered.forEach(a => {
            const sec = a.section || 'Actions';
            if (!grouped[sec]) grouped[sec] = [];
            grouped[sec].push(a);
        });

        this._selIdx = 0;
        let html = '';
        let globalIdx = 0;

        for (const [section, actions] of Object.entries(grouped)) {
            html += `<div class="cmd-palette-section">${this._esc(section)}</div>`;
            actions.forEach(a => {
                html += `
                    <div class="cmd-palette-item ${globalIdx === 0 ? 'selected' : ''}"
                         data-idx="${globalIdx}" data-id="${a.id}">
                        <span class="cmd-palette-item-icon">${a.icon || '⚡'}</span>
                        <div class="cmd-palette-item-info">
                            <span class="cmd-palette-item-name">${this._esc(a.name)}</span>
                            ${a.description ? `<span class="cmd-palette-item-desc">${this._esc(a.description)}</span>` : ''}
                        </div>
                    </div>`;
                globalIdx++;
            });
        }

        if (!filtered.length) {
            html = '<div class="cmd-palette-empty">No matching commands</div>';
        }

        this._list.innerHTML = html;
        this._filteredActions = filtered;

        // Bind clicks
        this._list.querySelectorAll('.cmd-palette-item').forEach(el => {
            el.addEventListener('click', () => {
                const id = el.dataset.id;
                const action = this._actions.find(a => a.id === id);
                if (action) { this.hide(); action.handler(); }
            });
        });
    }

    _onKey(e) {
        const items = this._list.querySelectorAll('.cmd-palette-item');
        if (!items.length && e.key === 'Escape') { this.hide(); return; }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this._selIdx = Math.min(this._selIdx + 1, items.length - 1);
            this._highlight(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this._selIdx = Math.max(this._selIdx - 1, 0);
            this._highlight(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (items[this._selIdx]) items[this._selIdx].click();
        } else if (e.key === 'Escape') {
            this.hide();
        }
    }

    _highlight(items) {
        items.forEach((el, i) => el.classList.toggle('selected', i === this._selIdx));
        if (items[this._selIdx]) items[this._selIdx].scrollIntoView({ block: 'nearest' });
    }

    _esc(s) {
        return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    _injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
/* ── Command Palette Overlay ─────────────────────── */
.cmd-palette-overlay {
    position:fixed; inset:0; z-index:20000;
    background:rgba(0,0,0,.55); backdrop-filter:blur(8px);
    display:flex; align-items:flex-start; justify-content:center;
    padding-top:min(18vh, 140px);
    opacity:0; pointer-events:none;
    transition:opacity .15s ease;
}
.cmd-palette-overlay.open { opacity:1; pointer-events:auto; }

.cmd-palette {
    width:520px; max-width:92vw;
    background:var(--bg-primary);
    border:1px solid var(--glass-border);
    border-radius:var(--r-lg);
    box-shadow:0 20px 60px rgba(0,0,0,.6), 0 0 0 1px rgba(124,108,240,.15);
    display:flex; flex-direction:column;
    overflow:hidden;
    transform:translateY(-8px) scale(.98);
    transition:transform .18s cubic-bezier(.16,1,.3,1);
}
.cmd-palette-overlay.open .cmd-palette {
    transform:translateY(0) scale(1);
}

.cmd-palette-input-wrap {
    display:flex; align-items:center; gap:10px;
    padding:14px 16px;
    border-bottom:1px solid var(--glass-border);
}
.cmd-palette-icon { color:var(--accent); flex-shrink:0; }
.cmd-palette-input {
    flex:1; background:none; border:none; outline:none;
    color:var(--text-primary); font-size:15px;
    font-family:'Inter',sans-serif;
}
.cmd-palette-input::placeholder { color:var(--text-muted); }

.cmd-palette-list {
    max-height:340px; overflow-y:auto;
    padding:6px 0;
}
.cmd-palette-section {
    padding:8px 16px 4px;
    font-size:10px; font-weight:700;
    text-transform:uppercase; letter-spacing:.06em;
    color:var(--text-muted); user-select:none;
}
.cmd-palette-item {
    display:flex; align-items:center; gap:12px;
    padding:9px 16px; cursor:pointer;
    transition:background .1s;
}
.cmd-palette-item:hover,
.cmd-palette-item.selected { background:var(--accent-dim); }
.cmd-palette-item-icon { font-size:18px; flex-shrink:0; }
.cmd-palette-item-info { display:flex; flex-direction:column; min-width:0; }
.cmd-palette-item-name { font-size:13px; font-weight:500; color:var(--text-primary); }
.cmd-palette-item-desc {
    font-size:11px; color:var(--text-secondary);
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
.cmd-palette-empty {
    padding:20px; text-align:center;
    color:var(--text-muted); font-size:13px;
}
.cmd-palette-footer {
    display:flex; gap:16px; padding:8px 16px;
    border-top:1px solid var(--glass-border);
    font-size:11px; color:var(--text-muted);
}
.cmd-palette-footer kbd {
    font-size:10px; padding:1px 5px;
    margin-right:3px;
}
`;
        document.head.appendChild(style);
    }
}
