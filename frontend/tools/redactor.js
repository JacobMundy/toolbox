/* ═══════════════════════════════════════════════════════════
    Tool: PII Redactor (Advanced Pro)
    ═══════════════════════════════════════════════════════════ */
(function () {
    const STYLE = document.createElement('style');
    STYLE.textContent = `
.red-root { display:flex; flex-direction:column; height:100%; overflow:hidden; }
.red-main-container { display:flex; flex:1; min-height:0; }

/* Sidebar Settings */
.red-sidebar {
    width:320px; background:rgba(0,0,0,0.15); border-right:1px solid var(--glass-border);
    display:flex; flex-direction:column; flex-shrink:0; overflow-y:auto; padding:12px; gap:16px;
}
.red-section-title { font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; }
.red-group { display:flex; flex-direction:column; gap:10px; margin-bottom:8px; }

/* Dynamic List Items */
.red-list-item {
    background:rgba(255,255,255,0.03); border:1px solid var(--glass-border); border-radius:var(--r-sm);
    padding:8px; padding-right:32px; position:relative; display:flex; flex-direction:column; gap:6px;
}
.red-list-item .del-btn {
    position:absolute; top:8px; right:8px; width:22px; height:22px; display:flex; align-items:center; justify-content:center;
    background:rgba(255,255,255,0.05); color:var(--text-muted); border:none; cursor:pointer; font-size:10px; border-radius:4px;
}
.red-list-item .del-btn:hover { background:var(--error); color:white; }

/* Inputs */
.red-input-sm {
    background:var(--bg-input); color:var(--text-primary); border:1px solid var(--glass-border); border-radius:var(--r-sm);
    padding:6px 8px; font-size:12px; outline:none; transition:border-color .2s; width:100%;
}
.red-input-sm:focus { border-color:var(--accent); }

/* Workspace */
.red-workspace { flex:1; display:flex; flex-direction:column; padding:16px; gap:16px; min-width:0; }
.red-io-box { flex:1; display:flex; flex-direction:column; gap:6px; min-height:0; }
.red-label { font-size:11px; font-weight:600; color:var(--text-secondary); text-transform:uppercase; display:flex; justify-content:space-between; }
.red-editor-container {
    flex:1; background:var(--bg-input); border:1px solid var(--glass-border); border-radius:var(--r-md);
    overflow:hidden; position:relative;
}
.red-monaco-container { height:100%; width:100%; }
.red-monaco-container .monaco-editor,
.red-monaco-container .monaco-editor-background,
.red-monaco-container .monaco-editor .margin {
    background: transparent !important;
}

.red-footer { display:flex; gap:12px; align-items:center; padding-top:12px; border-top:1px solid var(--glass-border); }
.add-row-btn {
    background:transparent; border:1px dashed var(--glass-border); color:var(--text-muted); padding:6px;
    font-size:11px; border-radius:var(--r-sm); cursor:pointer; width:100%; transition:all 0.2s;
}
.add-row-btn:hover { border-color:var(--accent); color:var(--accent-hover); }

/* Results Panel */
.red-results-panel {
    height:180px; background:rgba(0,0,0,0.2); border-top:1px solid var(--glass-border);
    display:none; flex-direction:column; overflow:hidden;
}
.red-results-panel.open { display:flex; }
.red-results-header { padding:8px 12px; font-size:11px; font-weight:700; color:var(--text-muted); border-bottom:1px solid var(--glass-border); display:flex; justify-content:space-between; }
.red-results-content { flex:1; overflow-y:auto; padding:8px 12px; display:flex; flex-direction:column; gap:8px; }

.leak-item { font-size:12px; display:flex; gap:8px; align-items:flex-start; padding:4px 0; }
.leak-sev-high { color:var(--error); }
.leak-sev-medium { color:var(--warning); }
.leak-found { font-family:monospace; background:rgba(255,255,255,0.1); padding:2px 4px; border-radius:3px; }
`;
    document.head.appendChild(STYLE);

    const POOLS = {
        first: ['James', 'Michael', 'Robert', 'David', 'William', 'Richard', 'Thomas', 'Sophia', 'Emma', 'Olivia', 'Charlotte', 'Amelia'],
        last: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'],
        city: ['Portland', 'Austin', 'Denver', 'Seattle', 'Nashville', 'Phoenix', 'Omaha'],
        user: ['StarWolf', 'PixelFrost', 'StormSage', 'NeonFox', 'CosmicRaven', 'IronViper']
    };

    function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    ToolRegistry.register({
        id: 'redactor',
        name: 'PII Redactor',
        icon: '🔒',
        description: 'PII redaction tool with pattern detection and leak reports',
        tags: ['redact', 'pii', 'privacy', 'security', 'rust', 'remove', 'names', 'leaks'],
        defaultWidth: 1000,
        defaultHeight: 800,

        createUI(container) {
            const LS_KEY = 'toolbox_redactor_state';
            let inputEditor = null;
            let outputEditor = null;
            let monacoInstance = null;
            let state = {
                primary: { first_name: '', last_name: '', email: '', phone: '', city: '' },
                family: [],
                usernames: [],
                custom: [],
                mode: 'labels',
                left_wrap: '[',
                right_wrap: ']'
            };

            // Restore saved state
            try {
                const saved = JSON.parse(localStorage.getItem(LS_KEY));
                if (saved) state = { ...state, ...saved };
            } catch {}

            function saveState() {
                try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
            }

            function render() {
                const sidebar = container.querySelector('.red-sidebar');
                const scrollPos = sidebar ? sidebar.scrollTop : 0;

                container.innerHTML = `
                <div class="red-root">
                    <div class="red-main-container">
                        <div class="red-sidebar">
                            <div>
                                <div class="red-section-title">
                                    Primary User
                                    <button class="btn btn-sm" id="reroll-primary" style="font-size: 10px; padding: 2px 6px;">🎲 Reroll Fakes</button>
                                </div>
                                <div class="red-group">
                                    <input type="text" class="red-input-sm" data-field="first_name" placeholder="First Name" value="${state.primary.first_name}">
                                    <input type="text" class="red-input-sm" data-field="last_name" placeholder="Last Name" value="${state.primary.last_name}">
                                    <input type="text" class="red-input-sm" data-field="email" placeholder="Email" value="${state.primary.email}">
                                    <input type="text" class="red-input-sm" data-field="phone" placeholder="Phone" value="${state.primary.phone}">
                                    <input type="text" class="red-input-sm" data-field="city" placeholder="City" value="${state.primary.city}">
                                </div>
                            </div>

                            <div>
                                <div class="red-section-title">Redaction Style</div>
                                <div class="red-group" style="flex-direction: row; gap: 8px;">
                                    <input type="text" class="red-input-sm" id="left-wrap" placeholder="Prefix" value="${state.left_wrap}">
                                    <input type="text" class="red-input-sm" id="right-wrap" placeholder="Suffix" value="${state.right_wrap}">
                                </div>
                            </div>

                            <div>
                                <div class="red-section-title">Family Members</div>
                                <div id="red-family-list" class="red-group">
                                    ${state.family.map((f, i) => `
                                        <div class="red-list-item">
                                            <button class="del-btn" onclick="this.dispatchEvent(new CustomEvent('remove-family', {bubbles:true, detail:${i}}))">✕</button>
                                            <input type="text" class="red-input-sm" placeholder="First Name" value="${f.first_name || ''}" oninput="this.dispatchEvent(new CustomEvent('update-family', {bubbles:true, detail:{i:${i}, k:'first_name', v:this.value}}))">
                                            <input type="text" class="red-input-sm" placeholder="Last Name" value="${f.last_name || ''}" oninput="this.dispatchEvent(new CustomEvent('update-family', {bubbles:true, detail:{i:${i}, k:'last_name', v:this.value}}))">
                                            <input type="text" class="red-input-sm" placeholder="Phone" value="${f.phone || ''}" oninput="this.dispatchEvent(new CustomEvent('update-family', {bubbles:true, detail:{i:${i}, k:'phone', v:this.value}}))">
                                            <input type="text" class="red-input-sm" placeholder="Label (e.g. Spouse)" value="${f.label || ''}" oninput="this.dispatchEvent(new CustomEvent('update-family', {bubbles:true, detail:{i:${i}, k:'label', v:this.value}}))">
                                        </div>
                                    `).join('')}
                                    <button class="add-row-btn" id="add-family-btn">+ Add Family Member</button>
                                </div>
                            </div>

                            <div>
                                <div class="red-section-title">Usernames</div>
                                <div id="red-username-list" class="red-group">
                                    ${state.usernames.map((u, i) => `
                                        <div class="red-list-item">
                                            <button class="del-btn" onclick="this.dispatchEvent(new CustomEvent('remove-username', {bubbles:true, detail:${i}}))">✕</button>
                                            <input type="text" class="red-input-sm" placeholder="Real Username" value="${u.value || ''}" oninput="this.dispatchEvent(new CustomEvent('update-username', {bubbles:true, detail:{i:${i}, k:'value', v:this.value}}))">
                                            <input type="text" class="red-input-sm" placeholder="Plausible Fake" value="${u.plausible || ''}" oninput="this.dispatchEvent(new CustomEvent('update-username', {bubbles:true, detail:{i:${i}, k:'plausible', v:this.value}}))">
                                        </div>
                                    `).join('')}
                                    <button class="add-row-btn" id="add-username-btn">+ Add Username</button>
                                </div>
                            </div>

                            <div>
                                <div class="red-section-title">Custom Redactions</div>
                                <div id="red-custom-list" class="red-group">
                                    ${state.custom.map((c, i) => `
                                        <div class="red-list-item">
                                            <button class="del-btn" onclick="this.dispatchEvent(new CustomEvent('remove-custom', {bubbles:true, detail:${i}}))">✕</button>
                                            <input type="text" class="red-input-sm" placeholder="Find Text" value="${c.find || ''}" oninput="this.dispatchEvent(new CustomEvent('update-custom', {bubbles:true, detail:{i:${i}, k:'find', v:this.value}}))">
                                            <input type="text" class="red-input-sm" placeholder="Label" value="${c.label || ''}" oninput="this.dispatchEvent(new CustomEvent('update-custom', {bubbles:true, detail:{i:${i}, k:'label', v:this.value}}))">
                                            <input type="text" class="red-input-sm" placeholder="Plausible Fake" value="${c.plausible || ''}" oninput="this.dispatchEvent(new CustomEvent('update-custom', {bubbles:true, detail:{i:${i}, k:'plausible', v:this.value}}))">
                                        </div>
                                    `).join('')}
                                    <button class="add-row-btn" id="add-custom-btn">+ Add Custom</button>
                                </div>
                            </div>
                        </div>

                        <div class="red-workspace">
                            <div class="red-io-box">
                                <div class="red-label">Input Text</div>
                                <div id="red-input-cont" class="red-editor-container"><div id="red-input" class="red-monaco-container"></div></div>
                            </div>
                            <div class="red-io-box">
                                <div class="red-label">
                                    Redacted Result
                                    <span id="leak-count" style="color: var(--error); cursor: pointer; text-decoration: underline; display:none;">0 Leaks Detected</span>
                                </div>
                                <div id="red-output-cont" class="red-editor-container"><div id="red-output" class="red-monaco-container"></div></div>
                            </div>
                            <div class="red-footer">
                                <select id="red-mode" class="red-input-sm" style="width: auto;">
                                    <option value="labels" ${state.mode === 'labels' ? 'selected' : ''}>Mode: Labels</option>
                                    <option value="plausible" ${state.mode === 'plausible' ? 'selected' : ''}>Mode: Plausible</option>
                                </select>
                                <div id="red-status" style="font-size: 11px; color: var(--text-muted); flex:1;">Ready</div>
                                <button id="red-btn" class="btn btn-accent">Run Redactor</button>
                            </div>
                        </div>
                    </div>

                    <div id="red-results" class="red-results-panel">
                        <div class="red-results-header">
                            <span>REDACTION REPORT & LEAKS</span>
                            <span id="close-results" style="cursor:pointer;">✕</span>
                        </div>
                        <div id="red-results-content" class="red-results-content">
                            <div style="color:var(--text-muted); font-size:11px;">Run redactor to see report.</div>
                        </div>
                    </div>
                </div>`;

                attachEvents();
                
                const newSidebar = container.querySelector('.red-sidebar');
                if (newSidebar) newSidebar.scrollTop = scrollPos;
            }

            function attachEvents() {
                // Primary fields
                container.querySelectorAll('.red-sidebar input[data-field]').forEach(inp => {
                    inp.addEventListener('input', e => {
                        state.primary[e.target.dataset.field] = e.target.value;
                        saveState();
                    });
                });

                container.querySelector('#left-wrap').oninput = e => { state.left_wrap = e.target.value; saveState(); };
                container.querySelector('#right-wrap').oninput = e => { state.right_wrap = e.target.value; saveState(); };

                // Add buttons
                const safeAdd = (selector, fn) => {
                    const el = container.querySelector(selector);
                    if (el) el.onclick = fn;
                };

                safeAdd('#add-family-btn', () => { state.family.push({first_name:'', last_name:'', phone:'', label:''}); saveState(); render(); });
                safeAdd('#add-username-btn', () => { state.usernames.push({value:'', plausible:''}); saveState(); render(); });
                safeAdd('#add-custom-btn', () => { state.custom.push({find:'', label:'', plausible:''}); saveState(); render(); });

                const rerollBtn = container.querySelector('#reroll-primary');
                if (rerollBtn) {
                    rerollBtn.onclick = () => {
                        state.custom.forEach(c => { if(!c.plausible) c.plausible = rand(POOLS.first) + ' ' + rand(POOLS.last); });
                        state.usernames.forEach(u => { if(!u.plausible) u.plausible = rand(POOLS.user); });
                        render();
                    };
                }

                // Event Listeners
                container.addEventListener('update-family', e => { state.family[e.detail.i][e.detail.k] = e.detail.v; saveState(); });
                container.addEventListener('remove-family', e => { state.family.splice(e.detail, 1); saveState(); render(); });
                container.addEventListener('update-username', e => { state.usernames[e.detail.i][e.detail.k] = e.detail.v; saveState(); });
                container.addEventListener('remove-username', e => { state.usernames.splice(e.detail, 1); saveState(); render(); });
                container.addEventListener('update-custom', e => { state.custom[e.detail.i][e.detail.k] = e.detail.v; saveState(); });
                container.addEventListener('remove-custom', e => { state.custom.splice(e.detail, 1); saveState(); render(); });

                container.querySelector('#red-mode').onchange = e => { state.mode = e.target.value; saveState(); };

                const resultsPanel = container.querySelector('#red-results');
                const resultsContent = container.querySelector('#red-results-content');
                const leakCount = container.querySelector('#leak-count');
                
                container.querySelector('#close-results').onclick = () => resultsPanel.classList.remove('open');
                leakCount.onclick = () => resultsPanel.classList.add('open');

                // Monaco State (declared in createUI scope)

                async function initMonaco() {
                    try {
                        const monaco = await window.loadMonaco();
                        monacoInstance = monaco;

                        monaco.editor.defineTheme('red-transparent', {
                            base: 'vs-dark',
                            inherit: true,
                            rules: [],
                            colors: {
                                'editor.background': '#00000000',
                                'editorGutter.background': '#00000000'
                            }
                        });

                        inputEditor = monaco.editor.create(container.querySelector('#red-input'), {
                            theme: 'red-transparent',
                            automaticLayout: true,
                            fontSize: 13,
                            fontFamily: "'JetBrains Mono', monospace",
                            minimap: { enabled: false },
                            wordWrap: 'on',
                            scrollBeyondLastLine: false,
                            stickyScroll: { enabled: false },
                            padding: { top: 12, bottom: 12 },
                        });

                        outputEditor = monaco.editor.create(container.querySelector('#red-output'), {
                            theme: 'red-transparent',
                            automaticLayout: true,
                            fontSize: 13,
                            fontFamily: "'JetBrains Mono', monospace",
                            minimap: { enabled: false },
                            wordWrap: 'on',
                            scrollBeyondLastLine: false,
                            stickyScroll: { enabled: false },
                            padding: { top: 12, bottom: 12 },
                            readOnly: true
                        });
                    } catch (e) {
                        console.error('Redactor: Failed to load Monaco', e);
                    }
                }

                initMonaco();

                // Run Redaction
                const runBtn = container.querySelector('#red-btn');
                const status = container.querySelector('#red-status');

                runBtn.onclick = async () => {
                    const text = inputEditor ? inputEditor.getValue() : '';
                    if (!text.trim()) return;
                    status.textContent = 'Analyzing text...';
                    
                    const request = {
                        text,
                        settings: {
                            primary: {
                                first_name: state.primary.first_name || null,
                                last_name: state.primary.last_name || null,
                                email: state.primary.email || null,
                                phone: state.primary.phone || null,
                                city: state.primary.city || null
                            },
                            family_members: state.family.map(f => ({ ...f })),
                            usernames: state.usernames.map(u => ({ ...u })),
                            custom_redactions: state.custom.map(c => ({ ...c })),
                            left_wrap: state.left_wrap,
                            right_wrap: state.right_wrap,
                            mode: state.mode
                        }
                    };

                    try {
                        const result = await window.__TAURI__.core.invoke('redact_pii', { req: request });
                        if (outputEditor) outputEditor.setValue(result.output);
                        
                        // Show Report
                        resultsPanel.classList.add('open');
                        let html = '';
                        
                        if (result.leaks.length > 0) {
                            html += `<div style="font-weight:700; color:var(--error); font-size:11px;">⚠️ POTENTIAL LEAKS (${result.leaks.length})</div>`;
                            result.leaks.forEach(l => {
                                html += `<div class="leak-item">
                                    <span class="leak-sev-${l.severity}">[${l.severity.toUpperCase()}]</span>
                                    <span>${l.message}: <span class="leak-found">${l.found}</span></span>
                                </div>`;
                            });
                            leakCount.style.display = 'block';
                            leakCount.textContent = `${result.leaks.length} Leaks Detected`;
                        } else {
                            html += `<div style="color:var(--success); font-size:11px;">✅ No obvious leaks detected.</div>`;
                            leakCount.style.display = 'none';
                        }

                        html += `<div style="margin-top:8px; font-weight:700; color:var(--text-muted); font-size:11px;">REDACTION LOG</div>`;
                        result.report.forEach(r => {
                            html += `<div style="font-size:12px; display:flex; justify-content:space-between;">
                                <span>${r.original} ➔ ${r.replaced_with}</span>
                                <span style="color:var(--accent-hover);">${r.count}x</span>
                            </div>`;
                        });

                        resultsContent.innerHTML = html;
                        status.textContent = 'Redaction complete.';
                        status.style.color = 'var(--success)';
                    } catch (err) {
                        status.textContent = 'Error: ' + err;
                        status.style.color = 'var(--error)';
                    }
                };
            }

            render();

            return {
                cleanup: () => {
                    try {
                        if (inputEditor) inputEditor.dispose();
                    } catch (e) {
                        console.error('Failed to dispose inputEditor:', e);
                    }
                    try {
                        if (outputEditor) outputEditor.dispose();
                    } catch (e) {
                        console.error('Failed to dispose outputEditor:', e);
                    }
                },
                onMessage: (msg) => {
                    if (msg.type === 'open' && inputEditor) {
                        inputEditor.setValue(msg.content);
                    }
                }
            };
        }
    });
})();
