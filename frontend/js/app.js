/* ═══════════════════════════════════════════════════════════
   App — main application controller
   ═══════════════════════════════════════════════════════════ */
// Global Monaco Loader
window.loadMonaco = (() => {
    let monacoLoadingPromise = null;
    return () => {
        if (monacoLoadingPromise) return monacoLoadingPromise;
        monacoLoadingPromise = new Promise((resolve, reject) => {
            if (window.monaco) return resolve(window.monaco);
            const loaderScript = document.createElement('script');
            loaderScript.src = 'vs/loader.js';
            loaderScript.onload = () => {
                require.config({ paths: { 'vs': 'vs' } });
                require(['vs/editor/editor.main'], () => resolve(window.monaco), reject);
            };
            loaderScript.onerror = reject;
            document.head.appendChild(loaderScript);
        });
        return monacoLoadingPromise;
    };
})();

const App = {

    wm: null,
    search: null,

async init() {
        // Initialize centralized state management
        if (window.ToolboxState) {
            await ToolboxState.init();
            ToolboxState.setupAutoSave();
        }

        this.wm = new WindowManager(
            document.getElementById('desktop'),
            document.getElementById('taskbar-items')
        );
        this.search = new Search();

        // Fix: Prevent default on dragover/drop to stop the forbidden cursor inside the webview
        document.addEventListener('dragover', (e) => {
            e.preventDefault(); // Tells Windows we are a valid drop target
            e.dataTransfer.dropEffect = 'copy';
        });
        
        document.addEventListener('drop', (e) => {
            e.preventDefault(); // Prevents browser from opening the file
        });

        // Tile button
        document.getElementById('tile-btn').addEventListener('click', () => this.wm.tileWindows());

        // App Drawer initializations
        this._initAppDrawer();

        // Build welcome grid
        this._renderDesktopShortcuts();

        // Re-render grid when tools register late
        window.addEventListener('tool-registered', () => {
            this._renderDesktopShortcuts();
            this._renderAppDrawer();
            this.search.refresh();
        });

        // Desktop click to deselect shortcuts and close drawer
        document.addEventListener('click', e => {
            if (e.target.id === 'desktop' || e.target.id === 'desktop-shortcuts') {
                document.querySelectorAll('.desktop-shortcut').forEach(s => s.classList.remove('selected'));
            }
            if (!e.target.closest('#app-drawer') && e.target.id !== 'app-drawer-btn') {
                document.getElementById('app-drawer').classList.remove('open');
            }
        });

        // Resize boundary clamping
        window.addEventListener('resize', () => {
            if (this._resizeTimer) clearTimeout(this._resizeTimer);
            this._resizeTimer = setTimeout(() => this._clampDesktopIcons(), 100);
        });
    },

    _initAppDrawer() {
        const btn = document.getElementById('app-drawer-btn');
        const drawer = document.getElementById('app-drawer');
        
        btn.addEventListener('click', () => {
            drawer.classList.toggle('open');
        });
        
        this._renderAppDrawer();
    },

    _renderAppDrawer() {
        const grid = document.getElementById('app-drawer-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        ToolRegistry.getAll().forEach(tool => {
            const el = document.createElement('div');
            el.className = 'app-drawer-item';
            el.innerHTML = `
                <div class="app-drawer-icon">${tool.icon}</div>
                <div class="app-drawer-name">${tool.name}</div>
            `;
            el.addEventListener('click', () => {
                this.openTool(tool.id);
                document.getElementById('app-drawer').classList.remove('open');
            });
            grid.appendChild(el);
        });
    },

    _getEmptySlot(desiredX, desiredY, maxW, maxH, occupied) {
        let r = 0;
        const gridSizeX = 100, gridSizeY = 110;
        while (r < 20) {
            for (let dx = -r; dx <= r; dx++) {
                for (let dy = -r; dy <= r; dy++) {
                    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
                    const cx = desiredX + dx * gridSizeX;
                    const cy = desiredY + dy * gridSizeY;
                    if (cx >= 10 && cx <= maxW + 50 && cy >= 10) {
                        const key = `${cx},${cy}`;
                        if (!occupied.has(key)) return { x: cx, y: cy };
                    }
                }
            }
            r++;
        }
        return { x: desiredX, y: desiredY };
    },

    _clampDesktopIcons() {
        const desktop = document.getElementById('desktop');
        const gridSizeX = 100, gridSizeY = 110;
        const maxW = desktop.clientWidth - 80;
        const maxH = desktop.clientHeight - 100;
        const occupied = new Set();
        const icons = Array.from(document.querySelectorAll('.desktop-shortcut'));

        icons.forEach(el => {
            let cx = parseInt(el.style.left) || 0;
            let cy = parseInt(el.style.top) || 0;
            if (!(cx > maxW || cy > maxH || cx < 10 || cy < 10)) {
                occupied.add(`${Math.round((cx - 10) / gridSizeX) * gridSizeX + 10},${Math.round((cy - 10) / gridSizeY) * gridSizeY + 10}`);
            }
        });

        icons.forEach(el => {
            let cx = parseInt(el.style.left) || 0;
            let cy = parseInt(el.style.top) || 0;
            
            if (cx > maxW || cy > maxH || cx < 10 || cy < 10) {
                cx = Math.max(10, Math.min(cx, maxW));
                cy = Math.max(10, Math.min(cy, maxH));
                let snapX = Math.round((cx - 10) / gridSizeX) * gridSizeX + 10;
                let snapY = Math.round((cy - 10) / gridSizeY) * gridSizeY + 10;
                
                const slot = this._getEmptySlot(snapX, snapY, maxW, maxH, occupied);
                occupied.add(`${slot.x},${slot.y}`);
                el.style.left = slot.x + 'px';
                el.style.top = slot.y + 'px';
                
                try { localStorage.setItem('desktop_pos_' + el.dataset.id, JSON.stringify({x: slot.x, y: slot.y})); } catch {}
            }
        });
    },

    openTool(toolId) {
        // Focus existing window if open
        const existing = this.wm.findByToolId(toolId);
        if (existing) {
            if (existing.state === 'minimized') this.wm.restoreWindow(existing.id);
            else this.wm.bringToFront(existing.id);
            return;
        }

        const tool = ToolRegistry.getById(toolId);
        if (!tool) { console.error('Unknown tool:', toolId); return; }

        this.wm.createWindow({
            toolId:    tool.id,
            title:     tool.name,
            icon:      tool.icon,
            width:     tool.defaultWidth,
            height:    tool.defaultHeight,
            minWidth:  tool.minWidth,
            minHeight: tool.minHeight,
            createUI:  tool.createUI,
        });
    },

    _renderDesktopShortcuts() {
        const container = document.getElementById('desktop-shortcuts');
        if (!container) return;
        
        container.innerHTML = '';
        const tools = ToolRegistry.getAll();
        const desktop = document.getElementById('desktop');
        
        const gridSizeX = 100;
        const gridSizeY = 110;
        
        tools.forEach((tool, index) => {
            const el = document.createElement('div');
            el.className = 'desktop-shortcut';
            el.dataset.id = tool.id;
            
            el.innerHTML = `
                <div class="shortcut-icon">${tool.icon}</div>
                <div class="shortcut-name">${tool.name}</div>
            `;
            
            // Double click to open
            el.addEventListener('dblclick', () => {
                this.openTool(tool.id);
                document.querySelectorAll('.desktop-shortcut').forEach(s => s.classList.remove('selected'));
            });
            
            container.appendChild(el);
            
            // Fixed Memory Leak in Drag and Drop mechanics
            let isDragging = false;
            let didMove = false;
            let startX, startY, initialLeft, initialTop;

            const onMove = e => {
                if (!isDragging) return;
                didMove = true;
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                el.style.left = (initialLeft + dx) + 'px';
                el.style.top = (initialTop + dy) + 'px';
            };

            const onUp = e => {
                if (!isDragging) return;
                isDragging = false;
                el.classList.remove('animating-drag');
                
                // Cleanup listeners correctly
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                
                if (didMove) {
                    let currentLeft = parseInt(el.style.left) || 0;
                    let currentTop = parseInt(el.style.top) || 0;
                    
                    const maxW = desktop.clientWidth - 80;
                    const maxH = desktop.clientHeight - 100;
                    
                    currentLeft = Math.max(10, Math.min(currentLeft, maxW));
                    currentTop = Math.max(10, Math.min(currentTop, maxH));
                    
                    let snapX = Math.round((currentLeft - 10) / gridSizeX) * gridSizeX + 10;
                    let snapY = Math.round((currentTop - 10) / gridSizeY) * gridSizeY + 10;
                    
                    // Build occupied set
                    const occupied = new Set();
                    document.querySelectorAll('.desktop-shortcut').forEach(other => {
                        if (other === el) return;
                        const ox = parseInt(other.style.left) || 0;
                        const oy = parseInt(other.style.top) || 0;
                        occupied.add(`${Math.round((ox - 10) / gridSizeX) * gridSizeX + 10},${Math.round((oy - 10) / gridSizeY) * gridSizeY + 10}`);
                    });

                    const slot = App._getEmptySlot(snapX, snapY, maxW, maxH, occupied);
                    
                    el.style.left = slot.x + 'px';
                    el.style.top = slot.y + 'px';
                    
                    try { localStorage.setItem('desktop_pos_' + tool.id, JSON.stringify({x: slot.x, y: slot.y})); } catch {}
                }
            };
            
            el.addEventListener('mousedown', e => {
                if (e.button !== 0) return; // Only left click
                isDragging = true;
                didMove = false;
                startX = e.clientX;
                startY = e.clientY;
                initialLeft = parseInt(el.style.left) || 0;
                initialTop = parseInt(el.style.top) || 0;
                el.classList.add('animating-drag');
                e.preventDefault(); // prevent native drag text selection
                
                // Attach cleanly to document on drag start
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            });
            
            el.addEventListener('click', e => {
                if (!didMove) {
                    document.querySelectorAll('.desktop-shortcut').forEach(s => s.classList.remove('selected'));
                    el.classList.add('selected');
                    e.stopPropagation();
                }
            });
            
            // Initial positioning
            let pos;
            try {
                const raw = localStorage.getItem('desktop_pos_' + tool.id);
                if (raw) pos = JSON.parse(raw);
            } catch {}
            
            if (!pos) {
                const dtHeight = desktop.clientHeight || window.innerHeight;
                const rows = Math.floor((dtHeight - 80) / gridSizeY) || 1;
                const col = Math.floor(index / Math.max(rows, 1));
                const row = index % Math.max(rows, 1);
                pos = { x: 10 + col * gridSizeX, y: 10 + row * gridSizeY };
            }
            
            el.style.left = pos.x + 'px';
            el.style.top = pos.y + 'px';
        });
    },
};

document.addEventListener('DOMContentLoaded', () => App.init());