/* ═══════════════════════════════════════════════════════════
   WidgetManager — Desktop Widgets (Analog/Digital Clock & Sticky Notes)
   ═══════════════════════════════════════════════════════════ */
(function () {
    const STYLE = document.createElement('style');
    STYLE.textContent = `
/* Widget Container */
.desktop-widget {
    position: absolute;
    z-index: 5;
    user-select: none;
    box-sizing: border-box;
}

/* Clock Widget */
.widget-clock {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 12px;
    border-radius: var(--r-md);
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    box-shadow: var(--shadow-md);
    width: 170px;
    height: 170px;
    transition: border-color 0.2s, box-shadow 0.2s;
    cursor: move;
}
.widget-clock:hover {
    border-color: rgba(var(--accent-rgb), 0.3);
    box-shadow: var(--shadow-lg), 0 0 10px rgba(var(--accent-rgb), 0.1);
}
.widget-clock-digital {
    font-family: 'JetBrains Mono', monospace;
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    margin-top: 8px;
    letter-spacing: -0.02em;
}
.widget-clock-date {
    font-size: 10px;
    color: var(--text-muted);
    margin-top: 2px;
}

/* Sticky Note Widget */
.widget-sticky {
    display: flex;
    flex-direction: column;
    border-radius: var(--r-md);
    box-shadow: var(--shadow-md);
    border: 1px solid var(--glass-border);
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    overflow: hidden;
    min-width: 140px;
    min-height: 140px;
    resize: both;
    transition: border-color 0.2s, box-shadow 0.2s;
}
.widget-sticky:hover {
    border-color: rgba(var(--accent-rgb), 0.3);
    box-shadow: var(--shadow-lg), 0 0 10px rgba(var(--accent-rgb), 0.1);
}
.widget-sticky-header {
    height: 24px;
    padding: 0 8px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(255, 255, 255, 0.03);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    cursor: move;
    font-size: 9px;
    color: var(--text-muted);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    flex-shrink: 0;
}
.widget-sticky-textarea {
    flex: 1;
    border: none;
    background: transparent;
    color: var(--text-primary);
    padding: 10px;
    resize: none;
    outline: none;
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    line-height: 1.4;
    box-sizing: border-box;
}

/* Sticky Note Themes */
.widget-sticky.theme-glass {
    background: var(--glass-bg);
}
.widget-sticky.theme-yellow {
    background: rgba(253, 224, 71, 0.12);
    border-color: rgba(253, 224, 71, 0.25);
}
.widget-sticky.theme-pink {
    background: rgba(244, 114, 182, 0.12);
    border-color: rgba(244, 114, 182, 0.25);
}
.widget-sticky.theme-blue {
    background: rgba(96, 165, 250, 0.12);
    border-color: rgba(96, 165, 250, 0.25);
}
.widget-sticky.theme-green {
    background: rgba(74, 222, 128, 0.12);
    border-color: rgba(74, 222, 128, 0.25);
}

/* Custom Context Menu */
.desktop-ctx-menu {
    position: fixed;
    z-index: 20000;
    background: rgba(15, 15, 35, 0.85);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--glass-border);
    border-radius: var(--r-md);
    padding: 4px;
    box-shadow: var(--shadow-lg);
    display: flex;
    flex-direction: column;
    min-width: 150px;
    font-family: 'Inter', sans-serif;
}
.desktop-ctx-item {
    padding: 6px 12px;
    font-size: 12px;
    color: var(--text-primary);
    cursor: pointer;
    border-radius: var(--r-sm);
    display: flex;
    align-items: center;
    gap: 8px;
    transition: background 0.1s;
}
.desktop-ctx-item:hover {
    background: var(--accent-dim);
    color: var(--accent-hover);
}
.desktop-ctx-separator {
    height: 1px;
    background: var(--glass-border);
    margin: 4px;
}
`;
    document.head.appendChild(STYLE);

    const LS_KEY = 'desktop_widgets';

    const WidgetManager = {
        widgets: [],
        clockInterval: null,
        activeCtxMenu: null,

        init() {
            // Close context menu on left click
            document.addEventListener('click', () => this.closeContextMenu());
            
            // Intercept right click on desktop
            const desktop = document.getElementById('desktop');
            if (desktop) {
                desktop.addEventListener('contextmenu', (e) => {
                    // If right clicked inside window, let it pass
                    if (e.target.closest('.window') || e.target.closest('input') || e.target.closest('textarea')) {
                        return;
                    }
                    e.preventDefault();
                    this.showDesktopContextMenu(e.clientX, e.clientY);
                });
            }

            // Load saved widgets
            this.loadWidgets();
            this.updateClockPacing();
        },

        loadWidgets() {
            try {
                const saved = localStorage.getItem(LS_KEY);
                if (saved) {
                    const list = JSON.parse(saved);
                    list.forEach(cfg => {
                        this.createWidgetDOM(cfg);
                    });
                }
            } catch (e) {
                console.error('Failed to load desktop widgets:', e);
            }
        },

        saveWidgets() {
            try {
                localStorage.setItem(LS_KEY, JSON.stringify(this.widgets));
            } catch (e) {
                console.error('Failed to save desktop widgets:', e);
            }
        },

        addWidget(type, x, y) {
            const id = 'widget_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
            const cfg = {
                id,
                type,
                x,
                y,
                ...(type === 'clock' ? { style: 'both' } : { w: 180, h: 180, text: '', theme: 'glass' })
            };
            this.widgets.push(cfg);
            this.createWidgetDOM(cfg);
            this.saveWidgets();
            this.updateClockPacing();
        },

        removeWidget(id) {
            this.widgets = this.widgets.filter(w => w.id !== id);
            const el = document.getElementById(id);
            if (el) el.remove();
            this.saveWidgets();
            this.updateClockPacing();
        },

        createWidgetDOM(cfg) {
            const container = document.createElement('div');
            container.className = 'desktop-widget';
            container.id = cfg.id;
            container.style.left = cfg.x + 'px';
            container.style.top = cfg.y + 'px';

            if (cfg.type === 'clock') {
                this.renderClockWidget(container, cfg);
            } else if (cfg.type === 'sticky') {
                this.renderStickyWidget(container, cfg);
            }

            // Add Context Menu event
            container.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showWidgetContextMenu(e.clientX, e.clientY, cfg);
            });

            // Append to desktop
            const desktop = document.getElementById('desktop');
            if (desktop) {
                desktop.appendChild(container);
            }

            // Bind dragging
            this.bindDrag(container, cfg, cfg.type === 'sticky' ? '.widget-sticky-header' : null);
        },

        renderClockWidget(container, cfg) {
            container.innerHTML = '';
            
            const clockEl = document.createElement('div');
            clockEl.className = 'widget-clock';

            // Clock style
            const showAnalog = cfg.style === 'analog' || cfg.style === 'both';
            const showDigital = cfg.style === 'digital' || cfg.style === 'both';

            if (showAnalog) {
                clockEl.innerHTML += `
                    <svg width="85" height="85" viewBox="0 0 100 100" class="widget-clock-svg">
                        <circle cx="50" cy="50" r="47" fill="rgba(255,255,255,0.01)" stroke="var(--glass-border)" stroke-width="2"/>
                        <line x1="50" y1="4" x2="50" y2="10" stroke="var(--text-muted)" stroke-width="2"/>
                        <line x1="96" y1="50" x2="90" y2="50" stroke="var(--text-muted)" stroke-width="2"/>
                        <line x1="50" y1="96" x2="50" y2="90" stroke="var(--text-muted)" stroke-width="2"/>
                        <line x1="4" y1="50" x2="10" y2="50" stroke="var(--text-muted)" stroke-width="2"/>
                        <line class="hour-hand" x1="50" y1="50" x2="50" y2="28" stroke="var(--text-primary)" stroke-width="3" stroke-linecap="round"/>
                        <line class="min-hand" x1="50" y1="50" x2="50" y2="16" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/>
                        <line class="sec-hand" x1="50" y1="50" x2="50" y2="12" stroke="var(--error)" stroke-width="1.2" stroke-linecap="round"/>
                        <circle cx="50" cy="50" r="2.5" fill="var(--error)"/>
                    </svg>
                `;
            }

            if (showDigital) {
                clockEl.innerHTML += `
                    <div class="widget-clock-digital"></div>
                    <div class="widget-clock-date"></div>
                `;
            }

            // Adjust size based on mode
            if (cfg.style === 'analog') {
                clockEl.style.height = '120px';
                clockEl.style.width = '120px';
            } else if (cfg.style === 'digital') {
                clockEl.style.height = '90px';
                clockEl.style.width = '160px';
            } else {
                clockEl.style.height = '170px';
                clockEl.style.width = '170px';
            }

            container.appendChild(clockEl);
            this.updateClockElement(container, cfg);
        },

        renderStickyWidget(container, cfg) {
            container.innerHTML = '';

            const stickyEl = document.createElement('div');
            stickyEl.className = `widget-sticky theme-${cfg.theme || 'glass'}`;
            stickyEl.style.width = (cfg.w || 180) + 'px';
            stickyEl.style.height = (cfg.h || 180) + 'px';

            stickyEl.innerHTML = `
                <div class="widget-sticky-header">
                    <span>Sticky Note</span>
                    <span style="opacity: 0.5; font-size: 8px;">Drag here</span>
                </div>
                <textarea class="widget-sticky-textarea" placeholder="Type quick notes here..."></textarea>
            `;

            const txt = stickyEl.querySelector('.widget-sticky-textarea');
            txt.value = cfg.text || '';

            // Auto-save typing
            txt.addEventListener('input', () => {
                cfg.text = txt.value;
                this.saveWidgets();
            });

            // Auto-save resizing
            const ro = new ResizeObserver(entries => {
                for (let entry of entries) {
                    const rect = entry.contentRect;
                    // Resize observer gives contentRect, add padding/borders to get full dimensions
                    const w = Math.round(rect.width + 2); // border sizes
                    const h = Math.round(rect.height + 26); // header + borders
                    if (w !== cfg.w || h !== cfg.h) {
                        cfg.w = w;
                        cfg.h = h;
                        this.saveWidgets();
                    }
                }
            });
            ro.observe(stickyEl);

            container.appendChild(stickyEl);
        },

        updateClockElement(container, cfg) {
            const now = new Date();
            const hours = now.getHours();
            const minutes = now.getMinutes();
            const seconds = now.getSeconds();

            // Analog update
            if (cfg.style === 'analog' || cfg.style === 'both') {
                const hourHand = container.querySelector('.hour-hand');
                const minHand = container.querySelector('.min-hand');
                const secHand = container.querySelector('.sec-hand');

                const hourDeg = ((hours % 12) * 30) + (minutes * 0.5);
                const minDeg = (minutes * 6) + (seconds * 0.1);
                const secDeg = seconds * 6;

                if (hourHand) hourHand.setAttribute('transform', `rotate(${hourDeg} 50 50)`);
                if (minHand) minHand.setAttribute('transform', `rotate(${minDeg} 50 50)`);
                if (secHand) secHand.setAttribute('transform', `rotate(${secDeg} 50 50)`);
            }

            // Digital update
            if (cfg.style === 'digital' || cfg.style === 'both') {
                const dig = container.querySelector('.widget-clock-digital');
                const dat = container.querySelector('.widget-clock-date');

                if (dig) {
                    const hs = String(hours).padStart(2, '0');
                    const ms = String(minutes).padStart(2, '0');
                    const ss = String(seconds).padStart(2, '0');
                    dig.textContent = `${hs}:${ms}:${ss}`;
                }

                if (dat) {
                    dat.textContent = now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
                }
            }
        },

        updateClockPacing() {
            const hasClock = this.widgets.some(w => w.type === 'clock');
            if (hasClock && !this.clockInterval) {
                this.clockInterval = setInterval(() => {
                    this.widgets.forEach(w => {
                        if (w.type === 'clock') {
                            const el = document.getElementById(w.id);
                            if (el) this.updateClockElement(el, w);
                        }
                    });
                }, 1000);
            } else if (!hasClock && this.clockInterval) {
                clearInterval(this.clockInterval);
                this.clockInterval = null;
            }
        },

        bindDrag(container, cfg, handleSelector) {
            let isDragging = false;
            let startX, startY, initX, initY;
            const handle = handleSelector ? container.querySelector(handleSelector) : container;

            if (!handle) return;

            const onMove = e => {
                if (!isDragging) return;
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                const desktop = document.getElementById('desktop');
                const maxW = desktop.clientWidth - container.offsetWidth;
                const maxH = desktop.clientHeight - container.offsetHeight;

                let nx = Math.max(10, Math.min(initX + dx, maxW - 10));
                let ny = Math.max(10, Math.min(initY + dy, maxH - 10));

                container.style.left = nx + 'px';
                container.style.top = ny + 'px';

                cfg.x = nx;
                cfg.y = ny;
            };

            const onUp = () => {
                if (!isDragging) return;
                isDragging = false;
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                this.saveWidgets();
            };

            handle.addEventListener('mousedown', e => {
                // Ignore right click or dragging triggers inside textareas
                if (e.button !== 0 || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
                
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                initX = parseInt(container.style.left) || 0;
                initY = parseInt(container.style.top) || 0;

                e.preventDefault();
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            });
        },

        // ═══════════════════════════════════════════════════════════
        // Context Menu Builders
        // ═══════════════════════════════════════════════════════════

        showDesktopContextMenu(x, y) {
            this.closeContextMenu();

            const menu = document.createElement('div');
            menu.className = 'desktop-ctx-menu';
            menu.style.left = x + 'px';
            menu.style.top = y + 'px';

            menu.innerHTML = `
                <div class="desktop-ctx-item" id="ctx-add-clock">🕒 Add Clock Widget</div>
                <div class="desktop-ctx-item" id="ctx-add-sticky">📝 Add Sticky Note</div>
                <div class="desktop-ctx-separator"></div>
                <div class="desktop-ctx-item" id="ctx-tile">⊞ Tile All Windows</div>
            `;

            menu.querySelector('#ctx-add-clock').addEventListener('click', () => {
                this.addWidget('clock', x - 40, y - 40);
            });

            menu.querySelector('#ctx-add-sticky').addEventListener('click', () => {
                this.addWidget('sticky', x - 80, y - 10);
            });

            menu.querySelector('#ctx-tile').addEventListener('click', () => {
                if (window.App && window.App.wm) {
                    window.App.wm.tileWindows();
                }
            });

            document.body.appendChild(menu);
            this.activeCtxMenu = menu;
        },

        showWidgetContextMenu(x, y, cfg) {
            this.closeContextMenu();

            const menu = document.createElement('div');
            menu.className = 'desktop-ctx-menu';
            menu.style.left = x + 'px';
            menu.style.top = y + 'px';

            if (cfg.type === 'clock') {
                menu.innerHTML = `
                    <div class="desktop-ctx-item" id="ctx-clk-both">✓ Style: Both</div>
                    <div class="desktop-ctx-item" id="ctx-clk-analog">Style: Analog Only</div>
                    <div class="desktop-ctx-item" id="ctx-clk-digital">Style: Digital Only</div>
                    <div class="desktop-ctx-separator"></div>
                    <div class="desktop-ctx-item" id="ctx-del-widget" style="color:var(--error);">🗑 Delete Widget</div>
                `;

                // Set checkmarks
                menu.querySelectorAll('.desktop-ctx-item').forEach(item => {
                    const id = item.id;
                    if (id === 'ctx-clk-both') item.textContent = (cfg.style === 'both' ? '●' : '○') + ' Style: Both';
                    if (id === 'ctx-clk-analog') item.textContent = (cfg.style === 'analog' ? '●' : '○') + ' Style: Analog Only';
                    if (id === 'ctx-clk-digital') item.textContent = (cfg.style === 'digital' ? '●' : '○') + ' Style: Digital Only';
                });

                menu.querySelector('#ctx-clk-both').addEventListener('click', () => this.setClockStyle(cfg, 'both'));
                menu.querySelector('#ctx-clk-analog').addEventListener('click', () => this.setClockStyle(cfg, 'analog'));
                menu.querySelector('#ctx-clk-digital').addEventListener('click', () => this.setClockStyle(cfg, 'digital'));

            } else if (cfg.type === 'sticky') {
                menu.innerHTML = `
                    <div class="desktop-ctx-item" id="ctx-stk-glass">○ Glassy</div>
                    <div class="desktop-ctx-item" id="ctx-stk-yellow">○ Soft Yellow</div>
                    <div class="desktop-ctx-item" id="ctx-stk-pink">○ Soft Pink</div>
                    <div class="desktop-ctx-item" id="ctx-stk-blue">○ Soft Blue</div>
                    <div class="desktop-ctx-item" id="ctx-stk-green">○ Soft Green</div>
                    <div class="desktop-ctx-separator"></div>
                    <div class="desktop-ctx-item" id="ctx-del-widget" style="color:var(--error);">🗑 Delete Widget</div>
                `;

                // Set checkmarks
                menu.querySelectorAll('.desktop-ctx-item').forEach(item => {
                    const id = item.id;
                    if (id === 'ctx-stk-glass') item.textContent = (cfg.theme === 'glass' ? '●' : '○') + ' Glassy';
                    if (id === 'ctx-stk-yellow') item.textContent = (cfg.theme === 'yellow' ? '●' : '○') + ' Soft Yellow';
                    if (id === 'ctx-stk-pink') item.textContent = (cfg.theme === 'pink' ? '●' : '○') + ' Soft Pink';
                    if (id === 'ctx-stk-blue') item.textContent = (cfg.theme === 'blue' ? '●' : '○') + ' Soft Blue';
                    if (id === 'ctx-stk-green') item.textContent = (cfg.theme === 'green' ? '●' : '○') + ' Soft Green';
                });

                menu.querySelector('#ctx-stk-glass').addEventListener('click', () => this.setStickyTheme(cfg, 'glass'));
                menu.querySelector('#ctx-stk-yellow').addEventListener('click', () => this.setStickyTheme(cfg, 'yellow'));
                menu.querySelector('#ctx-stk-pink').addEventListener('click', () => this.setStickyTheme(cfg, 'pink'));
                menu.querySelector('#ctx-stk-blue').addEventListener('click', () => this.setStickyTheme(cfg, 'blue'));
                menu.querySelector('#ctx-stk-green').addEventListener('click', () => this.setStickyTheme(cfg, 'green'));
            }

            menu.querySelector('#ctx-del-widget').addEventListener('click', () => {
                this.removeWidget(cfg.id);
            });

            document.body.appendChild(menu);
            this.activeCtxMenu = menu;
        },

        setClockStyle(cfg, style) {
            cfg.style = style;
            this.saveWidgets();
            const el = document.getElementById(cfg.id);
            if (el) {
                this.renderClockWidget(el, cfg);
            }
            this.updateClockPacing();
        },

        setStickyTheme(cfg, theme) {
            cfg.theme = theme;
            this.saveWidgets();
            const el = document.getElementById(cfg.id);
            if (el) {
                this.renderStickyWidget(el, cfg);
            }
        },

        closeContextMenu() {
            if (this.activeCtxMenu) {
                this.activeCtxMenu.remove();
                this.activeCtxMenu = null;
            }
        }
    };

    window.WidgetManager = WidgetManager;
})();
