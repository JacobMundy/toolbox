/* ═══════════════════════════════════════════════════════════
   WindowManager — draggable, resizable, snappable windows
   ═══════════════════════════════════════════════════════════ */
class WindowManager {
    constructor(desktopEl, taskbarEl) {
        this.desktop  = desktopEl;
        this.taskbar  = taskbarEl;
        this.windows  = new Map();        // windowId → data
        this.activeId = null;
        this.zIndex   = 100;
        this.counter  = 0;
        this.snapPreview = document.getElementById('snap-preview');
        this.SNAP_EDGE = 18;             // px from edge to trigger snap
        this._boundKeyDown = this._onGlobalKey.bind(this);
        document.addEventListener('keydown', this._boundKeyDown);
    }

    /* ── public API ─────────────────────────────────────── */

    createWindow(opts) {
        const id = `win-${++this.counter}`;
        const cascade = (this.windows.size % 8) * 32;
        const saved = this._loadPos(opts.toolId || id);
        const w = saved?.w || opts.width  || opts.defaultWidth  || 620;
        const h = saved?.h || opts.height || opts.defaultHeight || 480;
        const x = saved?.x ?? (70 + cascade);
        const y = saved?.y ?? (30 + cascade);

        const el = document.createElement('div');
        el.className = 'window active';
        el.id = id;
        el.style.cssText = `width:${w}px;height:${h}px;left:${x}px;top:${y}px;z-index:${this.zIndex++}`;
        if (opts.minWidth)  el.style.minWidth  = opts.minWidth  + 'px';
        if (opts.minHeight) el.style.minHeight = opts.minHeight + 'px';

        el.innerHTML = `
            <div class="window-titlebar">
                <div class="window-title">
                    <span class="window-icon">${opts.icon || '📄'}</span>
                    <span class="window-title-text">${opts.title || 'Window'}</span>
                </div>
                <div class="window-controls">
                    <button class="window-btn window-minimize" title="Minimize">─</button>
                    <button class="window-btn window-maximize" title="Maximize">☐</button>
                    <button class="window-btn window-close" title="Close">✕</button>
                </div>
            </div>
            <div class="window-content"></div>
            <div class="window-resize-handle resize-n"></div>
            <div class="window-resize-handle resize-s"></div>
            <div class="window-resize-handle resize-e"></div>
            <div class="window-resize-handle resize-w"></div>
            <div class="window-resize-handle resize-ne"></div>
            <div class="window-resize-handle resize-nw"></div>
            <div class="window-resize-handle resize-se"></div>
            <div class="window-resize-handle resize-sw"></div>`;

        const data = {
            id, el,
            contentEl: el.querySelector('.window-content'),
            opts,
            state: 'normal',      // normal | minimized | maximized | snapped
            prevBounds: null,
            cleanup: null,
        };

        this.windows.set(id, data);
        this.desktop.appendChild(el);

        this._setupDrag(data);
        this._setupResize(data);
        this._setupControls(data);
        el.addEventListener('mousedown', () => this.bringToFront(id));

        const result = opts.createUI ? opts.createUI(data.contentEl, id) : null;
        if (typeof result === 'function') {
            data.cleanup = result;
        } else if (result && typeof result === 'object') {
            data.cleanup = result.cleanup;
            data.onMessage = result.onMessage;
        }


        this._addTaskbarItem(data);
        this.bringToFront(id);
        this._updateWelcome();
        return id;
    }

    closeWindow(id) {
        const d = this.windows.get(id);
        if (!d) return;
        this._savePos(d);
        if (typeof d.cleanup === 'function') d.cleanup();
        d.el.remove();
        this.windows.delete(id);
        this._removeTaskbarItem(id);
        if (this.activeId === id) {
            this.activeId = null;
            // activate topmost
            let top = null;
            this.windows.forEach(w => {
                if (w.state !== 'minimized' && (!top || parseInt(w.el.style.zIndex) > parseInt(top.el.style.zIndex)))
                    top = w;
            });
            if (top) this.bringToFront(top.id);
        }
        this._updateWelcome();
    }

