/* ═══════════════════════════════════════════════════════════
    Tool: Data Validator (Rust-Powered)
    ═══════════════════════════════════════════════════════════ */
(function () {
    const STYLE = document.createElement('style');
    STYLE.textContent = `
.val-root { display:flex; flex-direction:column; height:100%; overflow:hidden; }
.val-toolbar {
    display:flex; align-items:center; gap:8px; padding:12px;
    border-bottom:1px solid var(--glass-border); background:rgba(0,0,0,0.1);
}
.val-main { display:flex; flex:1; min-height:0; }
.val-panel { flex:1; display:flex; flex-direction:column; min-width:0; }
.val-panel:first-child { border-right:1px solid var(--glass-border); }
.val-panel-header { padding:8px 12px; font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; background:rgba(0,0,0,0.05); }
.val-textarea {
    flex:1; background:transparent; color:var(--text-primary); border:none; outline:none;
    padding:12px; font-family:'JetBrains Mono',monospace; font-size:13px; resize:none;
}
.val-footer {
    display:flex; align-items:center; justify-content:space-between;
    padding:8px 12px; border-top:1px solid var(--glass-border);
    font-size:11px; color:var(--text-muted); background:rgba(0,0,0,0.1);
}
.val-status-ok { color:var(--success); }
.val-status-err { color:var(--error); }
`;
    document.head.appendChild(STYLE);

    ToolRegistry.register({
        id: 'validator',
        name: 'Data Validator',
        icon: '✅',
        description: 'Validate and format JSON/CSV data',
        tags: ['json', 'csv', 'validate', 'format', 'lint', 'beautify'],
        defaultWidth: 900,
        defaultHeight: 600,

        createUI(container) {
            const LS_KEY = 'toolbox_validator';

            container.innerHTML = `
            <div class="val-root">
                <div class="val-toolbar">
                    <select id="val-format" class="nav-btn" style="width: auto;">
                        <option value="json">JSON</option>
                        <option value="csv">CSV</option>
                    </select>
                    <button id="val-btn-run" class="btn btn-accent btn-sm">Validate & Format</button>
                    <div style="flex:1"></div>
                    <button id="val-btn-clear" class="btn btn-sm">Clear</button>
                </div>
                <div class="val-main">
                    <div class="val-panel">
                        <div class="val-panel-header">Input</div>
                        <textarea id="val-input" class="val-textarea" placeholder="Paste data here..."></textarea>
                    </div>
                    <div class="val-panel">
                        <div class="val-panel-header">Output / Report</div>
                        <textarea id="val-output" class="val-textarea" readonly placeholder="Results will appear here..."></textarea>
                    </div>
                </div>
                <div class="val-footer">
                    <span id="val-status">Ready</span>
                    <span id="val-stats"></span>
                </div>
            </div>`;

            const formatSelect = container.querySelector('#val-format');
            const runBtn = container.querySelector('#val-btn-run');
            const clearBtn = container.querySelector('#val-btn-clear');
            const input = container.querySelector('#val-input');
            const output = container.querySelector('#val-output');
            const status = container.querySelector('#val-status');

            // Restore state
            try {
                const saved = JSON.parse(localStorage.getItem(LS_KEY));
                if (saved) {
                    input.value = saved.input || '';
                    if (saved.format) formatSelect.value = saved.format;
                }
            } catch {}

            let saveTimer = null;
            function saveState() {
                clearTimeout(saveTimer);
                saveTimer = setTimeout(() => {
                    try {
                        localStorage.setItem(LS_KEY, JSON.stringify({
                            input: input.value,
                            format: formatSelect.value,
                        }));
                    } catch {}
                }, 400);
            }

            input.addEventListener('input', saveState);
            formatSelect.addEventListener('change', saveState);

            runBtn.onclick = async () => {
                const text = input.value.trim();
                if (!text) return;

                status.textContent = 'Validating...';
                status.className = '';

                try {
                    const result = await window.__TAURI__.invoke('validate_data', {
                        req: { text, format: formatSelect.value }
                    });

                    if (result.is_valid) {
                        output.value = result.output;
                        status.textContent = '✅ Valid Data';
                        status.className = 'val-status-ok';
                    } else {
                        output.value = `Error: ${result.error}\n` + 
                                     (result.line ? `Line: ${result.line}, Column: ${result.col || '?'}` : '');
                        status.textContent = '❌ Invalid Data';
                        status.className = 'val-status-err';
                    }
                } catch (err) {
                    status.textContent = '❌ System Error';
                    output.value = err;
                }
            };

            clearBtn.onclick = () => {
                input.value = '';
                output.value = '';
                status.textContent = 'Ready';
                status.className = '';
                saveState();
            };

            return () => clearTimeout(saveTimer);
        }
    });
})();
