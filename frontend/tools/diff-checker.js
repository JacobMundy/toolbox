/* ═══════════════════════════════════════════════════════════
   Tool: Diff Checker (Monaco Edition) — Tabbed Multi-Diff
   Professional-grade diff viewer using Monaco's Diff Editor.
   ═══════════════════════════════════════════════════════════ */
(function () {
    const LS_KEY = 'toolbox_diff_checker';

    const STYLE = document.createElement('style');
    STYLE.textContent = `
/* ── Diff Checker Tabs ─────────────────────── */
.diff-tabs {
    display: flex; align-items: center; gap: 2px;
    padding: 4px 10px; border-bottom: 1px solid var(--glass-border);
    overflow-x: auto; flex-shrink: 0; background: rgba(0,0,0,0.15);
}
.diff-tab {
    display: flex; align-items: center; gap: 6px;
    padding: 5px 12px; border-radius: var(--r-sm) var(--r-sm) 0 0;
    border: 1px solid transparent; background: transparent;
    color: var(--text-muted); cursor: pointer; font-size: 12px;
    font-weight: 500; white-space: nowrap; transition: all .15s;
    font-family: 'Inter', sans-serif; max-width: 160px; min-width: 0;
}
.diff-tab span { flex: 1; overflow: hidden; text-overflow: ellipsis; }
.diff-tab:hover { background: rgba(255,255,255,0.04); color: var(--text-secondary); }
.diff-tab.active {
    background: var(--bg-secondary); color: var(--text-primary);
    border-color: var(--glass-border); border-bottom-color: var(--bg-secondary);
}
.diff-tab-close {
    display: inline-flex; align-items: center; justify-content: center;
    width: 16px; height: 16px; border-radius: 50%; border: none;
    background: transparent; color: var(--text-muted); cursor: pointer;
    font-size: 11px; transition: all .12s; flex-shrink: 0; line-height: 1;
}
.diff-tab-close:hover { background: var(--error); color: #fff; }
.diff-tab-add {
    display: flex; align-items: center; justify-content: center;
    width: 24px; height: 24px; border-radius: var(--r-sm);
    border: 1px dashed var(--glass-border); background: transparent;
    color: var(--text-muted); cursor: pointer; font-size: 16px;
    transition: all .12s; flex-shrink: 0;
}
.diff-tab-add:hover { border-color: var(--accent); color: var(--accent-hover); }

/* ── Monaco Theme Fix ───────────────── */
.diff-monaco-container .monaco-editor,
.diff-monaco-container .monaco-editor .overflow-guard,
.diff-monaco-container .monaco-editor .monaco-scrollable-element,
.diff-monaco-container .monaco-diff-editor,
.diff-monaco-container .monaco-editor-background,
.diff-monaco-container .monaco-editor .margin {
    background: transparent !important;
}
.diff-monaco-container .monaco-editor .line-numbers {
    color: var(--text-muted) !important;
}
`;
    document.head.appendChild(STYLE);

    ToolRegistry.register({
        id: 'diff-checker',
        name: 'Diff Checker',
        icon: '↔️',
        description: 'Compare text and code',
        tags: ['diff', 'compare', 'text', 'merge', 'changes', 'monaco', 'code'],
        defaultWidth: 1000,
        defaultHeight: 700,
        minWidth: 600,
        minHeight: 400,

        createUI(container) {
            container.innerHTML = `
            <div class="diff-root" style="display:flex; flex-direction:column; height:100%;">
                <div class="diff-tabs" id="diff-tabs-bar"></div>
                <div class="diff-toolbar" style="display:flex; align-items:center; gap:8px; padding:8px 12px; border-bottom:1px solid var(--glass-border); background:rgba(0,0,0,0.1); flex-shrink:0;">
                    <div style="display:flex; gap:4px; background:rgba(255,255,255,0.05); padding:2px; border-radius:var(--r-sm);">
                        <button class="btn btn-sm btn-icon active" id="diff-view-sbs" title="Side by Side">🌓</button>
                        <button class="btn btn-sm btn-icon" id="diff-view-inline" title="Inline View">📖</button>
                    </div>
                    <div style="width:1px; height:20px; background:var(--glass-border); margin:0 4px;"></div>
                    <button class="btn btn-sm" id="diff-swap" title="Swap Left/Right">⇄</button>
                    <button class="btn btn-sm" id="diff-clear">Clear</button>
                    <div style="flex:1"></div>
                    <span id="diff-status" style="font-size:11px; color:var(--text-muted); font-family:'JetBrains Mono',monospace;">Ready</span>
                </div>
                <div id="diff-monaco-container" class="diff-monaco-container" style="flex:1; min-height:0;"></div>
            </div>`;

            const tabsBar    = container.querySelector('#diff-tabs-bar');
            const monacoCont = container.querySelector('#diff-monaco-container');
            const sbsBtn     = container.querySelector('#diff-view-sbs');
            const inlineBtn  = container.querySelector('#diff-view-inline');
            const swapBtn    = container.querySelector('#diff-swap');
            const clearBtn   = container.querySelector('#diff-clear');
            const statusEl   = container.querySelector('#diff-status');

            let diffEditor = null;
            let monacoRef = null;
            let isInline = false;

            // Tab state
            let tabs = [];
            let activeTabIdx = 0;

            // Load saved state
            try {
                const saved = JSON.parse(localStorage.getItem(LS_KEY));
                if (saved && saved.tabs && saved.tabs.length) {
                    tabs = saved.tabs;
                    activeTabIdx = Math.min(saved.activeTab || 0, tabs.length - 1);
                    isInline = !!saved.inline;
                } else {
                    tabs = [{ name: 'Diff 1', old: '', new: '' }];
                }
            } catch {
                tabs = [{ name: 'Diff 1', old: '', new: '' }];
            }

            function saveState() {
                try {
                    // Save current editor content to active tab
                    if (diffEditor && tabs[activeTabIdx]) {
                        const models = diffEditor.getModel();
                        if (models) {
                            tabs[activeTabIdx].old = models.original.getValue();
                            tabs[activeTabIdx].new = models.modified.getValue();
                        }
                    }
                    localStorage.setItem(LS_KEY, JSON.stringify({
                        tabs,
                        activeTab: activeTabIdx,
                        inline: isInline
                    }));
                } catch {}
            }

            function renderTabs() {
                tabsBar.innerHTML = tabs.map((t, i) => `
                    <div class="diff-tab ${i === activeTabIdx ? 'active' : ''}" data-idx="${i}">
                        <span>${escHtml(t.name)}</span>
                        ${tabs.length > 1 ? `<button class="diff-tab-close" data-close="${i}">✕</button>` : ''}
                    </div>
                `).join('') + `<button class="diff-tab-add" id="diff-add-tab" title="New diff tab">+</button>`;

                // Tab click handlers
                tabsBar.querySelectorAll('.diff-tab').forEach(tab => {
                    tab.addEventListener('click', e => {
                        if (e.target.closest('.diff-tab-close')) return;
                        switchTab(+tab.dataset.idx);
                    });
                    tab.addEventListener('dblclick', () => {
                        const idx = +tab.dataset.idx;
                        const name = prompt('Rename tab:', tabs[idx].name);
                        if (name !== null && name.trim()) {
                            tabs[idx].name = name.trim();
                            renderTabs();
                            saveState();
                        }
                    });
                });

                // Close tab handlers
                tabsBar.querySelectorAll('.diff-tab-close').forEach(btn => {
                    btn.addEventListener('click', e => {
                        e.stopPropagation();
                        const idx = +btn.dataset.close;
                        if (tabs.length <= 1) return;

                        // Save current content before removal
                        if (diffEditor && idx === activeTabIdx) {
                            const models = diffEditor.getModel();
                            if (models) {
                                tabs[idx].old = models.original.getValue();
                                tabs[idx].new = models.modified.getValue();
                            }
                        }

                        tabs.splice(idx, 1);
                        if (idx < activeTabIdx) activeTabIdx--;
                        else if (idx === activeTabIdx) activeTabIdx = Math.min(idx, tabs.length - 1);

                        renderTabs();
                        loadTabContent();
                        saveState();
                    });
                });

                // Add tab button
                const addBtn = tabsBar.querySelector('#diff-add-tab');
                if (addBtn) addBtn.addEventListener('click', () => {
                    let nextNum = 1;
                    const existingNums = tabs.map(t => {
                        const m = t.name.match(/^Diff (\d+)$/);
                        return m ? parseInt(m[1]) : 0;
                    });
                    if (existingNums.length > 0) nextNum = Math.max(...existingNums) + 1;

                    tabs.push({ name: `Diff ${nextNum}`, old: '', new: '' });
                    switchTab(tabs.length - 1);
                    saveState();
                });
            }

            function switchTab(idx) {
                if (idx === activeTabIdx) return;
                // Save current tab content
                if (diffEditor) {
                    const models = diffEditor.getModel();
                    if (models) {
                        tabs[activeTabIdx].old = models.original.getValue();
                        tabs[activeTabIdx].new = models.modified.getValue();
                    }
                }
                activeTabIdx = idx;
                renderTabs();
                loadTabContent();
                saveState();
            }

            function loadTabContent() {
                if (!diffEditor || !monacoRef) return;
                const tab = tabs[activeTabIdx];
                const models = diffEditor.getModel();
                if (models) {
                    models.original.setValue(tab.old || '');
                    models.modified.setValue(tab.new || '');
                }
                updateStatus();
            }

            function escHtml(s) {
                return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            }

            async function init() {
                try {
                    const monaco = await loadMonaco();
                    monacoRef = monaco;

                    // Define a custom transparent theme
                    monaco.editor.defineTheme('diff-transparent', {
                        base: 'vs-dark',
                        inherit: true,
                        rules: [],
                        colors: {
                            'editor.background': '#00000000',
                            'editorGutter.background': '#00000000',
                            'diffEditor.insertedTextBackground': '#34d39918',
                            'diffEditor.removedTextBackground': '#f8717118',
                            'diffEditor.insertedLineBackground': '#34d39910',
                            'diffEditor.removedLineBackground': '#f8717110',
                        }
                    });

                    const tab = tabs[activeTabIdx];

                    diffEditor = monaco.editor.createDiffEditor(monacoCont, {
                        theme: 'diff-transparent',
                        automaticLayout: true,
                        enableSplitViewResizing: true,
                        renderSideBySide: !isInline,
                        originalEditable: true,
                        fontSize: 13,
                        fontFamily: "'JetBrains Mono', monospace",
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        padding: { top: 10, bottom: 10 },
                    });

                    const originalModel = monaco.editor.createModel(tab.old || '', 'text/plain');
                    const modifiedModel = monaco.editor.createModel(tab.new || '', 'text/plain');

                    diffEditor.setModel({
                        original: originalModel,
                        modified: modifiedModel
                    });

                    // Update view mode buttons if inline was saved
                    if (isInline) {
                        sbsBtn.classList.remove('active');
                        inlineBtn.classList.add('active');
                    }

                    // Save on content change
                    originalModel.onDidChangeContent(() => { saveState(); updateStatus(); });
                    modifiedModel.onDidChangeContent(() => { saveState(); updateStatus(); });

                    // Track cursor position for status updates
                    const origEditor = diffEditor.getOriginalEditor();
                    const modEditor = diffEditor.getModifiedEditor();

                    origEditor.onDidChangeCursorPosition((e) => {
                        updateStatus('original', e.position);
                    });
                    modEditor.onDidChangeCursorPosition((e) => {
                        updateStatus('modified', e.position);
                    });

                    origEditor.onDidFocusEditorText(() => {
                        const pos = origEditor.getPosition();
                        updateStatus('original', pos);
                    });
                    modEditor.onDidFocusEditorText(() => {
                        const pos = modEditor.getPosition();
                        updateStatus('modified', pos);
                    });

                    renderTabs();
                    updateStatus();

                } catch (err) {
                    monacoCont.innerHTML = `<div style="padding:20px; color:var(--error)">Failed to load Monaco: ${err.message}</div>`;
                }
            }

            function updateStatus(side, position) {
                if (!diffEditor) return;
                const models = diffEditor.getModel();
                if (!models) return;

                const origLines = models.original.getLineCount();
                const modLines = models.modified.getLineCount();

                if (position && side) {
                    const label = side === 'original' ? 'Left' : 'Right';
                    statusEl.textContent = `${label} — Ln ${position.lineNumber}, Col ${position.column}  |  L: ${origLines} lines  R: ${modLines} lines`;
                } else {
                    statusEl.textContent = `L: ${origLines} lines  |  R: ${modLines} lines`;
                }
            }

            sbsBtn.onclick = () => {
                if (!diffEditor) return;
                isInline = false;
                diffEditor.updateOptions({ renderSideBySide: true });
                sbsBtn.classList.add('active');
                inlineBtn.classList.remove('active');
                saveState();
            };

            inlineBtn.onclick = () => {
                if (!diffEditor) return;
                isInline = true;
                diffEditor.updateOptions({ renderSideBySide: false });
                sbsBtn.classList.remove('active');
                inlineBtn.classList.add('active');
                saveState();
            };

            swapBtn.onclick = () => {
                if (!diffEditor) return;
                const models = diffEditor.getModel();
                if (!models) return;
                const old = models.original.getValue();
                const newV = models.modified.getValue();
                models.original.setValue(newV);
                models.modified.setValue(old);
            };

            clearBtn.onclick = () => {
                if (!diffEditor) return;
                const models = diffEditor.getModel();
                if (!models) return;
                if (confirm('Clear both panels?')) {
                    models.original.setValue('');
                    models.modified.setValue('');
                }
            };

            init();

            const observer = new ResizeObserver(() => {
                if (diffEditor) diffEditor.layout();
            });
            observer.observe(monacoCont);

            return () => {
                observer.disconnect();
                if (diffEditor) {
                    const models = diffEditor.getModel();
                    if (models) {
                        models.original.dispose();
                        models.modified.dispose();
                    }
                    diffEditor.dispose();
                }
            };
        }
    });
})();