    minimizeWindow(id) {
        const d = this.windows.get(id);
        if (!d || d.state === 'minimized') return;
        d.state = 'minimized';
        d.el.classList.add('minimized');
        d.el.classList.remove('active');
        this._updateTaskbar();
        // activate next
        if (this.activeId === id) {
            this.activeId = null;
            let top = null;
            this.windows.forEach(w => {
                if (w.state !== 'minimized' && (!top || parseInt(w.el.style.zIndex) > parseInt(top.el.style.zIndex)))
                    top = w;
            });
            if (top) this.bringToFront(top.id);
        }
    }

    restoreWindow(id) {
        const d = this.windows.get(id);
        if (!d) return;
        if (d.state === 'minimized') {
            d.state = 'normal';
            d.el.classList.remove('minimized');
        }
        this.bringToFront(id);
    }

    maximizeWindow(id) {
        const d = this.windows.get(id);
        if (!d) return;
        if (d.state === 'maximized') {
            this._restoreFromMaximize(d);
            return;
        }
        d.prevBounds = this._getBounds(d);
        d.state = 'maximized';
        d.el.classList.add('animating');
        const dr = this.desktop.getBoundingClientRect();
        this._setBounds(d, 0, 0, dr.width, dr.height);
        setTimeout(() => d.el.classList.remove('animating'), 280);
        this._updateTaskbar();
    }

    bringToFront(id) {
        const d = this.windows.get(id);
        if (!d) return;
        if (this.activeId && this.activeId !== id) {
            const prev = this.windows.get(this.activeId);
            if (prev) prev.el.classList.remove('active');
        }
        d.el.style.zIndex = this.zIndex++;
        d.el.classList.add('active');
        this.activeId = id;
        this._updateTaskbar();
    }

    findByToolId(toolId) {
        for (const [, d] of this.windows) {
            if (d.opts.toolId === toolId) return d;
        }
        return null;
    }

    sendToTool(toolId, msg) {
        const d = this.findByToolId(toolId);
        if (d && d.onMessage) {
            d.onMessage(msg);
            this.bringToFront(d.id);
            if (d.state === 'minimized') this.restoreWindow(d.id);
            return true;
        }
        return false;
    }


    tileWindows() {
        const visible = [];
        this.windows.forEach(d => { if (d.state !== 'minimized') visible.push(d); });
        if (visible.length === 0) return;

        const dr = this.desktop.getBoundingClientRect();
        const cols = Math.ceil(Math.sqrt(visible.length));
        const rows = Math.ceil(visible.length / cols);
        const gap = 6;
        const cw = (dr.width  - gap * (cols + 1)) / cols;
        const ch = (dr.height - gap * (rows + 1)) / rows;

        visible.forEach((d, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            d.el.classList.add('animating');
            d.state = 'normal';
            d.prevBounds = null;
            this._setBounds(d,
                gap + col * (cw + gap),
                gap + row * (ch + gap),
                cw, ch
            );
            setTimeout(() => d.el.classList.remove('animating'), 280);
        });
    }

    /* ── private helpers ────────────────────────────────── */

    _restoreFromMaximize(d) {
        if (d.prevBounds) {
            d.el.classList.add('animating');
            this._setBounds(d, d.prevBounds.x, d.prevBounds.y, d.prevBounds.w, d.prevBounds.h);
            setTimeout(() => d.el.classList.remove('animating'), 280);
        }
        d.state = 'normal';
        d.prevBounds = null;
        this._updateTaskbar();
    }

    _getBounds(d) {
        return {
            x: parseInt(d.el.style.left)  || 0,
            y: parseInt(d.el.style.top)   || 0,
            w: d.el.offsetWidth,
            h: d.el.offsetHeight,
        };
    }

    _setBounds(d, x, y, w, h) {
        d.el.style.left   = x + 'px';
        d.el.style.top    = y + 'px';
        d.el.style.width  = w + 'px';
        d.el.style.height = h + 'px';
    }

