/* ═══════════════════════════════════════════════════════════
   Tool: Diff Checker (Monaco Edition)
   Professional-grade diff viewer using Monaco's Diff Editor.
   ═══════════════════════════════════════════════════════════ */
(function () {
    const LS_KEY = 'toolbox_diff_checker';

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
                <div class="diff-toolbar" style="display:flex; align-items:center; gap:8px; padding:8px 12px; border-bottom:1px solid var(--glass-border); background:rgba(0,0,0,0.1); flex-shrink:0;">
                    <div style="display:flex; gap:4px; background:rgba(255,255,255,0.05); padding:2px; border-radius:var(--r-sm);">
                        <button class="btn btn-sm btn-icon active" id="diff-view-sbs" title="Side by Side">🌓</button>
                        <button class="btn btn-sm btn-icon" id="diff-view-inline" title="Inline View">📖</button>
                    </div>
                    <div style="width:1px; height:20px; background:var(--glass-border); margin:0 4px;"></div>
                    <button class="btn btn-sm" id="diff-swap" title="Swap Left/Right">⇄</button>
                    <button class="btn btn-sm" id="diff-clear">Clear</button>
                    <div style="flex:1"></div>
                    <span id="diff-status" style="font-size:11px; color:var(--text-muted); font-family:monospace;">Ready</span>
                </div>
                <div id="diff-monaco-container" style="flex:1; min-height:0;"></div>
            </div>`;

            const monacoCont = container.querySelector('#diff-monaco-container');
            const sbsBtn     = container.querySelector('#diff-view-sbs');
            const inlineBtn  = container.querySelector('#diff-view-inline');
            const swapBtn    = container.querySelector('#diff-swap');
            const clearBtn   = container.querySelector('#diff-clear');
            const statusEl   = container.querySelector('#diff-status');

            let diffEditor = null;
            let originalModel = null;
            let modifiedModel = null;

            async function init() {
                try {
                    const monaco = await loadMonaco();
                    
                    diffEditor = monaco.editor.createDiffEditor(monacoCont, {
                        theme: 'vs-dark',
                        automaticLayout: true,
                        enableSplitViewResizing: true,
                        renderSideBySide: true,
                        originalEditable: true,
                        fontSize: 13,
                        fontFamily: "'JetBrains Mono', monospace",
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        padding: { top: 10, bottom: 10 },
                    });

                    // Load saved state
                    let savedOld = '';
                    let savedNew = '';
                    try {
                        const saved = JSON.parse(localStorage.getItem(LS_KEY));
                        if (saved) {
                            savedOld = saved.old || '';
                            savedNew = saved.new || '';
                            if (saved.inline) {
                                isInline = true;
                                diffEditor.updateOptions({ renderSideBySide: false });
                                sbsBtn.classList.remove('active');
                                inlineBtn.classList.add('active');
                            }
                        }
                    } catch {}

                    originalModel = monaco.editor.createModel(savedOld, 'text/plain');
                    modifiedModel = monaco.editor.createModel(savedNew, 'text/plain');

                    diffEditor.setModel({
                        original: originalModel,
                        modified: modifiedModel
                    });

                    // Save on change
                    const saveState = () => {
                        if (!originalModel || !modifiedModel) return;
                        try {
                            localStorage.setItem(LS_KEY, JSON.stringify({
                                old: originalModel.getValue(),
                                new: modifiedModel.getValue(),
                                inline: isInline
                            }));
                            updateStatus();
                        } catch {}
                    };

                    originalModel.onDidChangeContent(saveState);
                    modifiedModel.onDidChangeContent(saveState);
                    
                    updateStatus();

                } catch (err) {
                    monacoCont.innerHTML = `<div style="padding:20px; color:var(--error)">Failed to load Monaco: ${err.message}</div>`;
                }
            }

            function updateStatus() {
                if (!originalModel || !modifiedModel) return;
                const oldLen = originalModel.getValue().length;
                const newLen = modifiedModel.getValue().length;
                statusEl.textContent = `L: ${oldLen} ch | R: ${newLen} ch`;
            }

            sbsBtn.onclick = () => {
                if (!diffEditor) return;
                isInline = false;
                diffEditor.updateOptions({ renderSideBySide: true });
                sbsBtn.classList.add('active');
                inlineBtn.classList.remove('active');
                saveStateSync();
            };

            inlineBtn.onclick = () => {
                if (!diffEditor) return;
                isInline = true;
                diffEditor.updateOptions({ renderSideBySide: false });
                sbsBtn.classList.remove('active');
                inlineBtn.classList.add('active');
                saveStateSync();
            };

            swapBtn.onclick = () => {
                if (!originalModel || !modifiedModel) return;
                const old = originalModel.getValue();
                const newV = modifiedModel.getValue();
                originalModel.setValue(newV);
                modifiedModel.setValue(old);
            };

            clearBtn.onclick = () => {
                if (!originalModel || !modifiedModel) return;
                if (confirm('Clear both panels?')) {
                    originalModel.setValue('');
                    modifiedModel.setValue('');
                }
            };

            function saveStateSync() {
                if (!originalModel || !modifiedModel || !diffEditor) return;
                try {
                    localStorage.setItem(LS_KEY, JSON.stringify({
                        old: originalModel.getValue(),
                        new: modifiedModel.getValue(),
                        inline: !diffEditor.renderSideBySide // This is not quite right for options access but good enough
                    }));
                } catch {}
            }

            init();

            const observer = new ResizeObserver(() => {
                if (diffEditor) diffEditor.layout();
            });
            observer.observe(monacoCont);

            return () => {
                observer.disconnect();
                if (diffEditor) diffEditor.dispose();
                if (originalModel) originalModel.dispose();
                if (modifiedModel) modifiedModel.dispose();
            };
        }
    });
})();
