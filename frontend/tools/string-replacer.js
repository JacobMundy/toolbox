/* ═══════════════════════════════════════════════════════════
   Tool: String Replacer
   ═══════════════════════════════════════════════════════════ */
(function () {
    const STYLE = document.createElement('style');
    STYLE.textContent = `
.str-replacer { display:flex; flex-direction:column; height:100%; padding:16px; gap:12px; }
.str-replacer textarea {
    flex:1; min-height:80px; resize:vertical;
    background:var(--bg-input); color:var(--text-primary);
    border:1px solid var(--glass-border); border-radius:var(--r-sm);
    padding:10px 12px; font-family:'JetBrains Mono',monospace; font-size:13px;
    outline:none; transition:border-color .2s;
}
.str-replacer textarea:focus { border-color:var(--accent); }
.str-row { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.str-row label { font-size:12px; color:var(--text-secondary); display:flex; align-items:center; gap:4px; cursor:pointer; }
.str-row input[type="text"] {
    flex:1; min-width:120px;
    background:var(--bg-input); color:var(--text-primary);
    border:1px solid var(--glass-border); border-radius:var(--r-sm);
    padding:7px 10px; font-size:13px; outline:none; transition:border-color .2s;
}
.str-row input[type="text"]:focus { border-color:var(--accent); }
.str-row input[type="checkbox"] { accent-color:var(--accent); }
.str-result-header { display:flex; justify-content:space-between; align-items:center; }
.str-result-header span { font-size:12px; color:var(--text-muted); }
.str-label { font-size:12px; font-weight:500; color:var(--text-secondary); }
`;
    document.head.appendChild(STYLE);

    const LS_KEY = 'toolbox_str_replacer';

    ToolRegistry.register({
        id: 'string-replacer',
        name: 'String Replacer',
        icon: '🔤',
        description: 'Find and replace characters or patterns in text',
        tags: ['string', 'text', 'replace', 'find', 'regex', 'characters', 'pattern'],
        defaultWidth: 560,
        defaultHeight: 520,
        minWidth: 380,
        minHeight: 340,

        createUI(container) {
            container.innerHTML = `
            <div class="str-replacer">
                <div class="str-label">Source Text</div>
                <textarea id="str-src" placeholder="Paste or type your text here…" spellcheck="false"></textarea>

                <div class="str-row">
                    <input type="text" id="str-find" placeholder="Find…">
                    <input type="text" id="str-rep"  placeholder="Replace with…">
                </div>
                <div class="str-row">
                    <label><input type="checkbox" id="str-case"> Case sensitive</label>
                    <label><input type="checkbox" id="str-regex"> Regex</label>
                    <label><input type="checkbox" id="str-all" checked> Replace all</label>
                </div>

                <div class="str-result-header">
                    <span class="str-label">Result</span>
                    <span id="str-stats"></span>
                    <button class="btn btn-sm" id="str-copy">📋 Copy</button>
                </div>
                <textarea id="str-out" readonly placeholder="Result appears here…"></textarea>
            </div>`;

            const src   = container.querySelector('#str-src');
            const find  = container.querySelector('#str-find');
            const rep   = container.querySelector('#str-rep');
            const cs    = container.querySelector('#str-case');
            const rx    = container.querySelector('#str-regex');
            const all   = container.querySelector('#str-all');
            const out   = container.querySelector('#str-out');
            const stats = container.querySelector('#str-stats');
            const copy  = container.querySelector('#str-copy');

            // Restore state
            try {
                const saved = JSON.parse(localStorage.getItem(LS_KEY));
                if (saved) {
                    src.value = saved.src || '';
                    find.value = saved.find || '';
                    rep.value = saved.rep || '';
                    cs.checked = !!saved.cs;
                    rx.checked = !!saved.rx;
                    all.checked = saved.all !== false;
                }
            } catch {}

            let saveTimer = null;
            function saveState() {
                clearTimeout(saveTimer);
                saveTimer = setTimeout(() => {
                    try {
                        localStorage.setItem(LS_KEY, JSON.stringify({
                            src: src.value, find: find.value, rep: rep.value,
                            cs: cs.checked, rx: rx.checked, all: all.checked,
                        }));
                    } catch {}
                }, 300);
            }

            function run() {
                const text = src.value;
                const pattern = find.value;
                saveState();
                if (!pattern) { out.value = text; stats.textContent = ''; return; }

                try {
                    let re;
                    const flags = (all.checked ? 'g' : '') + (cs.checked ? '' : 'i');
                    if (rx.checked) {
                        re = new RegExp(pattern, flags);
                    } else {
                        re = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
                    }
                    let count = 0;
                    const result = text.replace(re, (...args) => { count++; return rep.value; });
                    out.value = result;
                    stats.textContent = count + ' replacement' + (count !== 1 ? 's' : '');
                    stats.style.color = count ? 'var(--success)' : 'var(--text-muted)';
                } catch (e) {
                    out.value = '';
                    stats.textContent = 'Invalid regex';
                    stats.style.color = 'var(--error)';
                }
            }

            [src, find, rep].forEach(el => el.addEventListener('input', run));
            [cs, rx, all].forEach(el => el.addEventListener('change', run));
            run(); // initial run with restored state

            copy.addEventListener('click', () => {
                navigator.clipboard.writeText(out.value).then(() => {
                    copy.textContent = '✓ Copied';
                    setTimeout(() => copy.textContent = '📋 Copy', 1500);
                });
            });

            return () => clearTimeout(saveTimer);
        }
    });
})();