    /* drag ------------------------------------------------ */
    _setupDrag(d) {
        const titlebar = d.el.querySelector('.window-titlebar');
        titlebar.addEventListener('mousedown', e => {
            if (e.target.closest('.window-controls')) return;
            e.preventDefault();

            // If maximized, pop out at proportional position
            if (d.state === 'maximized' || d.state === 'snapped') {
                const bounds = d.prevBounds || { w: d.opts.defaultWidth || 620, h: d.opts.defaultHeight || 480 };
                const pct = e.clientX / this.desktop.getBoundingClientRect().width;
                d.el.classList.remove('animating');
                d.el.style.width  = bounds.w + 'px';
                d.el.style.height = bounds.h + 'px';
                d.el.style.left = (e.clientX - bounds.w * pct) + 'px';
                d.el.style.top  = (e.clientY - this.desktop.getBoundingClientRect().top - 18) + 'px';
                d.state = 'normal';
                d.prevBounds = null;
            }

            const rect = d.el.getBoundingClientRect();
            const dRect = this.desktop.getBoundingClientRect();
            const offX = e.clientX - rect.left;
            const offY = e.clientY - rect.top;

            const onMove = ev => {
                const nx = ev.clientX - dRect.left - offX;
                const ny = ev.clientY - dRect.top  - offY;
                d.el.style.left = nx + 'px';
                d.el.style.top  = ny + 'px';
                this._showSnap(ev.clientX, ev.clientY);
            };
            const onUp = ev => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                document.body.style.userSelect = '';
                const zone = this._getSnapZone(ev.clientX, ev.clientY);
                this.snapPreview.style.display = 'none';
                if (zone) this._applySnap(d, zone);
                this._savePos(d);
            };
            document.body.style.userSelect = 'none';
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });

