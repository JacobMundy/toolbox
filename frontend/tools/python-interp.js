/* ═══════════════════════════════════════════════════════════
   Tool: Python Interpreter (Native via Tauri)
   Features: Monaco Editor, Syntax highlighting, Autocomplete, 
             History, Execution timer, Native system Python.
   ═══════════════════════════════════════════════════════════ */
(function () {
    const STYLE = document.createElement('style');
    STYLE.textContent = `
.pyinterp { display:flex; flex-direction:column; height:100%; background: var(--bg-primary); }
.pyinterp-toolbar {
    display:flex; align-items:center; gap:8px; padding:8px 12px;
    border-bottom:1px solid var(--glass-border); flex-shrink:0;
    background: rgba(255,255,255,0.02);
}
.pyinterp-toolbar .btn { font-size:12px; display: flex; align-items: center; gap: 4px; }
.pyinterp-status {
    margin-left:auto; font-size:11px; color:var(--text-muted);
    display:flex; align-items:center; gap:8px;
}
.pyinterp-status .dot {
    width:8px; height:8px; border-radius:50%; display:inline-block;
    box-shadow: 0 0 8px transparent;
}
.pyinterp-status .dot.loading { background:var(--warning); animation: pulse-yellow 1.5s infinite; }
.pyinterp-status .dot.ready   { background:var(--success); box-shadow: 0 0 8px var(--success); }
.pyinterp-status .dot.error   { background:var(--error); box-shadow: 0 0 8px var(--error); }

@keyframes pulse-yellow { 
    0%, 100% { opacity: 1; box-shadow: 0 0 2px var(--warning); }
    50% { opacity: 0.4; box-shadow: 0 0 10px var(--warning); }
}

/* ── Editor Area ─────────────────────────────────── */
.pyinterp-editor-wrap {
    flex:1; display:flex; flex-direction:column; min-height:0;
    position:relative;
}
.pyinterp-editor-container {
    flex:1; min-height:100px;
    background:#1e1e1e; /* Monaco default dark */
    border-bottom:1px solid var(--glass-border);
    overflow: hidden; /* Prevent Monaco from overflowing */
}

/* ── Output ──────────────────────────────────────── */
.pyinterp-output-header {
    display:flex; justify-content:space-between; align-items:center;
    padding:6px 12px; border-bottom:1px solid var(--glass-border);
    font-size:11px; font-weight:600; color:var(--text-muted);
    text-transform:uppercase; letter-spacing:1px;
    flex-shrink:0; background: rgba(0,0,0,0.2);
}
.pyinterp-timer { font-weight:500; color: var(--accent-hover); font-variant-numeric:tabular-nums; }
.pyinterp-output {
    flex: 0 0 28%; min-height:80px; overflow-y:auto;
    padding:12px 16px;
    font-family:'JetBrains Mono',monospace; font-size:13px;
    white-space:pre-wrap; color:var(--text-secondary);
    line-height:1.6;
    background: rgba(0,0,0,0.3);
}
.pyinterp-output .py-err  { color:var(--error); font-weight: 500; }
.pyinterp-output .py-val  { color:var(--accent-hover); }
.pyinterp-output .py-out  { color:var(--text-primary); }
.pyinterp-output .py-info { color:var(--text-muted); font-style:italic; border-left: 2px solid var(--glass-border); padding-left: 8px; margin: 4px 0; }

/* ── Run history ─────────────────────────────────── */
.pyinterp-hist-btn {
    width:28px; height:28px; border:none; display:flex;
    align-items:center; justify-content:center;
    background:rgba(255,255,255,.06); color:var(--text-muted);
    border-radius:var(--r-sm); cursor:pointer; font-size:14px;
    transition:all .15s;
}
.pyinterp-hist-btn:hover { background:var(--accent-dim); color:var(--accent-hover); }
.pyinterp-hist-btn:disabled { opacity: 0.3; cursor: default; }

/* Monaco specific overrides */
.monaco-editor { padding-top: 8px; }
`;
    document.head.appendChild(STYLE);

    const LS_CODE = 'toolbox_python_code';
    const LS_HIST = 'toolbox_python_history';



    ToolRegistry.register({
        id: 'python-interp',
        name: 'Python',
        icon: '🐍',
        description: 'Native Python with Monaco editor & syntax highlighting',
        tags: ['python', 'code', 'interpreter', 'repl', 'programming', 'script', 'ide'],
        defaultWidth: 720,
        defaultHeight: 600,
        minWidth: 480,
        minHeight: 400,

        createUI(container) {
            container.innerHTML = `
            <div class="pyinterp">
                <div class="pyinterp-toolbar">
                    <button class="btn btn-accent btn-sm" id="py-run"><span>▶</span> Run</button>
                    <button class="btn btn-sm" id="py-clear">Clear Output</button>
                    <button class="btn btn-sm" id="py-reset">Reset Editor</button>
                    <div style="width: 8px"></div>
                    <button class="pyinterp-hist-btn" id="py-hist-prev" title="Previous run (↑)">↑</button>
                    <button class="pyinterp-hist-btn" id="py-hist-next" title="Next run (↓)">↓</button>
                    <div class="pyinterp-status">
                        <span class="dot ready" id="py-dot"></span>
                        <span id="py-status">Python 3 (Native)</span>
                    </div>
                </div>
                <div class="pyinterp-editor-wrap">
                    <div class="pyinterp-editor-container" id="py-monaco-container"></div>
                    
                    <div class="pyinterp-output-header">
                        <span>Output</span>
                        <span class="pyinterp-timer" id="py-timer"></span>
                    </div>
                    <div class="pyinterp-output" id="py-out"><span class="py-info">Ready. Press ▶ Run or Ctrl+Enter to execute code.</span></div>
                </div>
            </div>`;

            const monacoCont = container.querySelector('#py-monaco-container');
            const outEl      = container.querySelector('#py-out');
            const runBtn     = container.querySelector('#py-run');
            const clearBtn   = container.querySelector('#py-clear');
            const resetBtn   = container.querySelector('#py-reset');
            const dotEl      = container.querySelector('#py-dot');
            const statusEl   = container.querySelector('#py-status');
            const timerEl    = container.querySelector('#py-timer');
            const histPrev   = container.querySelector('#py-hist-prev');
            const histNext   = container.querySelector('#py-hist-next');

            let editor = null;
            let runHistory = [];
            let histIdx = -1;
            let currentOrigin = null; // { filename, subfolder }


            /* ── Load History ─────────────────────────── */
            try { runHistory = JSON.parse(localStorage.getItem(LS_HIST)) || []; } catch {}

            function updateHistButtons() {
                histPrev.disabled = runHistory.length === 0 || histIdx === 0;
                histNext.disabled = histIdx === -1 || histIdx === runHistory.length - 1;
            }
            updateHistButtons();

            histPrev.onclick = () => {
                if (runHistory.length === 0) return;
                if (histIdx < 0) histIdx = runHistory.length;
                histIdx = Math.max(0, histIdx - 1);
                if (editor) editor.setValue(runHistory[histIdx]);
                updateHistButtons();
            };

            histNext.onclick = () => {
                if (histIdx < 0) return;
                histIdx = Math.min(runHistory.length - 1, histIdx + 1);
                if (editor) editor.setValue(runHistory[histIdx]);
                updateHistButtons();
            };

            /* ── Initialize Monaco ────────────────────── */
            async function initEditor() {
                try {
                    const monaco = await loadMonaco();
                    
                    const savedCode = localStorage.getItem(LS_CODE) || "print('Hello, Toolbox!')\n";
                    
                    editor = monaco.editor.create(monacoCont, {
                        value: savedCode,
                        language: 'python',
                        theme: 'vs-dark',
                        automaticLayout: true,
                        fontSize: 14,
                        fontFamily: "'JetBrains Mono', monospace",
                        lineHeight: 24,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        padding: { top: 10, bottom: 10 },
                        autoIndent: 'full',
                        formatOnPaste: true,
                        renderLineHighlight: 'all',
                        cursorSmoothCaretAnimation: 'on',
                        smoothScrolling: true,
                    });

                    // Save code on change
                    editor.onDidChangeModelContent(() => {
                        localStorage.setItem(LS_CODE, editor.getValue());
                    });

                    // Keybindings
                    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
                        run();
                    });

                    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
                        saveToWorkspace();
                    });

                    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyS, () => {
                        downloadFile();
                    });


                } catch (err) {
                    console.error('Failed to load Monaco:', err);
                    monacoCont.innerHTML = `<div style="padding: 20px; color: var(--error)">Failed to load editor: ${err.message}</div>`;
                }
            }

            initEditor();

            /* ── Run Logic ────────────────────────────── */
            async function run() {
                if (!editor) return;
                const code = editor.getValue().trim();
                if (!code) return;

                // Update history
                if (runHistory[runHistory.length - 1] !== code) {
                    runHistory.push(code);
                    if (runHistory.length > 50) runHistory.shift();
                    localStorage.setItem(LS_HIST, JSON.stringify(runHistory));
                }
                histIdx = -1;
                updateHistButtons();

                runBtn.disabled = true;
                runBtn.innerHTML = '<span>⏳</span> Running…';
                dotEl.className = 'dot loading';
                statusEl.textContent = 'Executing…';
                timerEl.textContent = '';

                const startTime = performance.now();

                try {
                    if (window.__TAURI__) {
                        const result = await window.__TAURI__.invoke('run_python', { code });
                        const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
                        timerEl.textContent = `${elapsed}s`;

                        let html = '';
                        if (result.stdout) html += `<div class="py-out">${escHtml(result.stdout)}</div>`;
                        if (result.stderr) html += `<div class="py-err">${escHtml(result.stderr)}</div>`;
                        if (!html) html = '<div class="py-info">(no output)</div>';
                        outEl.innerHTML = html;

                        dotEl.className = result.stderr ? 'dot error' : 'dot ready';
                        statusEl.textContent = result.stderr ? 'Error' : 'Finished';
                    } else {
                        outEl.innerHTML = '<div class="py-err">Native Python requires the Tauri runtime.\nPlease run the application via `npm run dev`.</div>';
                        dotEl.className = 'dot error';
                        statusEl.textContent = 'No Runtime';
                    }
                } catch (e) {
                    outEl.innerHTML = `<div class="py-err">${escHtml(String(e))}</div>`;
                    dotEl.className = 'dot error';
                    statusEl.textContent = 'Error';
                }

                runBtn.disabled = false;
                runBtn.innerHTML = '<span>▶</span> Run';
            }

            function escHtml(s) {
                return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
            }

            /* ── Control Handlers ─────────────────────── */
            runBtn.onclick = run;
            
            clearBtn.onclick = () => {
                outEl.innerHTML = '<div class="py-info">Output cleared.</div>';
                timerEl.textContent = '';
            };
            
            resetBtn.onclick = () => {
                if (editor && confirm('Clear editor?')) {
                    editor.setValue('');
                    localStorage.removeItem(LS_CODE);
                    currentOrigin = null;
                    statusEl.textContent = 'Python 3 (Native)';
                }
            };

            async function saveToWorkspace() {
                if (!window.__TAURI__ || !editor) return downloadFile();
                
                let filename = currentOrigin?.filename;
                let subfolder = currentOrigin?.subfolder;

                if (!filename) {
                    filename = prompt('Save Python script as:', 'script.py');
                    if (!filename) return;
                    if (!filename.endsWith('.py')) filename += '.py';
                    currentOrigin = { filename, subfolder: null };
                }

                statusEl.textContent = 'Saving…';
                try {
                    const res = await window.__TAURI__.invoke('workspace_write', {
                        req: { filename, content: editor.getValue(), subfolder }
                    });
                    if (res.success) {
                        statusEl.textContent = `Saved: ${filename}`;
                        dotEl.className = 'dot ready';
                    } else {
                        statusEl.textContent = 'Save Failed';
                        dotEl.className = 'dot error';
                    }
                } catch (e) {
                    statusEl.textContent = 'Error saving';
                }
            }

            function downloadFile() {
                const content = editor.getValue();
                const blob = new Blob([content], { type: 'text/plain' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = (currentOrigin?.filename || 'script.py');
                a.click();
                URL.revokeObjectURL(a.href);
            }


            // Window Resize listener (for Monaco automaticLayout: true usually works, but just in case)
            const observer = new ResizeObserver(() => {
                if (editor) editor.layout();
            });
            observer.observe(monacoCont);

            /* ── Cleanup & Messages ───────────────────── */
            return {
                cleanup: () => {
                    observer.disconnect();
                    if (editor) editor.dispose();
                },
                onMessage: (msg) => {
                    if (msg.type === 'open' && editor) {
                        editor.setValue(msg.content);
                        if (msg.filename) {
                            currentOrigin = { filename: msg.filename, subfolder: msg.subfolder };
                            statusEl.textContent = `Opened: ${msg.filename}`;
                        }
                    }
                }

            };

        }
    });
})();
