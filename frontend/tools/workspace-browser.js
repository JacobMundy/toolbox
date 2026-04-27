/* ═══════════════════════════════════════════════════════════
   Tool: Workspace Browser
   Browse, view, and manage files in ~/Toolbox_Workspace.
   Features: Subfolder navigation, Context Menu, App Data view,
             Create/Delete files & folders.
   ═══════════════════════════════════════════════════════════ */
(function () {
    const STYLE = document.createElement('style');
    STYLE.textContent = `
.ws-root { display:flex; flex-direction:column; height:100%; background: var(--bg-primary); }

.ws-main { display: flex; flex: 1; min-height: 0; }

/* Sidebar */
.ws-sidebar {
    width: 190px; flex-shrink: 0; border-right: 1px solid var(--glass-border);
    display: flex; flex-direction: column; background: rgba(0,0,0,0.2);
    transition: width 0.3s var(--ease-out);
}
.ws-sidebar-header {
    padding: 12px 14px; display: flex; justify-content: space-between; align-items: center;
    border-bottom: 1px solid var(--glass-border); font-size: 10px;
    font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .1em;
}
.ws-pin-list { flex: 1; overflow-y: auto; padding: 8px 0; }
.ws-pin-item {
    display: flex; align-items: center; gap: 10px; padding: 8px 14px;
    cursor: pointer; transition: all .15s var(--ease-out); font-size: 13px; color: var(--text-secondary);
    border-left: 3px solid transparent;
}
.ws-pin-item:hover { background: rgba(255,255,255,0.06); color: var(--text-primary); }
.ws-pin-item.active { 
    background: var(--accent-dim); 
    color: var(--accent-hover);
    border-left-color: var(--accent);
}
.ws-pin-icon { font-size: 16px; opacity: 0.8; filter: drop-shadow(0 0 8px rgba(0,0,0,0.3)); }
.ws-pin-name { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500; }
.ws-pin-remove {
    opacity: 0; font-size: 16px; padding: 2px 6px; border-radius: 4px;
    transition: all .2s; color: var(--text-muted);
}
.ws-pin-item:hover .ws-pin-remove { opacity: 0.6; }
.ws-pin-remove:hover { color: var(--error); background: rgba(248, 113, 113, 0.1); opacity: 1 !important; }

/* Toolbar */
.ws-toolbar {
    display:flex; align-items:center; gap:6px; padding:8px 12px;
    border-bottom:1px solid var(--glass-border);
    background:rgba(0,0,0,.1); flex-shrink:0;
}
.ws-path-bar {
    flex:1; display:flex; align-items:center; gap:4px;
    font-size:12px; color:var(--text-muted);
    font-family:'JetBrains Mono',monospace;
    overflow-x:auto; padding-bottom: 2px;
}
.ws-breadcrumb {
    padding: 2px 6px; border-radius: 4px; cursor: pointer; transition: all .1s;
    white-space: nowrap;
}
.ws-breadcrumb:hover { background: var(--accent-dim); color: var(--accent-hover); }
.ws-breadcrumb.active { color: var(--text-primary); font-weight: 600; }

/* File list */
.ws-file-list-container { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.ws-file-list {
    flex:1; overflow-y:auto; padding:4px;
}
.ws-file-item {
    display:flex; align-items:center; gap:10px;
    padding:6px 10px; border-radius:var(--r-sm);
    cursor:pointer; transition:all .12s;
    font-size:13px; user-select: none;
    border: 1px solid transparent;
}
.ws-file-item:hover { background:rgba(255,255,255,.05); border-color: rgba(255,255,255,.05); }
.ws-file-item.selected { background:var(--accent-dim); border-color: var(--accent-glow); }
.ws-file-item.drag-over { background: rgba(var(--accent-rgb), 0.2); border: 1px dashed var(--accent); transform: scale(1.01); }
.ws-pin-item.drag-over { background: rgba(var(--accent-rgb), 0.2); border-left-color: var(--accent); }
.ws-file-icon { font-size:18px; flex-shrink:0; }
.ws-file-info { flex:1; min-width:0; }
.ws-file-name {
    font-weight:500; color:var(--text-primary);
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
.ws-file-meta {
    font-size:10px; color:var(--text-muted); margin-top:1px;
}

/* Preview panel */
.ws-preview-panel {
    height:0; overflow:hidden; transition:height .25s var(--ease-out);
    border-top:1px solid var(--glass-border);
    display:flex; flex-direction:column; background: rgba(0,0,0,0.2);
}
.ws-preview-panel.open { height:40%; }
.ws-preview-header {
    display:flex; justify-content:space-between; align-items:center;
    padding:6px 14px; border-bottom:1px solid var(--glass-border);
    flex-shrink:0; background: rgba(0,0,0,0.1);
}
.ws-preview-title {
    font-size:10px; font-weight:700; color:var(--text-muted);
    text-transform:uppercase; letter-spacing:.08em;
}
.ws-preview-content {
    flex:1; overflow:auto; padding:12px 16px;
    font-family:'JetBrains Mono',monospace; font-size:12px;
    white-space:pre-wrap; color:var(--text-secondary);
    line-height:1.5;
}

/* Status bar */
.ws-status {
    padding:4px 12px; border-top:1px solid var(--glass-border);
    font-size:11px; color:var(--text-muted); flex-shrink:0;
    display:flex; justify-content:space-between;
    background:rgba(0,0,0,.15);
}

/* Empty state */
.ws-empty {
    flex:1; display:flex; flex-direction:column;
    align-items:center; justify-content:center;
    gap:12px; color:var(--text-muted); text-align:center;
    padding:40px; opacity: 0.8;
}
.ws-empty-icon { font-size:40px; filter: grayscale(1); }
.ws-empty-text { font-size:13px; max-width:240px; line-height:1.4; }

.btn-icon-sm { width: 28px; height: 28px; padding: 0; font-size: 14px; }

/* Grid View (Icons) */
.ws-file-list.grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 8px; padding: 12px;
}
.ws-file-list.grid .ws-file-item {
    flex-direction: column; text-align: center; padding: 12px 8px;
    height: 100px; justify-content: center;
}
.ws-file-list.grid .ws-file-icon { font-size: 36px; margin-bottom: 4px; }
.ws-file-list.grid .ws-file-meta { display: none; }
.ws-file-list.grid .ws-file-name { font-size: 11px; width: 100%; text-align: center; }

/* Tiles View (Wide Grid) */
.ws-file-list.tiles {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 10px; padding: 12px;
}
.ws-file-list.tiles .ws-file-item {
    padding: 8px 12px; height: 54px;
}
.ws-file-list.tiles .ws-file-icon { font-size: 28px; }
.ws-file-list.tiles .ws-file-name { font-size: 12px; }
.ws-file-list.tiles .ws-file-meta { font-size: 9px; }

.ws-view-toggle { margin-left: auto; display: flex; gap: 2px; background: rgba(0,0,0,0.2); border-radius: 6px; padding: 2px; }
.ws-view-btn { padding: 4px 8px; border: none; background: transparent; color: var(--text-muted); cursor: pointer; border-radius: 4px; font-size: 12px; transition: all .1s; }
.ws-view-btn.active { background: var(--accent-dim); color: var(--accent-hover); }
`;
    document.head.appendChild(STYLE);

    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }

    function getFileIcon(name, isDir) {
        if (isDir) return '📁';
        if (name === 'App Data') return '💾';
        const ext = name.split('.').pop().toLowerCase();
        const icons = {
            json: '📋', txt: '📄', md: '📝', py: '🐍',
            js: '📜', css: '🎨', html: '🌐', csv: '📊',
            log: '📃', toml: '⚙️', yaml: '⚙️', yml: '⚙️',
            png: '🖼️', jpg: '🖼️', svg: '🖼️',
        };
        return icons[ext] || '📄';
    }

    ToolRegistry.register({
        id: 'workspace-browser',
        name: 'Workspace',
        icon: '📂',
        description: 'Advanced file manager with Quick Access and NAS support',
        tags: ['workspace', 'files', 'browse', 'folder', 'export', 'backup', 'manager', 'nas', 'pin'],
        defaultWidth: 840,
        defaultHeight: 560,
        minWidth: 580,
        minHeight: 400,

        createUI(container) {
            container.innerHTML = `
            <div class="ws-root">
                <div class="ws-toolbar">
                    <button class="btn btn-sm btn-icon-sm" id="ws-back" title="Back">⬅</button>
                    <button class="btn btn-sm btn-icon-sm" id="ws-refresh" title="Refresh">🔄</button>
                    <div class="ws-path-bar" id="ws-path-bar"></div>
                    <div class="ws-view-toggle">
                        <button class="ws-view-btn active" id="ws-view-list" title="List View">≡</button>
                        <button class="ws-view-btn" id="ws-view-tiles" title="Tiles View">☷</button>
                        <button class="ws-view-btn" id="ws-view-grid" title="Grid View">⊞</button>
                    </div>
                    <button class="btn btn-sm" id="ws-new-file" title="New File">+ File</button>
                    <button class="btn btn-sm" id="ws-new-folder" title="New Folder">+ Folder</button>
                </div>
                <div class="ws-main">
                    <aside class="ws-sidebar">
                        <div class="ws-sidebar-header">
                            <span>Quick Access</span>
                            <button class="btn btn-icon-sm" id="ws-add-pin" title="Pin folder">+</button>
                        </div>
                        <div class="ws-pin-list" id="ws-pin-list"></div>
                    </aside>
                    <div class="ws-file-list-container">
                        <div class="ws-file-list" id="ws-file-list">
                            <div class="ws-empty">
                                <div class="ws-empty-icon">📂</div>
                                <div class="ws-empty-text">Loading workspace…</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="ws-preview-panel" id="ws-preview">
                    <div class="ws-preview-header">
                        <span class="ws-preview-title" id="ws-preview-title">Preview</span>
                        <div style="display: flex; gap: 6px;">
                            <button class="btn btn-sm" id="ws-open-prev">Open with Default</button>
                            <button class="btn btn-sm" id="ws-preview-close">✕</button>
                        </div>
                    </div>
                    <div class="ws-preview-content" id="ws-preview-content"></div>
                </div>
                <div class="ws-status" id="ws-status">
                    <span id="ws-status-text">Ready</span>
                    <span id="ws-status-count"></span>
                </div>
            </div>`;

            const fileList     = container.querySelector('#ws-file-list');
            const pinList      = container.querySelector('#ws-pin-list');
            const pathBar      = container.querySelector('#ws-path-bar');
            const previewPanel = container.querySelector('#ws-preview');
            const previewTitle = container.querySelector('#ws-preview-title');
            const previewContent = container.querySelector('#ws-preview-content');
            const statusText   = container.querySelector('#ws-status-text');
            const statusCount  = container.querySelector('#ws-status-count');
            const backBtn      = container.querySelector('#ws-back');
            const openPrevBtn  = container.querySelector('#ws-open-prev');
            const addPinBtn    = container.querySelector('#ws-add-pin');
            const btnListView  = container.querySelector('#ws-view-list');
            const btnTilesView = container.querySelector('#ws-view-tiles');
            const btnGridView  = container.querySelector('#ws-view-grid');

            let currentPath = []; 
            let currentFiles = [];
            let absoluteBasePath = ''; 
            let viewMode = 'list'; 
            let selectedFile = null;
            let isAppData = false;
            let pins = [];

            // Global safety fallback for ghost drags
            document.addEventListener('mousedown', () => { window.__ws_dragging = null; }, true);

            /* ── Pins Logic ───────────────────────────── */
            function loadPins() {
                try {
                    const saved = localStorage.getItem('ws_pins');
                    pins = saved ? JSON.parse(saved) : [
                        { name: 'Workspace Root', path: '', internal: true }
                    ];
                } catch (e) {
                    pins = [{ name: 'Workspace Root', path: '', internal: true }];
                }
                renderPins();
            }

            function savePins() {
                localStorage.setItem('ws_pins', JSON.stringify(pins));
                renderPins();
            }

            function renderPins() {
                const currentStr = currentPath.join('/');
                pinList.innerHTML = pins.map(p => `
                    <div class="ws-pin-item${currentStr === p.path ? ' active' : ''}" data-path="${p.path}">
                        <span class="ws-pin-icon">${p.internal ? '🏠' : '📌'}</span>
                        <span class="ws-pin-name" title="${p.path || 'Workspace Root'}">${p.name}</span>
                        ${!p.internal ? `<span class="ws-pin-remove" data-path="${p.path}">✕</span>` : ''}
                    </div>
                `).join('');

                pinList.querySelectorAll('.ws-pin-item').forEach(el => {
                    el.onclick = (e) => {
                        if (e.target.classList.contains('ws-pin-remove')) return;
                        const path = el.dataset.path;
                        if (path === '') currentPath = [];
                        else if (path.includes('/') || path.includes('\\')) {
                            currentPath = [path];
                        } else {
                            currentPath = [path];
                        }
                        loadFiles();
                    };

                    el.ondragenter = (e) => {
                        e.preventDefault(); e.stopPropagation();
                        if (el.dataset.path !== currentPath.join('/')) {
                            e.dataTransfer.dropEffect = 'move';
                            el.classList.add('drag-over');
                        }
                    };
                    el.ondragover = (e) => {
                        e.preventDefault(); e.stopPropagation();
                        if (el.dataset.path !== currentPath.join('/')) {
                            e.dataTransfer.dropEffect = 'move';
                            el.classList.add('drag-over');
                            window.__ws_hover_target = el.dataset.path || '';
                        }
                    };
                    el.ondragleave = (e) => {
                        e.stopPropagation();
                        el.classList.remove('drag-over');
                    };
                    el.ondrop = async (e) => {
                        e.preventDefault(); e.stopPropagation();
                        el.classList.remove('drag-over');
                        
                        let fromName = null;
                        let fromSubfolder = null;
                        
                        if (window.__ws_dragging) {
                            fromName = window.__ws_dragging.name;
                            fromSubfolder = window.__ws_dragging.fromSubfolder;
                            window.__ws_dragging = null;
                        } else {
                            fromName = e.dataTransfer.getData('text/plain');
                            fromSubfolder = currentPath.length > 0 ? currentPath.join('/') : null;
                        }
                        
                        const toSubfolder = el.dataset.path || null;
                        if (fromName && toSubfolder !== undefined) {
                            await moveItemCustom(fromName, fromSubfolder, toSubfolder);
                        }
                    };
                });

                pinList.querySelectorAll('.ws-pin-remove').forEach(el => {
                    el.onclick = (e) => {
                        e.stopPropagation();
                        pins = pins.filter(p => p.path !== el.dataset.path);
                        savePins();
                    };
                });
            }

            async function addCustomPin() {
                if (!window.__TAURI__) return;
                try {
                    const path = await window.__TAURI__.dialog.open({
                        directory: true,
                        multiple: false,
                        title: 'Select Folder to Pin'
                    });
                    
                    if (path) {
                        const name = path.split(/[\\/]/).pop() || path;
                        if (!pins.find(p => p.path === path)) {
                            pins.push({ name, path, internal: false });
                            savePins();
                        }
                    }
                } catch (e) {
                    const path = prompt('Enter absolute path (e.g. D:\\NAS\\Photos):');
                    if (path) {
                        const name = path.split(/[\\/]/).pop() || path;
                        pins.push({ name, path, internal: false });
                        savePins();
                    }
                }
            }

            /* ── Navigation ───────────────────────────── */
            async function loadFiles() {
                isAppData = currentPath[0] === 'App Data';
                backBtn.disabled = currentPath.length === 0;

                if (isAppData) {
                    loadAppData();
                    renderBreadcrumbs();
                    return;
                }

                if (!window.__TAURI__) {
                    fileList.innerHTML = `<div class="ws-empty">
                        <div class="ws-empty-icon">⚠️</div>
                        <div class="ws-empty-text">Native workspace requires Tauri runtime.</div>
                    </div>`;
                    return;
                }

                statusText.textContent = 'Loading…';
                try {
                    let subfolder = null;
                    if (currentPath.length > 0) {
                        const first = currentPath[0];
                        const isAbsolute = first.includes(':') || first.startsWith('/') || first.startsWith('\\\\');
                        if (isAbsolute) {
                            subfolder = currentPath.join('/');
                        } else {
                            subfolder = currentPath.join('/');
                        }
                    }

                    const info = await window.__TAURI__.invoke('workspace_info', { subfolder });
                    
                    currentFiles = info.files;
                    absoluteBasePath = info.path; 
                    
                    if (currentPath.length === 0) {
                        currentFiles.unshift({ name: 'App Data', is_dir: true, size: 0, virtual: true });
                    }

                    renderFiles();
                    renderBreadcrumbs();
                    renderPins();
                    statusText.textContent = 'Ready';
                    statusCount.textContent = `${currentFiles.length} item${currentFiles.length !== 1 ? 's' : ''}`;
                } catch (e) {
                    statusText.textContent = 'Error: ' + e;
                }
            }

            function loadAppData() {
                const data = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    const val = localStorage.getItem(key);
                    data.push({
                        name: key + '.json',
                        is_dir: false,
                        size: val.length,
                        virtual: true,
                        content: val
                    });
                }
                currentFiles = data;
                renderFiles();
                statusText.textContent = 'Viewing App Persistence (Local Storage)';
                statusCount.textContent = `${data.length} keys`;
            }

            function renderBreadcrumbs() {
                let html = `<span class="ws-breadcrumb ${currentPath.length === 0 ? 'active' : ''}" data-idx="-1">Workspace</span>`;
                
                currentPath.forEach((p, i) => {
                    let label = p;
                    if (i === 0 && (p.includes(':') || p.startsWith('/') || p.startsWith('\\\\'))) {
                        label = p.length > 20 ? '...' + p.slice(-17) : p;
                    }
                    html += `<span style="opacity: 0.3">/</span>`;
                    html += `<span class="ws-breadcrumb ${i === currentPath.length - 1 ? 'active' : ''}" data-idx="${i}" title="${p}">${label}</span>`;
                });
                
                pathBar.innerHTML = html;
                pathBar.querySelectorAll('.ws-breadcrumb').forEach(el => {
                    el.onclick = () => {
                        const idx = parseInt(el.dataset.idx);
                        if (idx === -1) currentPath = [];
                        else currentPath = currentPath.slice(0, idx + 1);
                        loadFiles();
                    };

                    el.ondragover = (e) => {
                        e.preventDefault(); e.stopPropagation();
                        e.dataTransfer.dropEffect = 'move';
                        el.classList.add('active');
                        
                        const idx = parseInt(el.dataset.idx);
                        const destPathArr = idx === -1 ? [] : currentPath.slice(0, idx + 1);
                        window.__ws_hover_target = destPathArr.length > 0 ? destPathArr.join('/') : '';
                    };
                    el.ondragleave = () => {
                        if (parseInt(el.dataset.idx) !== currentPath.length - 1) el.classList.remove('active');
                    };
                    el.ondrop = async (e) => {
                        e.preventDefault(); e.stopPropagation();
                        el.classList.remove('active');
                        
                        let fromName = null;
                        let fromSubfolder = null;
                        
                        if (window.__ws_dragging) {
                            fromName = window.__ws_dragging.name;
                            fromSubfolder = window.__ws_dragging.fromSubfolder;
                            window.__ws_dragging = null;
                        } else {
                            fromName = e.dataTransfer.getData('text/plain');
                            fromSubfolder = currentPath.length > 0 ? currentPath.join('/') : null;
                        }
                        
                        const idx = parseInt(el.dataset.idx);
                        const destPath = idx === -1 ? [] : currentPath.slice(0, idx + 1);
                        const destPathStr = destPath.length > 0 ? destPath.join('/') : null;
                        
                        if (fromName) {
                            await moveItemCustom(fromName, fromSubfolder, destPathStr);
                        }
                    };
                });
            }

            function renderFiles() {
                if (currentFiles.length === 0) {
                    fileList.innerHTML = `<div class="ws-empty">
                        <div class="ws-empty-icon">📂</div>
                        <div class="ws-empty-text">Folder is empty.</div>
                    </div>`;
                    return;
                }

                fileList.className = 'ws-file-list ' + viewMode;

                const sorted = [...currentFiles].sort((a, b) => {
                    if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1;
                    return a.name.localeCompare(b.name);
                });

                fileList.innerHTML = sorted.map(f => `
                    <div class="ws-file-item${selectedFile === f.name ? ' selected' : ''}" 
                         data-name="${f.name}" data-dir="${f.is_dir}" data-virtual="${!!f.virtual}">
                        <span class="ws-file-icon">${getFileIcon(f.name, f.is_dir)}</span>
                        <div class="ws-file-info">
                            <div class="ws-file-name">${f.name}</div>
                            <div class="ws-file-meta">${f.is_dir ? (f.virtual ? 'System' : 'Directory') : formatSize(f.size)}</div>
                        </div>
                    </div>
                `).join('');

                fileList.querySelectorAll('.ws-file-item').forEach(el => {
                    el.onclick = (e) => {
                        selectedFile = el.dataset.name;
                        renderFiles();
                        if (el.dataset.dir === 'false') {
                            const file = currentFiles.find(f => f.name === selectedFile);
                            if (file && file.virtual) showPreview(file.name, file.content);
                            else showPreview(file.name);
                        }
                    };
                    el.ondblclick = () => {
                        if (el.dataset.dir === 'true') {
                            currentPath.push(el.dataset.name);
                            loadFiles();
                        }
                    };
                    el.oncontextmenu = (e) => {
                        e.preventDefault();
                        selectedFile = el.dataset.name;
                        renderFiles();
                        showContextMenu(e.clientX, e.clientY, el.dataset.name, el.dataset.dir === 'true', el.dataset.virtual === 'true');
                    };

                    // Clean manual OS drag detection for native files/folders
                    if (el.dataset.virtual === 'false') {
                        let isDown = false, sX, sY;
                        
                        const onMove = (ev) => {
                            if (!isDown) return;
                            if (Math.hypot(ev.clientX - sX, ev.clientY - sY) > 8) {
                                isDown = false;
                                cleanup();
                                
                                const subfolder = currentPath.length > 0 ? currentPath.join('/') : null;
                                window.__ws_dragging = { 
                                    name: el.dataset.name, 
                                    fromSubfolder: subfolder 
                                };
                                
                                const isDir = el.dataset.dir === 'true';
                                initiateDragOut(el.dataset.name, subfolder, isDir);
                            }
                        };
                        const onUp = () => { isDown = false; cleanup(); };
                        const cleanup = () => {
                            window.removeEventListener('mousemove', onMove);
                            window.removeEventListener('mouseup', onUp);
                        };
                        
                        el.addEventListener('mousedown', (e) => {
                            if (e.button === 0) {
                                window.__ws_dragging = null; // Clear old artifacts on new interaction
                                isDown = true; sX = e.clientX; sY = e.clientY;
                                window.addEventListener('mousemove', onMove);
                                window.addEventListener('mouseup', onUp);
                            }
                        });
                        
                        // Disable standard dragstart to avoid HTML5 ghost image and conflicts
                        el.ondragstart = (e) => e.preventDefault();
                    }

                    // Native Drop Target logic for internal folders
                    if (el.dataset.dir === 'true' && el.dataset.virtual === 'false') {
                        el.ondragenter = (e) => {
                            e.preventDefault(); e.stopPropagation();
                            e.dataTransfer.dropEffect = 'move';
                            el.classList.add('drag-over');
                        };
                        el.ondragover = (e) => {
                            e.preventDefault(); e.stopPropagation();
                            e.dataTransfer.dropEffect = 'move';
                            el.classList.add('drag-over');
                            
                            const dest = currentPath.join('/') + (currentPath.length > 0 ? '/' : '') + el.dataset.name;
                            window.__ws_hover_target = dest;
                        };
                        el.ondragleave = (e) => {
                            e.stopPropagation();
                            el.classList.remove('drag-over');
                            window.__ws_hover_target = null;
                        };
                        el.ondrop = async (e) => {
                            e.preventDefault(); e.stopPropagation();
                            el.classList.remove('drag-over');
                            
                            let fromName = null;
                            let fromSubfolder = null;
                            
                            console.log('Drop event fired on directory:', el.dataset.name);
                            console.log('window.__ws_dragging:', window.__ws_dragging);
                            
                            // Capture our custom OS drag object natively
                            if (window.__ws_dragging) {
                                fromName = window.__ws_dragging.name;
                                fromSubfolder = window.__ws_dragging.fromSubfolder;
                                window.__ws_dragging = null; // consume it
                            } else {
                                fromName = e.dataTransfer.getData('text/plain');
                                fromSubfolder = currentPath.length > 0 ? currentPath.join('/') : null;
                                console.log('Using dataTransfer text:', fromName);
                            }
                            
                            console.log('Resolved drop: fromName=', fromName, 'fromSubfolder=', fromSubfolder);
                            
                            if (fromName && fromName !== el.dataset.name) {
                                const dest = currentPath.join('/') + (currentPath.length > 0 ? '/' : '') + el.dataset.name;
                                console.log('Calling moveItemCustom to dest:', dest);
                                await moveItemCustom(fromName, fromSubfolder, dest);
                            } else {
                                console.log('Ignored drop: fromName is empty or same as target');
                            }
                        };
                    }
                });

                // Global dragover fallback
                const wsRoot = container.querySelector('.ws-root');
                if (wsRoot) {
                    wsRoot.ondragover = (e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                    };
                }
            }

            /* ── Actions ──────────────────────────────── */
            async function moveItemCustom(name, fromSubfolder, toSubfolder) {
                try {
                    console.log('moveItemCustom called:', { name, fromSubfolder, toSubfolder });
                    const fromStr = fromSubfolder || '';
                    const toStr = toSubfolder || '';
                    if (fromStr === toStr) {
                        console.log('moveItemCustom aborted: fromStr === toStr', fromStr);
                        return; // Prevent loop
                    }
                    
                    statusText.textContent = `Moving ${name}...`;
                    console.log('Invoking workspace_move backend command');
                    await window.__TAURI__.invoke('workspace_move', {
                        req: { from_name: name, from_subfolder: fromSubfolder, to_subfolder: toSubfolder }
                    });
                    console.log('workspace_move succeeded. Reloading files...');
                    loadFiles();
                } catch (e) {
                    console.error('Move failed in backend:', e);
                    alert('Move failed: ' + e);
                    loadFiles();
                }
            }

            async function showPreview(name, content) {
                previewTitle.textContent = name;
                previewPanel.classList.add('open');
                
                if (content !== undefined) {
                    previewContent.textContent = content;
                    return;
                }

                previewContent.textContent = 'Reading…';
                try {
                    const subfolder = currentPath.length > 0 ? currentPath.join('/') : null;
                    const res = await window.__TAURI__.invoke('workspace_read', {
                        req: { filename: name, subfolder }
                    });
                    if (res.success) previewContent.textContent = res.content;
                    else previewContent.textContent = 'Error: ' + res.error;
                } catch (e) {
                    previewContent.textContent = 'Error: ' + e;
                }
            }

            function showContextMenu(x, y, name, isDir, isVirtual) {
                const oldMenu = document.querySelector('.context-menu');
                if (oldMenu) oldMenu.remove();

                const menu = document.createElement('div');
                menu.className = 'context-menu';
                menu.style.left = x + 'px';
                menu.style.top = y + 'px';

                let items = [];
                if (isDir) {
                    items.push({ icon: '📂', text: 'Open', action: () => { currentPath.push(name); loadFiles(); } });
                    if (!isVirtual) {
                        const fullPath = currentPath.join('/') + (currentPath.length > 0 ? '/' : '') + name;
                        items.push({ icon: '📌', text: 'Pin to Quick Access', action: () => {
                            if (!pins.find(p => p.path === fullPath)) {
                                pins.push({ name, path: fullPath, internal: false });
                                savePins();
                            }
                        }});
                    }
                } else {
                    items.push({ icon: '👁️', text: 'Preview', action: () => showPreview(name) });
                    items.push({ icon: '📝', text: 'Open in Notepad', action: () => openInTool('notepad', name) });
                    if (name.endsWith('.py')) {
                        items.push({ icon: '🐍', text: 'Open in Python', action: () => openInTool('python-interp', name) });
                    }
                    items.push({ type: 'sep' });
                }

                if (!isVirtual) {
                    items.push({ icon: '🗑️', text: 'Delete', danger: true, action: () => deleteItem(name) });
                }

                menu.innerHTML = items.map(it => {
                    if (it.type === 'sep') return '<div class="menu-sep"></div>';
                    return `<div class="menu-item ${it.danger ? 'danger' : ''}" data-act="ctx">
                        <span class="menu-icon">${it.icon}</span>
                        <span>${it.text}</span>
                    </div>`;
                }).join('');

                document.body.appendChild(menu);

                menu.querySelectorAll('.menu-item').forEach((el, i) => {
                    el.onclick = () => {
                        const item = items.filter(it => it.type !== 'sep')[i];
                        if (item && item.action) item.action();
                        menu.remove();
                    };
                });

                const close = (e) => { if (!menu.contains(e.target)) menu.remove(); document.removeEventListener('mousedown', close); };
                setTimeout(() => document.addEventListener('mousedown', close), 10);
            }

            async function openInTool(toolId, filename) {
                const subfolder = currentPath.length > 0 ? currentPath.join('/') : null;
                try {
                    const res = await window.__TAURI__.invoke('workspace_read', { req: { filename, subfolder } });
                    if (res.success) {
                        const msg = { type: 'open', filename, content: res.content, subfolder };
                        if (!App.wm.sendToTool(toolId, msg)) {
                            App.openTool(toolId);
                            setTimeout(() => App.wm.sendToTool(toolId, msg), 500);
                        }
                    }
                } catch {}
            }


            async function deleteItem(name) {
                if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
                try {
                    const subfolder = currentPath.length > 0 ? currentPath.join('/') : null;
                    await window.__TAURI__.invoke('workspace_delete', { filename: name, subfolder });
                    loadFiles();
                } catch (e) { alert('Delete failed: ' + e); }
            }

            async function createFile() {
                const name = prompt('File name:');
                if (!name) return;
                try {
                    const subfolder = currentPath.length > 0 ? currentPath.join('/') : null;
                    await window.__TAURI__.invoke('workspace_write', {
                        req: { filename: name, content: '', subfolder }
                    });
                    loadFiles();
                } catch (e) { alert('Failed: ' + e); }
            }

            async function createFolder() {
                const name = prompt('Folder name:');
                if (!name) return;
                try {
                    const parent = currentPath.length > 0 ? currentPath.join('/') + '/' : '';
                    await window.__TAURI__.invoke('workspace_create_dir', { subfolder: parent + name });
                    loadFiles();
                } catch (e) { alert('Failed: ' + e); }
            }
            
            async function initiateDragOut(filename, subfolder, isDir) {
                try {
                    console.log('Initiating native OS drag for:', filename, subfolder);
                    statusText.textContent = 'Dragging…';
                    
                    const res = await window.__TAURI__.invoke('drag_file', { filename, subfolder, isDir });
                    statusText.textContent = 'Ready';
                    
                    // If the OS says the drag was cancelled, we don't move anything
                    if (!res || !res.dropped) return;
                    
                    // We must convert physical screen coordinates to logical viewport coordinates
                    const winPos = await window.__TAURI__.window.appWindow.innerPosition();
                    const scale = await window.__TAURI__.window.appWindow.scaleFactor();
                    
                    // Convert screen pixels -> logical window pixels -> viewport CSS pixels
                    const clientX = (res.x / scale) - (winPos.x / scale);
                    const clientY = (res.y / scale) - (winPos.y / scale);
                    
                    console.log(`Drop detected at screen(${res.x}, ${res.y}) -> viewport(${clientX}, ${clientY})`);
                    
                    const el = document.elementFromPoint(clientX, clientY);
                    if (!el) return;
                    
                    // 1. Check if dropped on a directory in the main view
                    const dirEl = el.closest('[data-dir="true"]');
                    if (dirEl && dirEl.dataset.name !== filename) {
                        const dest = currentPath.join('/') + (currentPath.length > 0 ? '/' : '') + dirEl.dataset.name;
                        console.log('Math confirmed drop on directory:', dest);
                        await moveItemCustom(filename, subfolder, dest);
                        return;
                    }
                    
                    // 2. Check if dropped on a pinned folder in the sidebar
                    const pinEl = el.closest('.ws-pin-item');
                    if (pinEl) {
                        const dest = pinEl.dataset.path || null;
                        if (dest !== subfolder) {
                            console.log('Math confirmed drop on pin:', dest);
                            await moveItemCustom(filename, subfolder, dest);
                        }
                        return;
                    }
                    
                    // 3. Check if dropped on a breadcrumb segment
                    const crumbEl = el.closest('.ws-breadcrumb');
                    if (crumbEl) {
                        const idx = parseInt(crumbEl.dataset.idx);
                        const destPathArr = idx === -1 ? [] : currentPath.slice(0, idx + 1);
                        const destPathStr = destPathArr.length > 0 ? destPathArr.join('/') : null;
                        if (destPathStr !== subfolder) {
                            console.log('Math confirmed drop on breadcrumb:', destPathStr);
                            await moveItemCustom(filename, subfolder, destPathStr);
                        }
                        return;
                    }
                } catch (e) {
                    console.error('Drag error:', e);
                    statusText.textContent = `Drag failed: ${e}`;
                    setTimeout(() => statusText.textContent = 'Ready', 5000);
                }
            }

            /* ── Global Events ────────────────────────── */
            container.querySelector('#ws-refresh').onclick = loadFiles;
            container.querySelector('#ws-back').onclick = () => { currentPath.pop(); loadFiles(); };
            container.querySelector('#ws-new-file').onclick = createFile;
            container.querySelector('#ws-new-folder').onclick = createFolder;
            container.querySelector('#ws-preview-close').onclick = () => previewPanel.classList.remove('open');
            addPinBtn.onclick = addCustomPin;

            // View Toggles
            btnListView.onclick = () => {
                viewMode = 'list';
                btnListView.classList.add('active');
                btnTilesView.classList.remove('active');
                btnGridView.classList.remove('active');
                renderFiles();
            };
            btnTilesView.onclick = () => {
                viewMode = 'tiles';
                btnTilesView.classList.add('active');
                btnListView.classList.remove('active');
                btnGridView.classList.remove('active');
                renderFiles();
            };
            btnGridView.onclick = () => {
                viewMode = 'grid';
                btnGridView.classList.add('active');
                btnListView.classList.remove('active');
                btnTilesView.classList.remove('active');
                renderFiles();
            };
            
            openPrevBtn.onclick = () => {
                if (selectedFile) {
                    const ext = selectedFile.split('.').pop().toLowerCase();
                    if (ext === 'py') openInTool('python-interp', selectedFile);
                    else openInTool('notepad', selectedFile);
                }
            };

            loadPins();
            loadFiles();
        }
    });
})();