        /* double-click title ⇒ maximize toggle */
        titlebar.addEventListener('dblclick', e => {
            if (e.target.closest('.window-controls')) return;
            this.maximizeWindow(d.id);
        });
    }

    /* resize ---------------------------------------------- */
    _setupResize(d) {
        d.el.querySelectorAll('.window-resize-handle').forEach(handle => {
            handle.addEventListener('mousedown', e => {
                e.preventDefault();
                e.stopPropagation();
                const dir = [...handle.classList].find(c => c.startsWith('resize-')).replace('resize-', '');
                const startX = e.clientX, startY = e.clientY;
                const sb = this._getBounds(d);
                const minW = parseInt(d.el.style.minWidth)  || 280;
                const minH = parseInt(d.el.style.minHeight) || 180;

                const onMove = ev => {
                    const dx = ev.clientX - startX;
                    const dy = ev.clientY - startY;
                    let { x, y, w, h } = sb;

                    if (dir.includes('e')) w = Math.max(sb.w + dx, minW);
                    if (dir.includes('s')) h = Math.max(sb.h + dy, minH);
                    if (dir.includes('w')) {
                        const pw = sb.w - dx;
                        if (pw >= minW) { w = pw; x = sb.x + dx; }
                    }
                    if (dir.includes('n')) {
                        const ph = sb.h - dy;
                        if (ph >= minH) { h = ph; y = sb.y + dy; }
                    }
                    this._setBounds(d, x, y, w, h);
                };
                const onUp = () => {
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                    document.body.style.userSelect = '';
                    this._savePos(d);
                };
                document.body.style.userSelect = 'none';
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            });
        });
    }

    /* snap ------------------------------------------------ */
    _getSnapZone(mx, my) {
        const r = this.desktop.getBoundingClientRect();
        const rx = mx - r.left, ry = my - r.top;
        const T = this.SNAP_EDGE;
        const W = r.width, H = r.height;

        if (rx <= T && ry <= T)        return 'tl';
        if (rx >= W - T && ry <= T)    return 'tr';
        if (rx <= T && ry >= H - T)    return 'bl';
        if (rx >= W - T && ry >= H - T) return 'br';
        if (rx <= T)      return 'left';
        if (rx >= W - T)  return 'right';
        if (ry <= T)      return 'top';
        return null;
    }

    _showSnap(mx, my) {
        const zone = this._getSnapZone(mx, my);
        const sp = this.snapPreview;
        if (!zone) { sp.style.display = 'none'; return; }
        const map = {
            left:  'left:0;top:0;width:50%;height:100%',
            right: 'left:50%;top:0;width:50%;height:100%',
            top:   'left:0;top:0;width:100%;height:100%',
            tl:    'left:0;top:0;width:50%;height:50%',
            tr:    'left:50%;top:0;width:50%;height:50%',
            bl:    'left:0;top:50%;width:50%;height:50%',
            br:    'left:50%;top:50%;width:50%;height:50%',
        };
        sp.style.cssText = 'display:block;' + map[zone];
    }

    _applySnap(d, zone) {
        d.prevBounds = this._getBounds(d);
        d.state = 'snapped';
        const r = this.desktop.getBoundingClientRect();
        const W = r.width, H = r.height;
        const map = {
            left:  [0, 0, W/2, H],
            right: [W/2, 0, W/2, H],
            top:   [0, 0, W, H],
            tl:    [0, 0, W/2, H/2],
            tr:    [W/2, 0, W/2, H/2],
            bl:    [0, H/2, W/2, H/2],
            br:    [W/2, H/2, W/2, H/2],
        };
        if (zone === 'top') d.state = 'maximized';
        d.el.classList.add('animating');
        this._setBounds(d, ...map[zone]);
        setTimeout(() => d.el.classList.remove('animating'), 280);
    }

    /* controls -------------------------------------------- */
    _setupControls(d) {
        d.el.querySelector('.window-minimize').addEventListener('click', e => { e.stopPropagation(); this.minimizeWindow(d.id); });
        d.el.querySelector('.window-maximize').addEventListener('click', e => { e.stopPropagation(); this.maximizeWindow(d.id); });
        d.el.querySelector('.window-close').addEventListener('click',    e => { e.stopPropagation(); this.closeWindow(d.id); });
    }

    /* taskbar --------------------------------------------- */
    _addTaskbarItem(d) {
        const btn = document.createElement('button');
        btn.className = 'taskbar-item';
        btn.id = 'tb-' + d.id;
        btn.innerHTML = `<span class="taskbar-item-icon">${d.opts.icon || '📄'}</span>${d.opts.title || 'Window'}`;
        btn.addEventListener('click', () => {
            if (d.state === 'minimized') { this.restoreWindow(d.id); }
            else if (this.activeId === d.id) { this.minimizeWindow(d.id); }
            else { this.bringToFront(d.id); }
        });
        this.taskbar.appendChild(btn);
        this._updateTaskbar();
    }

    _removeTaskbarItem(id) {
        const el = document.getElementById('tb-' + id);
        if (el) el.remove();
        this._updateTaskbar();
    }

    _updateTaskbar() {
        this.windows.forEach(d => {
            const tb = document.getElementById('tb-' + d.id);
            if (tb) tb.classList.toggle('active', d.id === this.activeId && d.state !== 'minimized');
        });
    }

    /* welcome screen -------------------------------------- */
    _updateWelcome() {
        const ws = document.getElementById('welcome-screen');
        if (!ws) return;
        let hasVisible = false;
        this.windows.forEach(d => { if (d.state !== 'minimized') hasVisible = true; });
        // Only hide if there's at least one visible window
        ws.classList.toggle('hidden', this.windows.size > 0);
    }

    /* persistence ----------------------------------------- */
    _savePos(d) {
        const key = 'wm_pos_' + (d.opts.toolId || d.id);
        const b = this._getBounds(d);
        try { localStorage.setItem(key, JSON.stringify(b)); } catch {}
    }
    _loadPos(toolId) {
        try {
            const raw = localStorage.getItem('wm_pos_' + toolId);
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    }

    /* keyboard -------------------------------------------- */
    _onGlobalKey(e) {
        // Ctrl+W on active window = close
        // (not implemented to avoid browser conflict)
    }
}
