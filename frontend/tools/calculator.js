/* ═══════════════════════════════════════════════════════════
   Tool: Calculator (Standard + Scientific Mode)
   ═══════════════════════════════════════════════════════════ */
(function () {
    const STYLE = document.createElement('style');
    STYLE.textContent = `
.calc { display:flex; height:100%; font-family:'Inter',sans-serif; }
.calc-main { flex:1; display:flex; flex-direction:column; min-width:0; }

/* Display */
.calc-display {
    padding:10px 20px 14px;
    background:linear-gradient(180deg, rgba(255,255,255,.02), transparent);
    border-bottom:1px solid var(--glass-border);
    text-align:right;
    flex-shrink:0;
    position:relative;
}
.calc-display-top {
    display:flex; align-items:center; justify-content:space-between;
    min-height:24px;
}
.calc-expr {
    font-size:14px; color:var(--text-muted); height:20px;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    font-family:'JetBrains Mono',monospace;
    flex:1; text-align:right;
}
.calc-result {
    font-size:36px; font-weight:600; color:var(--text-primary);
    font-family:'JetBrains Mono',monospace;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    margin-top:4px; line-height:1.2;
    transition:color .15s;
}
.calc-result.error { color:var(--error); font-size:16px; }

/* Mode toggle */
.calc-mode-bar {
    display:flex; padding:4px 8px; gap:4px;
    border-bottom:1px solid var(--glass-border);
    background:rgba(0,0,0,0.08);
}
.calc-mode-btn {
    flex:1; padding:5px; font-size:11px; font-weight:600;
    border:none; border-radius:var(--r-sm); cursor:pointer;
    background:transparent; color:var(--text-muted);
    transition:all .15s; text-transform:uppercase; letter-spacing:.04em;
}
.calc-mode-btn.active {
    background:var(--accent-dim); color:var(--accent-hover);
}
.calc-mode-btn:hover:not(.active) { background:rgba(255,255,255,.05); }

/* Button grid */
.calc-grid {
    display:grid;
    gap:5px; padding:8px; flex:1;
}
.calc-grid.standard { grid-template-columns:repeat(4,1fr); }
.calc-grid.scientific { grid-template-columns:repeat(5,1fr); }

.calc-btn {
    display:flex; align-items:center; justify-content:center;
    font-size:16px; font-weight:500;
    border:none; border-radius:var(--r-sm);
    cursor:pointer; transition:all .12s;
    background:var(--bg-secondary); color:var(--text-primary);
    font-family:'Inter',sans-serif;
    min-height:42px;
}
.calc-btn:hover { background:var(--bg-tertiary); }
.calc-btn:active { transform:scale(.95); }
.calc-btn.op   { background:var(--bg-tertiary); color:var(--accent-hover); }
.calc-btn.op:hover { background:rgba(124,108,240,.18); }
.calc-btn.eq   { background:var(--accent); color:#fff; }
.calc-btn.eq:hover { background:var(--accent-hover); }
.calc-btn.fn   { color:var(--text-secondary); font-size:13px; }
.calc-btn.sci  { color:var(--success); font-size:12px; background:rgba(52,211,153,.06); }
.calc-btn.sci:hover { background:rgba(52,211,153,.14); }

/* History sidebar */
.calc-history {
    width:0; overflow:hidden; transition:width .25s var(--ease-out);
    border-left:1px solid var(--glass-border);
    display:flex; flex-direction:column;
}
.calc-history.open { width:220px; }
.calc-hist-header {
    display:flex; justify-content:space-between; align-items:center;
    padding:10px 12px; border-bottom:1px solid var(--glass-border);
    font-size:12px; font-weight:600; color:var(--text-secondary);
}
.calc-hist-list { flex:1; overflow-y:auto; padding:6px; }
.calc-hist-item {
    padding:8px 10px; border-radius:var(--r-sm); cursor:pointer;
    transition:background .12s; font-family:'JetBrains Mono',monospace; font-size:12px;
}
.calc-hist-item:hover { background:var(--accent-dim); }
.calc-hist-expr { color:var(--text-muted); }
.calc-hist-val  { color:var(--text-primary); font-weight:500; margin-top:2px; }

/* Toggle button */
.calc-hist-toggle {
    width:28px; height:28px; border:none;
    background:rgba(255,255,255,.04); color:var(--text-muted);
    border-radius:var(--r-sm); cursor:pointer; font-size:14px;
    display:flex; align-items:center; justify-content:center;
    transition:all .15s; flex-shrink:0;
}
.calc-hist-toggle:hover { background:var(--accent-dim); color:var(--accent-hover); }
`;
    document.head.appendChild(STYLE);

    const LS_HIST = 'toolbox_calc_history';
    const LS_MODE = 'toolbox_calc_mode';

    // Standard buttons
    const STD_BUTTONS = [
        { t: 'C', cls: 'fn' },  { t: '(', cls: 'fn' }, { t: ')', cls: 'fn' }, { t: '÷', cls: 'op' },
        { t: '7' },  { t: '8' },  { t: '9' },  { t: '×', cls: 'op' },
        { t: '4' },  { t: '5' },  { t: '6' },  { t: '−', cls: 'op' },
        { t: '1' },  { t: '2' },  { t: '3' },  { t: '+', cls: 'op' },
        { t: '±', cls: 'fn' }, { t: '0' },  { t: '.' },  { t: '=', cls: 'eq' },
    ];

    // Scientific buttons (5-column layout)
    const SCI_BUTTONS = [
        { t: 'sin', cls: 'sci' }, { t: 'cos', cls: 'sci' }, { t: 'tan', cls: 'sci' }, { t: 'C', cls: 'fn' }, { t: '÷', cls: 'op' },
        { t: 'ln', cls: 'sci' },  { t: 'log', cls: 'sci' }, { t: '√', cls: 'sci' },   { t: '(', cls: 'fn' }, { t: ')', cls: 'fn' },
        { t: 'x²', cls: 'sci' }, { t: 'xⁿ', cls: 'sci' }, { t: 'π', cls: 'sci' },   { t: 'e', cls: 'sci' }, { t: '×', cls: 'op' },
        { t: 'x!', cls: 'sci' }, { t: '7' },  { t: '8' },  { t: '9' },  { t: '−', cls: 'op' },
        { t: '|x|', cls: 'sci' }, { t: '4' },  { t: '5' },  { t: '6' },  { t: '+', cls: 'op' },
        { t: '1/x', cls: 'sci' }, { t: '1' },  { t: '2' },  { t: '3' },  { t: '=', cls: 'eq' },
        { t: '%', cls: 'sci' }, { t: '±', cls: 'fn' }, { t: '0' },  { t: '.' },  { t: 'DEL', cls: 'fn' },
    ];

    ToolRegistry.register({
        id: 'calculator',
        name: 'Calculator',
        icon: '🧮',
        description: 'Standard & scientific calculator with history',
        tags: ['math', 'calculate', 'arithmetic', 'expression', 'numbers', 'scientific', 'trig'],
        defaultWidth: 420,
        defaultHeight: 520,
        minWidth: 320,
        minHeight: 440,

        createUI(container) {
            container.style.position = 'relative';
            container.innerHTML = `
            <div class="calc">
                <div class="calc-main">
                    <div class="calc-display">
                        <div class="calc-display-top">
                            <button class="calc-hist-toggle" id="calc-ht" title="History">🕘</button>
                            <div class="calc-expr" id="calc-expr"></div>
                        </div>
                        <div class="calc-result" id="calc-res">0</div>
                    </div>
                    <div class="calc-mode-bar">
                        <button class="calc-mode-btn active" data-mode="standard">Standard</button>
                        <button class="calc-mode-btn" data-mode="scientific">Scientific</button>
                    </div>
                    <div class="calc-grid standard" id="calc-grid"></div>
                </div>
                <div class="calc-history" id="calc-hist">
                    <div class="calc-hist-header">
                        <span>History</span>
                        <button class="btn btn-sm" id="calc-hclear">Clear</button>
                    </div>
                    <div class="calc-hist-list" id="calc-hlist"></div>
                </div>
            </div>`;

            const exprEl = container.querySelector('#calc-expr');
            const resEl  = container.querySelector('#calc-res');
            const grid   = container.querySelector('#calc-grid');
            const histEl = container.querySelector('#calc-hist');
            const hList  = container.querySelector('#calc-hlist');
            const modeBtns = container.querySelectorAll('.calc-mode-btn');

            let expr = '';
            let justEvaluated = false;
            let mode = 'standard';

            // Restore mode
            try { mode = localStorage.getItem(LS_MODE) || 'standard'; } catch {}

            // History
            let history = [];
            try { history = JSON.parse(localStorage.getItem(LS_HIST)) || []; } catch {}

            function saveHistory() {
                try { localStorage.setItem(LS_HIST, JSON.stringify(history.slice(-100))); } catch {}
            }
            function renderHistory() {
                hList.innerHTML = history.slice().reverse().map((h, i) => `
                    <div class="calc-hist-item" data-idx="${history.length - 1 - i}">
                        <div class="calc-hist-expr">${h.expr}</div>
                        <div class="calc-hist-val">= ${h.result}</div>
                    </div>`).join('');
                hList.querySelectorAll('.calc-hist-item').forEach(el => {
                    el.addEventListener('click', () => {
                        const h = history[+el.dataset.idx];
                        expr = String(h.result);
                        updateDisplay();
                    });
                });
            }
            renderHistory();

            // Render buttons
            function renderGrid() {
                const btns = mode === 'scientific' ? SCI_BUTTONS : STD_BUTTONS;
                grid.className = `calc-grid ${mode}`;
                grid.innerHTML = btns.map(b =>
                    `<button class="calc-btn ${b.cls || ''}" data-val="${b.t}">${b.t}</button>`
                ).join('');

                // Update mode buttons
                modeBtns.forEach(b => {
                    b.classList.toggle('active', b.dataset.mode === mode);
                });

                // Dynamically update window minWidth based on mode and history
                updateWindowMinSize();

                try { localStorage.setItem(LS_MODE, mode); } catch {}
            }
            renderGrid();

            // Mode switch
            modeBtns.forEach(b => {
                b.addEventListener('click', () => {
                    mode = b.dataset.mode;
                    renderGrid();
                });
            });
            
            function updateWindowMinSize() {
                const win = container.closest('.window');
                if (!win) return;
                
                const isScientific = mode === 'scientific';
                const baseWidth = isScientific ? 400 : 320;
                const baseHeight = isScientific ? 540 : 440;
                
                const historyWidth = histEl.classList.contains('open') ? 220 : 0;
                const totalMinWidth = baseWidth + historyWidth;
                
                // Update window min-sizes
                win.style.minWidth = totalMinWidth + 'px';
                win.style.minHeight = baseHeight + 'px';
                
                // If current width/height is smaller than new minWidth/minHeight, resize the window
                const currentWidth = parseInt(win.style.width);
                const currentHeight = parseInt(win.style.height);
                
                if (currentWidth < totalMinWidth) {
                    win.style.width = totalMinWidth + 'px';
                }
                if (currentHeight < baseHeight) {
                    win.style.height = baseHeight + 'px';
                }
            }

            // Display
            function updateDisplay() {
                exprEl.textContent = '';
                resEl.classList.remove('error');
                if (!expr) { resEl.textContent = '0'; return; }
                resEl.textContent = expr;

                // Live preview
                try {
                    const val = evaluate(expr);
                    if (val !== undefined && !isNaN(val) && isFinite(val)) {
                        exprEl.textContent = '= ' + formatNum(val);
                    }
                } catch {}
            }

            function formatNum(n) {
                if (Number.isInteger(n) && Math.abs(n) < 1e15) return n.toLocaleString();
                return parseFloat(n.toPrecision(12)).toString();
            }

            function factorial(n) {
                if (n < 0) return NaN;
                if (n === 0 || n === 1) return 1;
                if (n > 170) return Infinity;
                let r = 1;
                for (let i = 2; i <= n; i++) r *= i;
                return r;
            }

            function evaluate(raw) {
                let s = raw
                    .replace(/×/g, '*')
                    .replace(/÷/g, '/')
                    .replace(/−/g, '-')
                    .replace(/π/g, `(${Math.PI})`)
                    .replace(/(?<![a-z])e(?![a-z])/gi, `(${Math.E})`)
                    .replace(/sin\(/g, 'Math.sin(')
                    .replace(/cos\(/g, 'Math.cos(')
                    .replace(/tan\(/g, 'Math.tan(')
                    .replace(/ln\(/g, 'Math.log(')
                    .replace(/log\(/g, 'Math.log10(')
                    .replace(/√\(/g, 'Math.sqrt(')
                    .replace(/abs\(/g, 'Math.abs(');

                // Validate (extended for Math. calls)
                if (!/^[\d+\-*/.() %eMath.sincotalgqrb0-9,]+$/i.test(s)) throw new Error('Invalid');
                return new Function('return ' + s)();
            }

            // Input handling
            function press(val) {
                if (val === 'C') {
                    expr = '';
                    justEvaluated = false;
                    updateDisplay();
                    return;
                }
                if (val === 'DEL') {
                    expr = expr.slice(0, -1);
                    justEvaluated = false;
                    updateDisplay();
                    return;
                }
                if (val === '=') {
                    try {
                        const result = evaluate(expr);
                        const display = formatNum(result);
                        exprEl.textContent = expr + ' =';
                        resEl.textContent = display;
                        history.push({ expr, result: display });
                        saveHistory();
                        renderHistory();
                        expr = display.replace(/,/g, '');
                        justEvaluated = true;
                    } catch {
                        resEl.textContent = 'Error';
                        resEl.classList.add('error');
                    }
                    return;
                }
                if (val === '±') {
                    if (!expr) return;
                    const match = expr.match(/(.*?)(-?[\d.]+)$/);
                    if (match) {
                        const prefix = match[1];
                        const num = match[2];
                        expr = num.startsWith('-')
                            ? prefix + num.slice(1)
                            : prefix + '-' + num;
                    }
                    updateDisplay();
                    return;
                }

                // Scientific functions that wrap in parens
                const fnMap = {
                    'sin': 'sin(', 'cos': 'cos(', 'tan': 'tan(',
                    'ln': 'ln(', 'log': 'log(', '√': '√(',
                    '|x|': 'abs(', 'x²': '²', 'xⁿ': '^(',
                    'x!': '!', '1/x': '1/(', '%': '/100',
                    'π': 'π', 'e': 'e',
                };

                if (fnMap[val] !== undefined) {
                    const mapped = fnMap[val];
                    if (justEvaluated && /^[a-z√(]/i.test(mapped)) {
                        // Wrap previous result in function
                    } else if (justEvaluated) {
                        // Append to result
                    }
                    justEvaluated = false;

                    if (val === 'x²') {
                        expr = `(${expr})**2`;
                    } else if (val === 'x!') {
                        try {
                            const n = evaluate(expr);
                            expr = String(factorial(Math.round(n)));
                        } catch { expr += '!'; }
                    } else if (val === 'xⁿ') {
                        expr += '**';
                    } else {
                        expr += mapped;
                    }
                    updateDisplay();
                    return;
                }

                // If just evaluated & user types a digit, start fresh
                if (justEvaluated && /[\d.]/.test(val)) {
                    expr = '';
                }
                justEvaluated = false;
                expr += val;
                updateDisplay();
            }

            grid.addEventListener('click', e => {
                const btn = e.target.closest('.calc-btn');
                if (btn) press(btn.dataset.val);
            });

            // Keyboard support
            function onKey(e) {
                const win = container.closest('.window');
                if (!win || !win.classList.contains('active')) return;
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

                const map = { Enter: '=', Escape: 'C', Backspace: 'DEL',
                              '*': '×', '/': '÷', '-': '−', Delete: 'C' };
                let val = map[e.key] || e.key;

                if (/^[\d+\-×÷.()=C]$/.test(val) || val === '±' || val === '−' || val === 'DEL') {
                    press(val);
                    e.preventDefault();
                }
            }
            document.addEventListener('keydown', onKey);

            // History toggle
            container.querySelector('#calc-ht').addEventListener('click', () => {
                histEl.classList.toggle('open');
                updateWindowMinSize();
            });
            container.querySelector('#calc-hclear').addEventListener('click', () => {
                history = [];
                saveHistory();
                renderHistory();
            });

            updateDisplay();
            // Need a slight delay to allow the window manager to mount the container before setting minWidth
            setTimeout(updateWindowMinSize, 50);

            // Cleanup
            return () => document.removeEventListener('keydown', onKey);
        }
    });
})();
