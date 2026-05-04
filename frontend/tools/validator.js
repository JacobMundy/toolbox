/* ═══════════════════════════════════════════════════════════
    Tool: Data Validator (Rust-Powered)
    ═══════════════════════════════════════════════════════════ */
(function () {
    const STYLE = document.createElement('style');
    STYLE.textContent = `
.val-root { display:flex; flex-direction:column; height:100%; overflow:hidden; background: var(--bg-primary); }
.val-toolbar {
    display:flex; align-items:center; gap:8px; padding:12px;
    border-bottom:1px solid var(--glass-border); background:rgba(0,0,0,0.1);
}
.val-main { display:flex; flex:1; min-height:0; }
.val-panel { flex:1; display:flex; flex-direction:column; min-width:0; }
.val-panel:first-child { border-right:1px solid var(--glass-border); }
.val-panel-header { 
    padding:8px 12px; font-size:11px; font-weight:700; color:var(--text-muted); 
    text-transform:uppercase; background:rgba(0,0,0,0.05);
    display: flex; justify-content: space-between; align-items: center;
}
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

/* Table View Styles */
.val-table-container {
    flex: 1; overflow: auto; padding: 0; background: var(--bg-secondary);
    display: none;
}
.val-table-container.active { display: block; }
.val-output-textarea.hidden { display: none; }

.val-data-table {
    width: 100%; border-collapse: collapse; font-size: 12px;
    color: var(--text-secondary);
}
.val-data-table th {
    position: sticky; top: 0; background: var(--bg-tertiary);
    padding: 10px 12px; text-align: left; font-weight: 600;
    border-bottom: 1px solid var(--glass-border); color: var(--text-primary);
    z-index: 10;
}
.val-data-table td {
    padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.03);
    white-space: nowrap; max-width: 300px; overflow: hidden; text-overflow: ellipsis;
}
.val-data-table tr:hover { background: rgba(255,255,255,0.02); }

.val-view-tabs { display: flex; gap: 4px; }
.val-tab {
    padding: 2px 8px; border-radius: 4px; cursor: pointer;
    font-size: 10px; transition: all .2s;
}
.val-tab:hover { background: rgba(255,255,255,0.05); }
.val-tab.active { background: var(--accent-dim); color: var(--accent-hover); }
`;
    document.head.appendChild(STYLE);

    ToolRegistry.register({
        id: 'validator',
        name: 'Data Validator',
        icon: '✅',
        description: 'Validate and format JSON/CSV data with table visualization',
        tags: ['json', 'csv', 'validate', 'format', 'lint', 'beautify', 'table', 'viewer'],
        defaultWidth: 1000,
        defaultHeight: 700,

        createUI(container) {
            const LS_KEY = 'toolbox_validator';

            container.innerHTML = `
            <div class="val-root">
                <div class="val-toolbar">
                    <select id="val-format" class="nav-btn" style="width: auto;">
                        <option value="json">JSON</option>
                        <option value="csv">CSV</option>
                    </select>
                    <button id="val-btn-run" class="btn btn-accent btn-sm">Validate & Process</button>
                    <div style="flex:1"></div>
                    <button id="val-btn-clear" class="btn btn-sm">Clear</button>
                </div>
                <div class="val-main">
                    <div class="val-panel">
                        <div class="val-panel-header">Input Data</div>
                        <textarea id="val-input" class="val-textarea" placeholder="Paste JSON or CSV data here..."></textarea>
                    </div>
                    <div class="val-panel">
                        <div class="val-panel-header">
                            <span>Output / Viewer</span>
                            <div class="val-view-tabs">
                                <div class="val-tab active" data-view="report">Report</div>
                                <div class="val-tab" data-view="table">Table View</div>
                            </div>
                        </div>
                        <textarea id="val-output" class="val-textarea val-output-textarea" readonly placeholder="Results will appear here..."></textarea>
                        <div id="val-table-view" class="val-table-container"></div>
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
            const tableView = container.querySelector('#val-table-view');
            const status = container.querySelector('#val-status');
            const tabs = container.querySelectorAll('.val-tab');

            let lastData = null;

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

            function switchView(viewName) {
                tabs.forEach(t => t.classList.toggle('active', t.dataset.view === viewName));
                if (viewName === 'table') {
                    output.classList.add('hidden');
                    tableView.classList.add('active');
                    renderTable();
                } else {
                    output.classList.remove('hidden');
                    tableView.classList.remove('active');
                }
            }

            tabs.forEach(tab => {
                tab.onclick = () => switchView(tab.dataset.view);
            });

            function renderTable() {
                if (!lastData) {
                    tableView.innerHTML = '<div style="padding:20px; color:var(--text-muted); font-size:12px;">No data to display in table. Run validation first.</div>';
                    return;
                }

                let items = [];
                if (Array.isArray(lastData)) {
                    items = lastData;
                } else if (typeof lastData === 'object' && lastData !== null) {
                    // Try to find an array in the object
                    for (const key in lastData) {
                        if (Array.isArray(lastData[key])) {
                            items = lastData[key];
                            break;
                        }
                    }
                    if (items.length === 0) items = [lastData]; // Single object
                }

                if (items.length === 0 || typeof items[0] !== 'object') {
                    tableView.innerHTML = '<div style="padding:20px; color:var(--text-muted); font-size:12px;">Data format not suitable for table view (expecting array of objects).</div>';
                    return;
                }

                const headers = Array.from(new Set(items.flatMap(item => Object.keys(item))));
                
                let html = '<table class="val-data-table"><thead><tr>';
                headers.forEach(h => html += `<th>${escape(h)}</th>`);
                html += '</tr></thead><tbody>';

                items.forEach(item => {
                    html += '<tr>';
                    headers.forEach(h => {
                        const val = item[h];
                        const displayVal = (val === null || val === undefined) ? '' : 
                                         (typeof val === 'object' ? JSON.stringify(val) : String(val));
                        html += `<td title="${escape(displayVal)}">${escape(displayVal)}</td>`;
                    });
                    html += '</tr>';
                });

                html += '</tbody></table>';
                tableView.innerHTML = html;
            }

            runBtn.onclick = async () => {
                const text = input.value.trim();
                if (!text) return;

                status.textContent = 'Processing...';
                status.className = '';
                lastData = null;

                try {
                    const result = await window.__TAURI__.invoke('validate_data', {
                        req: { text, format: formatSelect.value }
                    });

                    if (result.is_valid) {
                        output.value = result.output;
                        lastData = result.data;
                        status.textContent = `✅ Valid ${formatSelect.value.toUpperCase()}`;
                        status.className = 'val-status-ok';
                        
                        // Auto-switch to table view if it's a large data set
                        if (Array.isArray(lastData) && lastData.length > 0) {
                            switchView('table');
                        } else {
                            switchView('report');
                        }
                    } else {
                        output.value = `Error: ${result.error}\n` + 
                                     (result.line ? `Line: ${result.line}, Column: ${result.col || '?'}` : '');
                        status.textContent = '❌ Invalid Data';
                        status.className = 'val-status-err';
                        switchView('report');
                    }
                } catch (err) {
                    status.textContent = '❌ System Error';
                    output.value = err;
                    switchView('report');
                }
            };

            clearBtn.onclick = () => {
                input.value = '';
                output.value = '';
                lastData = null;
                tableView.innerHTML = '';
                status.textContent = 'Ready';
                status.className = '';
                switchView('report');
                saveState();
            };

            function escape(str) {
                if (!str) return "";
                return String(str).replace(/[&<>"']/g, m => ({
                    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
                }[m]));
            }

            return () => clearTimeout(saveTimer);
        }
    });
})();
