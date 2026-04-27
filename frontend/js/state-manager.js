/* ═══════════════════════════════════════════════════════════
   ToolboxState — Centralized state persistence & export/import
   
   Provides a unified API for tools to persist state, plus
   full export/import of all toolbox data for backup.
   ═══════════════════════════════════════════════════════════ */
const ToolboxState = {
    PREFIX: 'toolbox_',
    STATE_FILENAME: 'global_state.json',
    STATE_SUBFOLDER: '.toolbox',
    
    _cache: {},
    _isSyncing: false,

    /** Initialize state - load from disk if in Tauri, else localStorage */
    async init() {
        // 1. Try to load from disk if in Tauri
        if (window.__TAURI__) {
            const filesToTry = [this.STATE_FILENAME, 'auto-backup.json'];
            
            for (const filename of filesToTry) {
                try {
                    const res = await window.__TAURI__.invoke('workspace_read', {
                        req: {
                            filename: filename,
                            subfolder: this.STATE_SUBFOLDER
                        }
                    });
                    
                    if (res.success && res.content && res.content.trim().length > 0) {
                        const diskData = JSON.parse(res.content);
                        if (diskData && diskData.data) {
                            this._cache = diskData.data;
                            // Merge disk data into localStorage for redundancy/fallback
                            for (const [k, v] of Object.entries(this._cache)) {
                                try { localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); } catch {}
                            }
                            console.log(`ToolboxState: Loaded from ${filename}`);
                            return;
                        }
                    }
                } catch (e) {
                    console.warn(`ToolboxState: Failed to load ${filename}:`, e);
                }
            }
        }

        // 2. Fallback to localStorage
        this._cache = {};
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith(this.PREFIX) || k.startsWith('wm_pos_') || k.startsWith('desktop_pos_'))) {
                try { this._cache[k] = JSON.parse(localStorage.getItem(k)); }
                catch { this._cache[k] = localStorage.getItem(k); }
            }
        }
        console.log('ToolboxState: Loaded from localStorage');
    },

    /** Save state to disk (debounced) */
    async sync() {
        if (this._isSyncing) return;
        this._isSyncing = true;

        if (window.__TAURI__) {
            try {
                const snapshot = {
                    version: 1,
                    timestamp: new Date().toISOString(),
                    data: this._cache
                };
                await window.__TAURI__.invoke('workspace_write', {
                    req: {
                        filename: this.STATE_FILENAME,
                        content: JSON.stringify(snapshot, null, 2),
                        subfolder: this.STATE_SUBFOLDER,
                    }
                });
            } catch (e) {
                console.error('ToolboxState: Sync to disk failed', e);
            }
        }
        this._isSyncing = false;
    },

    /** Save a value under a namespaced key */
    set(key, value) {
        const fullKey = this.PREFIX + key;
        this._cache[fullKey] = value;
        try {
            localStorage.setItem(fullKey, JSON.stringify(value));
        } catch (e) {
            console.warn('ToolboxState.set failed:', key, e);
        }
        this.sync(); // Trigger async sync
    },

    /** Load a value (returns fallback if missing/corrupt) */
    get(key, fallback = null) {
        const fullKey = this.PREFIX + key;
        if (this._cache[fullKey] !== undefined) return this._cache[fullKey];
        
        // Fallback to localStorage if cache miss (shouldn't happen after init)
        try {
            const raw = localStorage.getItem(fullKey);
            return raw !== null ? JSON.parse(raw) : fallback;
        } catch {
            return fallback;
        }
    },

    /** Remove a key */
    remove(key) {
        const fullKey = this.PREFIX + key;
        delete this._cache[fullKey];
        try { localStorage.removeItem(fullKey); } catch {}
        this.sync();
    },

    /** Export ALL cached keys as a single JSON object */
    exportAll() {
        return {
            version: 1,
            timestamp: new Date().toISOString(),
            data: { ...this._cache },
        };
    },

    /** Import a previously exported snapshot */
    async importAll(snapshot) {
        if (!snapshot || !snapshot.data) throw new Error('Invalid snapshot format');
        this._cache = { ...snapshot.data };
        
        // Update localStorage
        for (const [k, v] of Object.entries(this._cache)) {
            try {
                localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
            } catch (e) {
                console.warn('Import failed for key:', k, e);
            }
        }
        await this.sync();
    },

    /** Download the full export as a JSON file */
    downloadExport() {
        const snapshot = this.exportAll();
        const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `toolbox-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
    },

    /** Prompt user for a file and import it */
    promptImport() {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = async () => {
                const file = input.files[0];
                if (!file) return reject(new Error('No file selected'));
                try {
                    const text = await file.text();
                    const snapshot = JSON.parse(text);
                    await this.importAll(snapshot);
                    resolve(snapshot);
                } catch (e) {
                    reject(e);
                }
            };
            input.click();
        });
    },

    /** Auto-save on window close */
    setupAutoSave() {
        window.addEventListener('beforeunload', () => {
            this.sync(); // Final attempt
        });
    },
};
