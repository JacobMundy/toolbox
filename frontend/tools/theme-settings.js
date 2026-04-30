/* ═══════════════════════════════════════════════════════════
   Tool: Theme Settings
   Features: Customize accent colors, glass effects, backgrounds, and profiles.
   ═══════════════════════════════════════════════════════════ */
(function () {
    const STYLE = document.createElement('style');
    STYLE.textContent = `
.tm-root { padding: 20px; color: var(--text-primary); font-family: 'Inter', sans-serif; display: flex; flex-direction: column; gap: 20px; height: 100%; overflow-y: auto; }
.tm-section { display: flex; flex-direction: column; gap: 12px; border-bottom: 1px solid var(--glass-border); padding-bottom: 20px; }
.tm-section:last-child { border-bottom: none; }
.tm-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--accent); margin-bottom: 4px; }
.tm-row { display: flex; align-items: center; justify-content: space-between; gap: 15px; }

.tm-color-picker { display: flex; gap: 8px; flex-wrap: wrap; }
.tm-color-opt { width: 28px; height: 28px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: all 0.2s; position: relative; }
.tm-color-opt:hover { transform: scale(1.1); }
.tm-color-opt.active { border-color: #fff; transform: scale(1.15); box-shadow: 0 0 10px var(--accent-glow); }

.tm-slider { flex: 1; -webkit-appearance: none; height: 4px; border-radius: 2px; background: var(--glass-border); outline: none; }
.tm-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: var(--accent); cursor: pointer; border: 2px solid var(--bg-primary); }

.tm-profile-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(255,255,255,0.03); border-radius: var(--r-sm); margin-bottom: 5px; }
.tm-profile-name { font-size: 13px; font-weight: 500; }

.tm-custom-color { width: 28px; height: 28px; border-radius: 50%; padding: 0; border: 1px solid var(--glass-border); overflow: hidden; cursor: pointer; }
.tm-custom-color::-webkit-color-swatch-wrapper { padding: 0; }
.tm-custom-color::-webkit-color-swatch { border: none; }
`;
    document.head.appendChild(STYLE);

    ToolRegistry.register({
        id: 'theme-settings',
        name: 'Theme Settings',
        icon: '🎨',
        description: 'Personalize your workspace colors, backgrounds, and profiles',
        tags: ['theme', 'settings', 'customize', 'appearance', 'background'],
        defaultWidth: 450,
        defaultHeight: 600,

        createUI(container, windowId) {
            const tm = window.themeManager;

            const presetColors = [
                '124, 108, 240', '59, 130, 246', '16, 185, 129', '245, 158, 11',
                '239, 68, 68', '236, 72, 153', '139, 92, 246', '14, 165, 233'
            ];

            function render() {
                const scrollPos = container.querySelector('.tm-root')?.scrollTop || 0;
                const settings = tm.getEffectiveValues();
                const base = tm.customBase;
                const profiles = Object.keys(tm.profiles);

                container.innerHTML = `
                <div class="tm-root">
                    <div class="tm-section">
                        <div class="tm-title">Base Template</div>
                        <select class="select w-100" id="tm-base-${windowId}">
                            <option value="glassy" ${base === 'glassy' ? 'selected' : ''}>Glassy</option>
                            <option value="solidDark" ${base === 'solidDark' ? 'selected' : ''}>Solid Dark</option>
                            <option value="rounded" ${base === 'rounded' ? 'selected' : ''}>Rounded</option>
                            <option value="sharp" ${base === 'sharp' ? 'selected' : ''}>Sharp</option>
                        </select>
                    </div>

                    <div class="tm-section">
                        <div class="tm-title">Accent Color</div>
                        <div class="tm-color-picker">
                            ${presetColors.map(rgb => `
                                <div class="tm-color-opt ${settings['--accent-rgb'] === rgb ? 'active' : ''}" 
                                     style="background: rgb(${rgb})" 
                                     data-rgb="${rgb}"></div>
                            `).join('')}
                            <input type="color" class="tm-custom-color" id="tm-custom-accent-${windowId}" value="${rgbToHex(settings['--accent-rgb'] || '124, 108, 240')}">
                        </div>
                    </div>

                    <div class="tm-section">
                        <div class="tm-title">Background & Elements</div>
                        <div class="tm-row">
                            <span class="label" style="margin:0">Main Background</span>
                            <input type="color" class="tm-custom-color" id="tm-bg-color-${windowId}" value="${settings['--bg-body'] || '#07071a'}">
                        </div>
                        <div class="tm-row">
                            <span class="label" style="margin:0">Element Color</span>
                            <input type="color" class="tm-custom-color" id="tm-bg-secondary-${windowId}" value="${settings['--bg-secondary'] || '#111135'}">
                        </div>
                        <div class="tm-row">
                            <span class="label" style="margin:0">Image URL</span>
                            <input type="text" class="input" style="flex:1" id="tm-bg-url-${windowId}" placeholder="https://..." value="${tm.overrides['--bg-image'] || ''}">
                        </div>
                    </div>

                    <div class="tm-section">
                        <div class="tm-title">Effects & Shape</div>
                        <div class="tm-row"><span class="label" style="margin:0">Blur</span><input type="range" class="tm-slider" id="tm-blur-${windowId}" min="0" max="40" value="${parseInt(settings['--glass-blur'] || 24)}"></div>
                        <div class="tm-row"><span class="label" style="margin:0">Opacity</span><input type="range" class="tm-slider" id="tm-opacity-${windowId}" min="20" max="100" value="${parseFloat(settings['--glass-opacity'] || 0.78) * 100}"></div>
                        <div class="tm-row"><span class="label" style="margin:0">Radius</span><input type="range" class="tm-slider" id="tm-radius-${windowId}" min="0" max="24" value="${parseInt(settings['--r-md'] || 10)}"></div>
                    </div>

                    <div class="tm-section">
                        <div class="tm-title">Theme Profiles</div>
                        <div class="tm-row" style="gap:10px;">
                            <input type="text" class="input" style="flex:1" id="tm-profile-name-${windowId}" placeholder="Profile name...">
                            <button class="btn btn-accent btn-sm" id="tm-profile-save-${windowId}">Save</button>
                        </div>
                        <div style="margin-top:10px;">
                            ${profiles.length === 0 ? '<div class="label" style="text-align:center; padding:10px; opacity:0.5;">No saved profiles</div>' : ''}
                            ${profiles.map(p => `
                                <div class="tm-profile-item">
                                    <span class="tm-profile-name">${escape(p)}</span>
                                    <div style="display:flex; gap:5px;">
                                        <button class="btn btn-sm" data-act="load-p" data-name="${escape(p)}">Load</button>
                                        <button class="btn btn-sm" data-act="del-p" data-name="${escape(p)}">✕</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div style="display:flex; gap:10px;">
                        <button class="btn btn-accent w-100" id="tm-apply-${windowId}">Use Custom Theme</button>
                        <button class="btn w-100" id="tm-reset-${windowId}">Reset All</button>
                    </div>
                </div>`;

                const root = container.querySelector('.tm-root');
                if (root) root.scrollTop = scrollPos;

                // Event Listeners
                container.querySelector(`#tm-base-${windowId}`).onchange = (e) => { 
                    tm.setCustomBase(e.target.value); 
                    render(); 
                };
                
                container.querySelectorAll('.tm-color-opt').forEach(opt => {
                    opt.onclick = () => { tm.updateOverride('--accent-rgb', opt.dataset.rgb); render(); };
                });

                container.querySelector(`#tm-custom-accent-${windowId}`).oninput = (e) => {
                    tm.updateOverride('--accent-rgb', hexToRgb(e.target.value));
                };

                container.querySelector(`#tm-bg-color-${windowId}`).oninput = (e) => {
                    tm.updateOverride('--bg-body', e.target.value);
                };

                container.querySelector(`#tm-bg-secondary-${windowId}`).oninput = (e) => {
                    tm.updateOverride('--bg-secondary', e.target.value);
                };

                container.querySelector(`#tm-bg-url-${windowId}`).onchange = (e) => {
                    tm.updateOverride('--bg-image', e.target.value);
                };

                container.querySelector(`#tm-blur-${windowId}`).oninput = (e) => tm.updateOverride('--glass-blur', `${e.target.value}px`);
                container.querySelector(`#tm-opacity-${windowId}`).oninput = (e) => tm.updateOverride('--glass-opacity', `${e.target.value / 100}`);
                container.querySelector(`#tm-radius-${windowId}`).oninput = (e) => {
                    const r = parseInt(e.target.value);
                    tm.updateOverrides({
                        '--r-sm': `${Math.max(0, r - 4)}px`,
                        '--r-md': `${r}px`,
                        '--r-lg': `${r + 4}px`,
                        '--r-xl': `${r + 10}px`
                    });
                };

                container.querySelector(`#tm-profile-save-${windowId}`).onclick = () => {
                    const name = container.querySelector(`#tm-profile-name-${windowId}`).value.trim();
                    if (name) { tm.saveProfile(name); render(); }
                };

                container.querySelectorAll('[data-act="load-p"]').forEach(btn => {
                    btn.onclick = () => { tm.loadProfile(btn.dataset.name); render(); };
                });

                container.querySelectorAll('[data-act="del-p"]').forEach(btn => {
                    btn.onclick = () => { if(confirm('Delete profile?')){ tm.deleteProfile(btn.dataset.name); render(); }};
                });

                container.querySelector(`#tm-apply-${windowId}`).onclick = () => {
                    tm.applyTheme('custom');
                    const switcher = document.getElementById('theme-switcher');
                    if (switcher) switcher.value = 'custom';
                };

                container.querySelector(`#tm-reset-${windowId}`).onclick = (e) => {
                    e.preventDefault();
                    tm.resetCustom();
                    render();
                };
            }

            function hexToRgb(hex) {
                const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
                return `${r}, ${g}, ${b}`;
            }
            function rgbToHex(rgb) {
                const [r, g, b] = rgb.split(',').map(n => parseInt(n.trim()));
                return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
            }
            function escape(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

            render();
        }
    });
})();
