/* ═══════════════════════════════════════════════════════════
   Tool: HTML Viewer
   ═══════════════════════════════════════════════════════════ */
(function () {
    const STYLE = document.createElement('style');
    STYLE.textContent = `
.hv-container { display: flex; flex-direction: column; height: 100%; font-family: 'Inter', sans-serif; overflow: hidden; background: var(--bg-body); }
.hv-toolbar { display: flex; gap: 12px; padding: 10px 16px; background: rgba(0,0,0,0.12); border-bottom: 1px solid var(--glass-border); align-items: center; flex-shrink: 0; }
.hv-checkbox-label { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-secondary); cursor: pointer; user-select: none; }
.hv-checkbox-label input { accent-color: var(--accent); }
.hv-spacer { flex: 1; }
.hv-split { display: flex; flex: 1; overflow: hidden; }
.hv-editor-pane { flex: 1; display: flex; flex-direction: column; min-width: 0; border-right: 1px solid var(--glass-border); position: relative; }
.hv-textarea { flex: 1; border: none; background: var(--bg-input); color: var(--text-primary); font-family: 'JetBrains Mono', monospace; font-size: 13px; padding: 12px; outline: none; resize: none; box-sizing: border-box; }
.hv-textarea:focus { background: rgba(var(--accent-rgb), 0.02); }
.hv-monaco { flex: 1; width: 100%; height: 100%; }
.hv-preview-pane { flex: 1; display: flex; flex-direction: column; min-width: 0; background: #fff; position: relative; }
.hv-iframe { flex: 1; border: none; width: 100%; height: 100%; background: #fff; }

@media (max-width: 680px) {
    .hv-split { flex-direction: column; }
    .hv-editor-pane { border-right: none; border-bottom: 1px solid var(--glass-border); height: 50%; }
    .hv-preview-pane { height: 50%; }
}
`;
    document.head.appendChild(STYLE);

    const LS_KEY = 'toolbox_html_viewer_code';
    const LS_AUTO = 'toolbox_html_viewer_autorun';

    const DIALOG_INJECTION = `
<script>
(function() {
    window.alert = function(msg) {
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.inset = '0';
        overlay.style.background = 'rgba(15, 23, 42, 0.7)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '999999';
        overlay.style.fontFamily = 'system-ui, -apple-system, sans-serif';
        overlay.style.padding = '20px';
        
        const box = document.createElement('div');
        box.style.background = '#1e293b';
        box.style.color = '#f8fafc';
        box.style.padding = '20px 24px';
        box.style.borderRadius = '12px';
        box.style.border = '1px solid rgba(255,255,255,0.1)';
        box.style.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.5)';
        box.style.maxWidth = '320px';
        box.style.width = '100%';
        box.style.textAlign = 'center';
        box.style.boxSizing = 'border-box';
        
        const text = document.createElement('p');
        text.textContent = msg;
        text.style.margin = '0 0 18px 0';
        text.style.fontSize = '14px';
        text.style.lineHeight = '1.5';
        text.style.wordBreak = 'break-word';
        
        const btn = document.createElement('button');
        btn.textContent = 'OK';
        btn.style.background = '#7c6cf0';
        btn.style.color = '#fff';
        btn.style.border = 'none';
        btn.style.padding = '8px 24px';
        btn.style.borderRadius = '8px';
        btn.style.fontWeight = '600';
        btn.style.cursor = 'pointer';
        btn.style.fontSize = '13px';
        btn.style.transition = 'background 0.2s';
        btn.onmouseover = () => btn.style.background = '#9585ff';
        btn.onmouseout = () => btn.style.background = '#7c6cf0';
        btn.onclick = () => overlay.remove();
        
        box.appendChild(text);
        box.appendChild(btn);
        overlay.appendChild(box);
        (document.body || document.documentElement).appendChild(overlay);
    };
    window.confirm = function(msg) {
        console.log('Confirm blocked in sandbox:', msg);
        return true;
    };
    window.prompt = function(msg) {
        console.log('Prompt blocked in sandbox:', msg);
        return null;
    };
})();
</script>
`;

    const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HTML Viewer Sample</title>
    <style>
        body {
            font-family: 'Inter', -apple-system, sans-serif;
            background: linear-gradient(135deg, #0f172a, #1e1b4b);
            color: #f8fafc;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
            text-align: center;
            box-sizing: border-box;
        }
        .card {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(12px);
            padding: 2.5rem;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            max-width: 420px;
            transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .card:hover {
            transform: translateY(-8px);
            border-color: rgba(124, 108, 240, 0.4);
        }
        h1 {
            margin-top: 0;
            font-size: 28px;
            background: linear-gradient(135deg, #a78bfa, #c084fc);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        p {
            color: #94a3b8;
            font-size: 14px;
            line-height: 1.6;
            margin-bottom: 24px;
        }
        button {
            background: #7c6cf0;
            color: white;
            border: none;
            padding: 10px 24px;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 4px 12px rgba(124, 108, 240, 0.3);
        }
        button:hover {
            background: #9585ff;
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(124, 108, 240, 0.4);
        }
        button:active {
            transform: translateY(1px);
        }
    </style>
</head>
<body>
    <div class="card">
        <h1>HTML Live Viewer</h1>
        <p>Edit this HTML source in the left pane. The preview pane on the right will update in real-time!</p>
        <button id="alert-btn">Test Interactive JS</button>
    </div>

    <script>
        document.getElementById('alert-btn').addEventListener('click', () => {
            alert('Hello! JS is running securely inside a sandboxed frame.');
        });
    </script>
</body>
</html>`;

    ToolRegistry.register({
        id: 'html-viewer',
        name: 'HTML Viewer',
        icon: '🌐',
        description: 'Paste, edit, and preview HTML/CSS/JS documents in real-time',
        tags: ['html', 'css', 'javascript', 'preview', 'render', 'iframe', 'sandbox', 'web'],
        defaultWidth: 840,
        defaultHeight: 560,
        minWidth: 460,
        minHeight: 320,

        createUI(container) {
            container.innerHTML = `
            <div class="hv-container">
                <div class="hv-toolbar">
                    <button class="btn btn-sm btn-accent" id="hv-run-btn">▶ Run Code</button>
                    <label class="hv-checkbox-label">
                        <input type="checkbox" id="hv-auto-run" checked> Auto Run
                    </label>
                    <div class="hv-spacer"></div>
                    <button class="btn btn-sm" id="hv-sample-btn">📄 Load Sample</button>
                    <button class="btn btn-sm btn-danger" id="hv-clear-btn">🗑 Clear</button>
                </div>
                <div class="hv-split">
                    <div class="hv-editor-pane">
                        <textarea class="hv-textarea" id="hv-textarea" placeholder="Paste or write HTML code here..."></textarea>
                        <div class="hv-monaco" id="hv-monaco" style="display: none;"></div>
                    </div>
                    <div class="hv-preview-pane">
                        <iframe class="hv-iframe" id="hv-iframe" sandbox="allow-scripts allow-modals allow-forms"></iframe>
                    </div>
                </div>
            </div>`;

            const runBtn = container.querySelector('#hv-run-btn');
            const autoRunCheck = container.querySelector('#hv-auto-run');
            const sampleBtn = container.querySelector('#hv-sample-btn');
            const clearBtn = container.querySelector('#hv-clear-btn');
            const textarea = container.querySelector('#hv-textarea');
            const monacoCont = container.querySelector('#hv-monaco');
            const iframe = container.querySelector('#hv-iframe');

            let editor = null;
            let autoRun = true;
            let runTimer = null;

            // Load saved settings
            try {
                autoRun = localStorage.getItem(LS_AUTO) !== 'false';
                autoRunCheck.checked = autoRun;
                const savedCode = localStorage.getItem(LS_KEY);
                textarea.value = savedCode !== null ? savedCode : DEFAULT_HTML;
            } catch {}

            // Update iframe preview
            function updatePreview() {
                const code = editor ? editor.getValue() : textarea.value;
                iframe.srcdoc = DIALOG_INJECTION + code;
            }

            // Debounced update preview
            function triggerAutoRun() {
                if (!autoRun) return;
                clearTimeout(runTimer);
                runTimer = setTimeout(updatePreview, 400);
            }

            // Bind manual run button
            runBtn.addEventListener('click', () => {
                updatePreview();
            });

            // Bind checkbox
            autoRunCheck.addEventListener('change', () => {
                autoRun = autoRunCheck.checked;
                try { localStorage.setItem(LS_AUTO, autoRun); } catch {}
                if (autoRun) updatePreview();
            });

            // Clear editor
            clearBtn.addEventListener('click', () => {
                if (confirm('Clear the code editor?')) {
                    if (editor) editor.setValue('');
                    else textarea.value = '';
                    try { localStorage.setItem(LS_KEY, ''); } catch {}
                    updatePreview();
                }
            });

            // Load Sample code
            sampleBtn.addEventListener('click', () => {
                if (editor) editor.setValue(DEFAULT_HTML);
                else textarea.value = DEFAULT_HTML;
                try { localStorage.setItem(LS_KEY, DEFAULT_HTML); } catch {}
                updatePreview();
            });

            // Textarea input binding (fallback)
            textarea.addEventListener('input', () => {
                try { localStorage.setItem(LS_KEY, textarea.value); } catch {}
                triggerAutoRun();
            });

            // Initialize Monaco if loaded
            async function initMonaco() {
                if (!window.loadMonaco) return;
                try {
                    const monaco = await window.loadMonaco();
                    
                    // Hide textarea and show monaco
                    textarea.style.display = 'none';
                    monacoCont.style.display = 'block';

                    editor = monaco.editor.create(monacoCont, {
                        value: textarea.value,
                        language: 'html',
                        theme: 'vs-dark',
                        automaticLayout: true,
                        fontSize: 13,
                        fontFamily: "'JetBrains Mono', monospace",
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        renderLineHighlight: 'all',
                        padding: { top: 8, bottom: 8 },
                        cursorSmoothCaretAnimation: 'on',
                        smoothScrolling: true,
                    });

                    // Save code on change
                    editor.onDidChangeModelContent(() => {
                        const code = editor.getValue();
                        try { localStorage.setItem(LS_KEY, code); } catch {}
                        triggerAutoRun();
                    });

                    // Custom Run Keyboard command (Ctrl+Enter) inside Monaco
                    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
                        updatePreview();
                    });

                } catch (e) {
                    console.error('Failed to load Monaco inside HTML Viewer:', e);
                }
            }

            // Launch Monaco loading
            initMonaco().then(() => {
                // Perform initial run
                updatePreview();
            });

            // Return cleanups
            return () => {
                clearTimeout(runTimer);
                if (editor) editor.dispose();
            };
        }
    });
})();
