/* ═══════════════════════════════════════════════════════════
   Tool: Notepad — Feature-rich markdown scratchpad (Monaco)
   ═══════════════════════════════════════════════════════════ */
(function () {
    const STYLE = document.createElement('style');
    STYLE.textContent = `
/* ── Notepad Layout ─────────────────────────── */
.notepad { display:flex; flex-direction:column; height:100%; font-family:'Inter',sans-serif; }

/* Toolbar */
.notepad-toolbar {
    display:flex; align-items:center; gap:4px;
    padding:6px 10px;
    border-bottom:1px solid var(--glass-border);
    background:linear-gradient(180deg, rgba(255,255,255,.02), transparent);
    flex-shrink:0; flex-wrap:wrap;
}
.notepad-toolbar .sep {
    width:1px; height:22px; background:var(--glass-border); margin:0 4px; flex-shrink:0;
}
.np-btn {
    display:flex; align-items:center; justify-content:center;
    min-width:30px; height:28px; padding:0 6px;
    border:none; border-radius:var(--r-sm);
    background:transparent; color:var(--text-secondary);
    cursor:pointer; font-size:13px; transition:all .12s;
    gap:4px; font-family:'Inter',sans-serif; white-space:nowrap;
}
.np-btn:hover { background:var(--accent-dim); color:var(--accent-hover); }
.np-btn:active { transform:scale(.95); }
.np-btn.active { background:var(--accent-dim); color:var(--accent-hover); }
.np-btn:disabled { opacity:.35; pointer-events:none; }
.np-btn svg { width:16px; height:16px; flex-shrink:0; }
.np-btn-label { font-size:11px; }

/* Note tabs */
.notepad-tabs {
    display:flex; align-items:center; gap:2px;
    padding:4px 10px;
    border-bottom:1px solid var(--glass-border);
    overflow-x:auto; flex-shrink:0;
    background:rgba(0,0,0,.15);
}
.np-tab {
    display:flex; align-items:center; gap:6px;
    padding:5px 12px; border-radius:var(--r-sm) var(--r-sm) 0 0;
    border:1px solid transparent;
    background:transparent; color:var(--text-muted); cursor:pointer;
    font-size:12px; font-weight:500; white-space:nowrap;
    transition:all .15s; font-family:'Inter',sans-serif;
    max-width:160px; min-width: 0; overflow:hidden;
}
.np-tab span { flex: 1; overflow: hidden; text-overflow: ellipsis; }
.np-tab:hover { background:rgba(255,255,255,.04); color:var(--text-secondary); }
.np-tab.active {
    background:var(--bg-secondary); color:var(--text-primary);
    border-color:var(--glass-border); border-bottom-color:var(--bg-secondary);
}
.np-tab-close {
    display:inline-flex; align-items:center; justify-content:center;
    width:16px; height:16px; border-radius:50%;
    border:none; background:transparent; color:var(--text-muted);
    cursor:pointer; font-size:11px; transition:all .12s; flex-shrink:0;
    line-height:1;
}
.np-tab-close:hover { background:var(--error); color:#fff; }
.np-tab-add {
    display:flex; align-items:center; justify-content:center;
    width:24px; height:24px; border-radius:var(--r-sm);
    border:1px dashed var(--glass-border); background:transparent;
    color:var(--text-muted); cursor:pointer; font-size:16px;
    transition:all .12s; flex-shrink:0;
}
.np-tab-add:hover { border-color:var(--accent); color:var(--accent-hover); }

/* Editor area */
.notepad-body {
    display:flex; flex:1; min-height:0; overflow:hidden;
}
.notepad-editor-pane {
    flex:1; display:flex; flex-direction:column; min-width:0;
}

/* Monaco integration */
.np-monaco-container { flex:1; min-height:0; }
.np-monaco-container .monaco-editor,
.np-monaco-container .monaco-editor-background,
.np-monaco-container .monaco-editor .margin {
    background: transparent !important;
}
.np-monaco-container .monaco-editor .line-numbers {
    color: var(--text-muted) !important;
}

/* Markdown preview */
.notepad-preview-pane {
    flex:1; display:none; overflow-y:auto;
    border-left:1px solid var(--glass-border);
    padding:20px 24px; min-width:0;
    background:rgba(0,0,0,.1);
}
.notepad-body.split .notepad-preview-pane { display:block; }
.notepad-body.preview-only .notepad-editor-pane { display:none; }
.notepad-body.preview-only .notepad-preview-pane {
    display:block; border-left:none;
}

/* Markdown rendered content */
.np-md h1 { font-size:1.8em; font-weight:700; margin:0 0 .5em; color:var(--text-primary); border-bottom:1px solid var(--glass-border); padding-bottom:.3em; }
.np-md h2 { font-size:1.4em; font-weight:600; margin:1em 0 .4em; color:var(--text-primary); }
.np-md h3 { font-size:1.15em; font-weight:600; margin:.8em 0 .3em; color:var(--text-primary); }
.np-md h4 { font-size:1em; font-weight:600; margin:.6em 0 .2em; color:var(--text-secondary); }
.np-md p { margin:.5em 0; line-height:1.7; color:var(--text-primary); }
.np-md a { color:var(--accent-hover); text-decoration:none; }
.np-md a:hover { text-decoration:underline; }
.np-md strong { font-weight:600; color:var(--text-primary); }
.np-md em { font-style:italic; }
.np-md code {
    background:rgba(124,108,240,.12); color:var(--accent-hover);
    padding:2px 6px; border-radius:4px;
    font-family:'JetBrains Mono', monospace; font-size:.9em;
}
.np-md pre {
    background:var(--bg-primary); border:1px solid var(--glass-border);
    border-radius:var(--r-sm); padding:14px 16px; margin:.8em 0;
    overflow-x:auto;
}
.np-md pre code {
    background:none; padding:0; color:var(--text-primary); font-size:.85em;
}
.np-md blockquote {
    border-left:3px solid var(--accent); padding:4px 16px;
    margin:.6em 0; color:var(--text-secondary); background:rgba(124,108,240,.04);
    border-radius:0 var(--r-sm) var(--r-sm) 0;
}
.np-md ul, .np-md ol { padding-left:24px; margin:.5em 0; }
.np-md li { margin:4px 0; line-height:1.6; }
.np-md hr { border:none; border-top:1px solid var(--glass-border); margin:1em 0; }
.np-md img { max-width:100%; border-radius:var(--r-sm); margin:.5em 0; }
.np-md table { border-collapse:collapse; width:100%; margin:.8em 0; }
.np-md th, .np-md td {
    border:1px solid var(--glass-border); padding:8px 12px; text-align:left; font-size:.9em;
}
.np-md th { background:var(--bg-secondary); font-weight:600; }
.np-md tr:nth-child(even) { background:rgba(255,255,255,.02); }

/* Checkbox items */
.np-md .np-check-item {
    display:flex; align-items:flex-start; gap:8px;
    padding:4px 0; cursor:pointer; user-select:none;
}
.np-md .np-check-item input[type="checkbox"] {
    appearance:none; width:18px; height:18px; flex-shrink:0;
    border:2px solid var(--text-muted); border-radius:4px;
    cursor:pointer; margin-top:2px; transition:all .15s;
    position:relative; background:transparent;
}
.np-md .np-check-item input[type="checkbox"]:checked {
    background:var(--accent); border-color:var(--accent);
}
.np-md .np-check-item input[type="checkbox"]:checked::after {
    content:'✓'; position:absolute; top:-1px; left:2px;
    color:#fff; font-size:12px; font-weight:700;
}
.np-md .np-check-item.done .np-check-text {
    text-decoration:line-through; color:var(--text-muted);
}
.np-md .np-done-section {
    margin-top:12px; padding-top:12px;
    border-top:1px dashed var(--glass-border);
}
.np-md .np-done-label {
    font-size:11px; font-weight:600; text-transform:uppercase;
    letter-spacing:.08em; color:var(--text-muted); margin-bottom:6px;
}

/* Status bar */
.notepad-status {
    display:flex; align-items:center; justify-content:space-between;
    padding:3px 12px;
    border-top:1px solid var(--glass-border);
    font-size:11px; color:var(--text-muted); flex-shrink:0;
    gap:12px; background:rgba(0,0,0,.1);
}
.notepad-status-left { display:flex; gap:14px; }
.notepad-status-right { display:flex; gap:10px; align-items:center; }
`;
    document.head.appendChild(STYLE);

    /* ── We use a tiny built-in Markdown parser (no dependency) ─── */
    function parseMarkdown(src, checkboxHandler) {
        let html = '';
        const lines = src.split('\n');
        let inCodeBlock = false;
        let codeLang = '';
        let codeLines = [];
        let inList = false;
        let listType = '';

        function esc(s) {
            return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        }

        function inlineFormat(text) {
            text = esc(text);
            // Images
            text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
            // Links
            text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
            // Bold+Italic
            text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
            // Bold
            text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
            text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');
            // Italic
            text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
            text = text.replace(/_(.+?)_/g, '<em>$1</em>');
            // Strikethrough
            text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');
            // Code
            text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
            return text;
        }

        function closeList() {
            if (inList) {
                html += listType === 'ol' ? '</ol>' : '</ul>';
                inList = false;
            }
        }

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Fenced code blocks
            if (/^```/.test(line)) {
                if (!inCodeBlock) {
                    closeList();
                    inCodeBlock = true;
                    codeLang = line.slice(3).trim();
                    codeLines = [];
                } else {
                    html += `<pre><code class="lang-${esc(codeLang)}">${esc(codeLines.join('\n'))}</code></pre>`;
                    inCodeBlock = false;
                }
                continue;
            }
            if (inCodeBlock) { codeLines.push(line); continue; }

            // Blank line
            if (!line.trim()) { closeList(); html += '\n'; continue; }

            // Headings
            const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
            if (headingMatch) {
                closeList();
                const level = headingMatch[1].length;
                html += `<h${level}>${inlineFormat(headingMatch[2])}</h${level}>`;
                continue;
            }

            // Horizontal rule
            if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line.trim())) {
                closeList(); html += '<hr>'; continue;
            }

            // Blockquote
            if (line.trim().startsWith('> ')) {
                closeList();
                html += `<blockquote><p>${inlineFormat(line.trim().slice(2))}</p></blockquote>`;
                continue;
            }

            // Checkbox items - [ ] or [x]
            const checkMatch = line.match(/^(\s*)[-*]\s+\[([ xX])\]\s+(.*)/);
            if (checkMatch) {
                closeList();
                const checked = checkMatch[2].toLowerCase() === 'x';
                const text = checkMatch[3];
                const lineIdx = i;
                html += `<div class="np-check-item ${checked ? 'done' : ''}" data-line="${lineIdx}">
                    <input type="checkbox" ${checked ? 'checked' : ''} data-line="${lineIdx}">
                    <span class="np-check-text">${inlineFormat(text)}</span>
                </div>`;
                continue;
            }

            // Unordered list
            const ulMatch = line.match(/^(\s*)[-*+]\s+(.*)/);
            if (ulMatch) {
                if (!inList || listType !== 'ul') { closeList(); html += '<ul>'; inList = true; listType = 'ul'; }
                html += `<li>${inlineFormat(ulMatch[2])}</li>`;
                continue;
            }

            // Ordered list
            const olMatch = line.match(/^(\s*)\d+\.\s+(.*)/);
            if (olMatch) {
                if (!inList || listType !== 'ol') { closeList(); html += '<ol>'; inList = true; listType = 'ol'; }
                html += `<li>${inlineFormat(olMatch[2])}</li>`;
                continue;
            }

            // Table (simple)
            if (line.includes('|') && line.trim().startsWith('|')) {
                closeList();
                // Collect table lines
                const tableLines = [line];
                while (i + 1 < lines.length && lines[i+1].includes('|') && lines[i+1].trim().startsWith('|')) {
                    tableLines.push(lines[++i]);
                }
                html += parseTable(tableLines);
                continue;
            }

            // Paragraph
            closeList();
            html += `<p>${inlineFormat(line)}</p>`;
        }

        if (inCodeBlock) {
            html += `<pre><code>${esc(codeLines.join('\n'))}</code></pre>`;
        }
        closeList();
        return html;
    }

    function parseTable(lines) {
        if (lines.length < 2) return '';
        const parseCells = row => row.split('|').slice(1, -1).map(c => c.trim());
        const headers = parseCells(lines[0]);
        // Skip separator line (line[1])
        const rows = lines.slice(2).map(parseCells);
        let h = '<table><thead><tr>' + headers.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>';
        rows.forEach(r => {
            h += '<tr>' + r.map(c => `<td>${c}</td>`).join('') + '</tr>';
        });
        return h + '</tbody></table>';
    }


    const LS_KEY = 'toolbox_notepad';
    const SAMPLE = `# Welcome to Notepad 📝

Write your scratch work, notes, and thoughts here. **Markdown** is fully supported!

## Features
- **Markdown rendering** — side-by-side preview
- **Checkboxes** — toggle items and auto-sort to done
- **Multiple notes** — tab-based organization
- **Undo / Redo** — Ctrl+Z / Ctrl+Y
- **Find & Replace** — Ctrl+F
- **Word count** — live stats in status bar

## Checkbox Demo
- [ ] Try checking this item
- [ ] And this one too
- [x] This one is already done!

## Code Example
\`\`\`javascript
function greet(name) {
    return \`Hello, \${name}!\`;
}
\`\`\`

> 💡 **Tip:** Press **Ctrl+F** to search, **Ctrl+B** to toggle bold.
`;

    ToolRegistry.register({
        id: 'notepad',
        name: 'Notepad',
        icon: '📝',
        description: 'Markdown scratchpad with checklists, Monaco editor, and preview',
        tags: ['note', 'notes', 'markdown', 'text', 'editor', 'scratch', 'checklist', 'todo', 'write', 'pad', 'monaco'],
        defaultWidth: 820,
        defaultHeight: 580,
        minWidth: 480,
        minHeight: 340,

        createUI(container, windowId) {
            container.innerHTML = `
            <div class="notepad" id="np-${windowId}">
                <div class="notepad-tabs" id="np-tabs-${windowId}"></div>
                <div class="notepad-toolbar" id="np-toolbar-${windowId}">
                    <button class="np-btn" data-act="undo" title="Undo (Ctrl+Z)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 10h13a4 4 0 0 1 0 8H7"/><polyline points="7 6 3 10 7 14"/></svg>
                    </button>
                    <button class="np-btn" data-act="redo" title="Redo (Ctrl+Y)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 10H8a4 4 0 0 0 0 8h10"/><polyline points="17 6 21 10 17 14"/></svg>
                    </button>
                    <div class="sep"></div>
                    <button class="np-btn" data-act="bold" title="Bold (Ctrl+B)">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h6a4 4 0 0 1 2.8 6.8A4.5 4.5 0 0 1 13 20H6V4zm3 7h3a1.5 1.5 0 0 0 0-3H9v3zm0 6h4a2 2 0 0 0 0-4H9v4z"/></svg>
                    </button>
                    <button class="np-btn" data-act="italic" title="Italic (Ctrl+I)">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 5h6M8 19h6M14.5 5L9.5 19" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
                    </button>
                    <button class="np-btn" data-act="strike" title="Strikethrough">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="12" x2="20" y2="12"/><path d="M16 7a4 4 0 0 0-4-3H8a4 4 0 0 0 0 8h8a4 4 0 0 1 0 8h-4a4 4 0 0 1-4-3"/></svg>
                    </button>
                    <div class="sep"></div>
                    <button class="np-btn" data-act="heading" title="Heading">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4v16M20 4v16M4 12h16"/></svg>
                    </button>
                    <button class="np-btn" data-act="code" title="Inline code">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                    </button>
                    <button class="np-btn" data-act="link" title="Link">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>
                    </button>
                    <button class="np-btn" data-act="checkbox" title="Checkbox">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><polyline points="9 12 11 14 15 10"/></svg>
                    </button>
                    <button class="np-btn" data-act="quote" title="Blockquote">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 8H6a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V8zm10 0h-4a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V8z"/></svg>
                    </button>
                    <div class="sep"></div>
                    <button class="np-btn" data-act="find" title="Find & Replace (Ctrl+F)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    </button>
                    <div class="sep"></div>
                    <button class="np-btn" data-act="preview" title="Toggle preview" id="np-prev-btn-${windowId}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        <span class="np-btn-label">Preview</span>
                    </button>
                    <button class="np-btn" data-act="autosort" title="Auto-sort checked items to done section" id="np-autosort-${windowId}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        <span class="np-btn-label">Auto-sort ✓</span>
                    </button>
                    <button class="np-btn" data-act="export" title="Download as .md">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </button>
                </div>

                <div class="notepad-body split" id="np-body-${windowId}">
                    <div class="notepad-editor-pane np-monaco-container" id="np-editor-${windowId}"></div>
                    <div class="notepad-preview-pane np-md" id="np-preview-${windowId}"></div>
                </div>

                <div class="notepad-status">
                    <div class="notepad-status-left">
                        <span id="np-wc-${windowId}">0 words</span>
                        <span id="np-cc-${windowId}">0 chars</span>
                        <span id="np-lc-${windowId}">0 lines</span>
                        <span id="np-origin-${windowId}" style="opacity: 0.6; font-family: monospace;"></span>
                    </div>
                    <div class="notepad-status-right">
                        <span id="np-saved-${windowId}" style="color:var(--success)">Saved</span>
                    </div>
                </div>

            </div>`;

            const editorCont = container.querySelector(`#np-editor-${windowId}`);
            const preview  = container.querySelector(`#np-preview-${windowId}`);
            const body     = container.querySelector(`#np-body-${windowId}`);
            const tabsEl   = container.querySelector(`#np-tabs-${windowId}`);
            const wcEl = container.querySelector(`#np-wc-${windowId}`);
            const ccEl = container.querySelector(`#np-cc-${windowId}`);
            const lcEl = container.querySelector(`#np-lc-${windowId}`);
            const savedEl = container.querySelector(`#np-saved-${windowId}`);
            const originEl = container.querySelector(`#np-origin-${windowId}`);

            let monacoEditor = null;
            let monacoModels = [];
            let monacoInstance = null;

            /* ── State ─────────────────────────────── */
            let notes = [];
            let activeNote = 0;
            let previewMode = 'split'; // split | preview-only | off
            let autoSort = true;
            let saveTimer = null;

            // Load saved notes
            try {
                const saved = JSON.parse(localStorage.getItem(LS_KEY));
                if (saved && saved.notes && saved.notes.length) {
                    notes = saved.notes;
                    activeNote = Math.min(saved.active || 0, notes.length - 1);
                    previewMode = saved.previewMode || 'split';
                    autoSort = saved.autoSort !== false;

                    // Trigger async reload for stubbed notes (files too large for cache)
                    if (window.__TAURI__) {
                        notes.forEach(async (n, i) => {
                            if (n.isStub && n.filename) {
                                try {
                                    const res = await window.__TAURI__.invoke('workspace_read', { 
                                        req: { filename: n.filename, subfolder: n.subfolder } 
                                    });
                                    if (res.success) {
                                        n.content = res.content;
                                        n.isStub = false;
                                        // Update model if already initialized
                                        if (monacoModels[i]) monacoModels[i].setValue(n.content);
                                        if (i === activeNote) { updatePreview(); updateStats(); }
                                    }
                                } catch (e) {
                                    console.error('Notepad: Failed to restore stubbed note', n.filename, e);
                                }
                            }
                        });
                    }
                } else {
                    notes = [{ title: 'Untitled', content: SAMPLE }];
                }
            } catch { notes = [{ title: 'Untitled', content: SAMPLE }]; }

            function getActiveContent() {
                if (monacoEditor) return monacoEditor.getValue();
                return notes[activeNote]?.content || '';
            }

            function save() {
                savedEl.textContent = 'Saving…';
                savedEl.style.color = 'var(--warning)';
                clearTimeout(saveTimer);
                saveTimer = setTimeout(() => {
                    try {
                        const notesToSave = notes.map(n => {
                            // Smart Truncation: If file is large (>1MB) and exists on disk, save as stub
                            if (n.content && n.content.length > 1000000 && n.filename) {
                                return { 
                                    ...n, 
                                    content: '', 
                                    isStub: true 
                                };
                            }
                            // If large and NOT on disk, still truncate to protect quota but keep some content
                            if (n.content && n.content.length > 2000000) {
                                return { 
                                    ...n, 
                                    content: n.content.substring(0, 2000000) + '\n\n[Content truncated for local cache (2MB limit)...]' 
                                };
                            }
                            return n;
                        });
                        localStorage.setItem(LS_KEY, JSON.stringify({
                            notes: notesToSave, active: activeNote, previewMode, autoSort
                        }));
                        savedEl.textContent = 'Saved';
                        savedEl.style.color = 'var(--success)';
                    } catch (e) {
                        savedEl.textContent = 'Cache Full';
                        savedEl.style.color = 'var(--error)';
                    }
                }, 400);
            }

            function switchNote(idx) {
                if (activeNote === idx) return;
                
                if (notes[activeNote]) notes[activeNote].content = getActiveContent();
                
                activeNote = idx;
                
                if (monacoEditor && monacoModels[idx]) {
                    monacoEditor.setModel(monacoModels[idx]);
                }

                renderTabs();
                updatePreview();
                updateStats();
                updateOriginUI();
            }

            function updateOriginUI() {
                const note = notes[activeNote];
                if (note.filename) {
                    originEl.textContent = `[Workspace] ${note.subfolder ? note.subfolder + '/' : ''}${note.filename}`;
                } else {
                    originEl.textContent = '';
                }
            }


            /* ── Tabs ──────────────────────────────── */
            function renderTabs() {
                tabsEl.innerHTML = notes.map((n, i) => `
                    <div class="np-tab ${i === activeNote ? 'active' : ''}" data-idx="${i}">
                        <span>${escHtml(n.title || 'Untitled')}</span>
                        ${notes.length > 1 ? `<button class="np-tab-close" data-close="${i}">✕</button>` : ''}
                    </div>
                `).join('') + `<button class="np-tab-add" id="np-add-tab-${windowId}" title="New note">+</button>`;

                tabsEl.querySelectorAll('.np-tab').forEach(tab => {
                    tab.addEventListener('click', e => {
                        if (e.target.closest('.np-tab-close')) return;
                        switchNote(+tab.dataset.idx);
                    });
                    tab.addEventListener('dblclick', () => {
                        const idx = +tab.dataset.idx;
                        const name = prompt('Rename note:', notes[idx].title);
                        if (name !== null && name.trim()) {
                            notes[idx].title = name.trim();
                            renderTabs();
                            save();
                        }
                    });
                });

                tabsEl.querySelectorAll('.np-tab-close').forEach(btn => {
                    btn.addEventListener('click', e => {
                        e.stopPropagation();
                        const idx = +btn.dataset.close;
                        if (notes.length <= 1) return;

                        // Save current editor content if closing a DIFFERENT tab
                        if (idx !== activeNote && notes[activeNote]) {
                            notes[activeNote].content = getActiveContent();
                        }

                        notes.splice(idx, 1);
                        if (monacoModels[idx]) {
                            monacoModels[idx].dispose();
                            monacoModels.splice(idx, 1);
                        }

                        // Shift active pointer if needed
                        let nextActive = activeNote;
                        if (idx < activeNote) nextActive--;
                        else if (idx === activeNote) {
                            nextActive = Math.min(idx, notes.length - 1);
                        }
                        
                        // Manually switch
                        activeNote = nextActive;
                        if (monacoEditor && monacoModels[activeNote]) {
                            monacoEditor.setModel(monacoModels[activeNote]);
                        }
                        
                        renderTabs();
                        updatePreview();
                        updateStats();
                        save();
                    });
                });

                const addBtn = tabsEl.querySelector(`#np-add-tab-${windowId}`);
                if (addBtn) addBtn.addEventListener('click', () => {
                    let nextNum = 1;
                    const existingNums = notes.map(n => {
                        const m = n.title && n.title.match(/^Note (\d+)$/);
                        return m ? parseInt(m[1]) : 0;
                    });
                    if (existingNums.length > 0) nextNum = Math.max(...existingNums) + 1;
                    
                    notes.push({ title: `Note ${nextNum}`, content: '' });
                    if (monacoInstance) {
                        monacoModels.push(monacoInstance.editor.createModel('', 'markdown'));
                    }
                    switchNote(notes.length - 1);
                    save();
                });
            }

            function escHtml(s) {
                return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
            }

            /* ── Preview ───────────────────────────── */
            function updatePreview() {
                if (previewMode === 'off') return;

                const src = getActiveContent();
                if (src.length > 500000) {
                    preview.innerHTML = '<div style="padding:20px; color:var(--text-muted);"><em>Markdown preview is disabled for files larger than 500KB to maintain performance.</em></div>';
                    return;
                }

                let md = parseMarkdown(src);

                // If autoSort is on, rearrange in preview
                if (autoSort) {
                    const tmpDiv = document.createElement('div');
                    tmpDiv.innerHTML = md;
                    const checks = tmpDiv.querySelectorAll('.np-check-item');
                    if (checks.length > 0) {
                        // Collect done and pending
                        const done = [];
                        const pending = [];
                        checks.forEach(c => {
                            if (c.classList.contains('done')) done.push(c.outerHTML);
                            else pending.push(c.outerHTML);
                        });
                        if (done.length > 0) {
                            // Replace check items with sorted version
                            let replaced = md;
                            // Remove all check items from source
                            const checkPattern = /<div class="np-check-item[^"]*"[^>]*>[\s\S]*?<\/div>/g;
                            const nonCheckParts = replaced.split(checkPattern);
                            // Rebuild: put pending first, then done section
                            let allChecks = pending.join('\n');
                            allChecks += `<div class="np-done-section"><div class="np-done-label">✓ Completed (${done.length})</div>${done.join('\n')}</div>`;

                            // Find first check item position and replace all
                            const firstIdx = replaced.search(checkPattern);
                            if (firstIdx >= 0) {
                                const beforeChecks = replaced.substring(0, firstIdx);
                                let afterChecks = replaced.substring(firstIdx);
                                afterChecks = afterChecks.replace(checkPattern, '');
                                replaced = beforeChecks + allChecks + afterChecks;
                            }
                            md = replaced;
                        }
                    }
                }

                preview.innerHTML = md;

                // Bind checkbox toggles
                preview.querySelectorAll('.np-check-item input[type="checkbox"]').forEach(cb => {
                    cb.addEventListener('change', () => {
                        const lineIdx = +cb.dataset.line;
                        toggleCheckbox(lineIdx, cb.checked);
                    });
                });
            }

            function toggleCheckbox(lineIdx, checked) {
                const lines = getActiveContent().split('\n');
                if (lineIdx >= 0 && lineIdx < lines.length) {
                    if (checked) {
                        lines[lineIdx] = lines[lineIdx].replace(/\[ \]/, '[x]');
                    } else {
                        lines[lineIdx] = lines[lineIdx].replace(/\[[xX]\]/, '[ ]');
                    }
                    
                    notes[activeNote].content = lines.join('\n');
                    if (monacoModels[activeNote]) {
                        monacoModels[activeNote].setValue(notes[activeNote].content);
                    }
                    
                    updatePreview();
                    updateStats();
                    save();
                }
            }

            /* ── Stats ─────────────────────────────── */
            function updateStats() {
                const text = getActiveContent();
                const chars = text.length;
                let lines = 1;
                let words = 0;
                let inWord = false;
                for (let i = 0; i < chars; i++) {
                    const c = text.charCodeAt(i);
                    if (c === 10) lines++; // \n
                    if (c <= 32) {
                        inWord = false;
                    } else if (!inWord) {
                        words++;
                        inWord = true;
                    }
                }
                wcEl.textContent = `${words} word${words !== 1 ? 's' : ''}`;
                ccEl.textContent = `${chars} char${chars !== 1 ? 's' : ''}`;
                lcEl.textContent = `${lines} line${lines !== 1 ? 's' : ''}`;
            }


            /* ── Toolbar formatting helpers ─────────── */
            function wrapSelection(prefix, suffix = prefix) {
                if (!monacoEditor) return;
                const selection = monacoEditor.getSelection();
                const text = monacoEditor.getModel().getValueInRange(selection);
                monacoEditor.executeEdits("", [{
                    range: selection,
                    text: prefix + text + suffix,
                    forceMoveMarkers: true
                }]);
                monacoEditor.focus();
            }

            function prependLine(prefix) {
                if (!monacoEditor || !monacoInstance) return;
                const selection = monacoEditor.getSelection();
                const ops = [];
                for (let i = selection.startLineNumber; i <= selection.endLineNumber; i++) {
                    ops.push({
                        range: new monacoInstance.Range(i, 1, i, 1),
                        text: prefix
                    });
                }
                monacoEditor.executeEdits("", ops);
                monacoEditor.focus();
            }

            /* ── Toolbar actions ───────────────────── */
            const actions = {
                undo: () => monacoEditor?.trigger('keyboard', 'undo', null),
                redo: () => monacoEditor?.trigger('keyboard', 'redo', null),
                bold: () => wrapSelection('**', '**'),
                italic: () => wrapSelection('*', '*'),
                strike: () => wrapSelection('~~', '~~'),
                heading: () => prependLine('## '),
                code: () => wrapSelection('`', '`'),
                link: () => wrapSelection('[', '](url)'),
                checkbox: () => prependLine('- [ ] '),
                quote: () => prependLine('> '),
                find: () => monacoEditor?.getAction('actions.find').run(),
                preview: () => {
                    const modes = ['split', 'preview-only', 'off'];
                    const cur = modes.indexOf(previewMode);
                    previewMode = modes[(cur + 1) % modes.length];
                    applyPreviewMode();
                    updatePreview();
                    save();
                },
                autosort: () => {
                    autoSort = !autoSort;
                    container.querySelector(`#np-autosort-${windowId}`).classList.toggle('active', autoSort);
                    updatePreview();
                    save();
                },
                saveWorkspace: async () => {
                    if (!window.__TAURI__) return actions.download();
                    
                    const note = notes[activeNote];
                    let filename = note.filename;
                    let subfolder = note.subfolder;

                    if (!filename) {
                        filename = prompt('Save to Workspace as:', note.title + '.md');
                        if (!filename) return;
                        if (!filename.includes('.')) filename += '.md';
                        note.filename = filename;
                        note.title = filename;
                        renderTabs();
                        updateOriginUI();
                    }

                    savedEl.textContent = 'Saving to Workspace…';
                    savedEl.style.color = 'var(--warning)';

                    try {
                        const res = await window.__TAURI__.invoke('workspace_write', {
                            req: { filename, content: getActiveContent(), subfolder }
                        });
                        if (res.success) {
                            savedEl.textContent = 'Saved to Workspace';
                            savedEl.style.color = 'var(--success)';
                            save(); // Also sync to local storage
                        } else {
                            alert('Save failed: ' + res.error);
                            savedEl.textContent = 'Save Failed';
                            savedEl.style.color = 'var(--error)';
                        }
                    } catch (e) {
                        alert('Save error: ' + e);
                    }
                },
                download: () => {

                    const note = notes[activeNote];
                    let title = (note.title || 'note').trim();
                    const hasExt = /\.(md|txt|html|js|json|css|py|csv)$/i.test(title);
                    let ext = '.md';
                    
                    if (hasExt) {
                        ext = title.substring(title.lastIndexOf('.'));
                        title = title.substring(0, title.lastIndexOf('.'));
                    } else {
                        const choice = prompt('Enter format to save as (.md, .txt, .html):', '.md');
                        if (!choice) return;
                        ext = choice.startsWith('.') ? choice : '.' + choice;
                    }
                    
                    let outContent = getActiveContent();
                    if (ext === '.html') {
                        outContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head><body>\n` + parseMarkdown(outContent) + `\n</body></html>`;
                    }

                    const blob = new Blob([outContent], { type: 'text/plain;charset=utf-8' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = title + ext;
                    a.click();
                    URL.revokeObjectURL(a.href);
                }
            };

            function applyPreviewMode() {
                body.className = 'notepad-body';
                if (previewMode === 'split') body.classList.add('split');
                else if (previewMode === 'preview-only') body.classList.add('preview-only');

                const btn = container.querySelector(`#np-prev-btn-${windowId}`);
                const label = btn.querySelector('.np-btn-label');
                const labels = { split: 'Split', 'preview-only': 'Preview', off: 'Editor' };
                label.textContent = labels[previewMode] || 'Preview';
                btn.classList.toggle('active', previewMode !== 'off');
            }

            /* ── Wire up UI Actions ────────────────── */
            container.querySelector(`#np-${windowId}`).addEventListener('click', e => {
                const btn = e.target.closest('[data-act]');
                if (btn && actions[btn.dataset.act]) actions[btn.dataset.act]();
            });

            /* ── Global keyboard handler for notepad ─ */
            function globalKey(e) {
                const winEl = container.closest('.window');
                if (!winEl || !winEl.classList.contains('active')) return;

                if (e.ctrlKey || e.metaKey) {
                    if (e.key.toLowerCase() === 'f') {
                        e.preventDefault();
                        actions.find();
                    }
                    if (e.key.toLowerCase() === 's') {
                        e.preventDefault();
                        if (e.shiftKey) actions.download();
                        else actions.saveWorkspace();
                    }
                }
            }
            document.addEventListener('keydown', globalKey);

            /* ── Initialize ────────────────────────── */
            renderTabs();
            applyPreviewMode();
            container.querySelector(`#np-autosort-${windowId}`).classList.toggle('active', autoSort);

            let inputDebounceTimer = null;
            
            async function initMonaco() {
                try {
                    const monaco = await window.loadMonaco();
                    monacoInstance = monaco;

                    monaco.editor.defineTheme('np-transparent', {
                        base: 'vs-dark',
                        inherit: true,
                        rules: [],
                        colors: {
                            'editor.background': '#00000000',
                            'editorGutter.background': '#00000000'
                        }
                    });

                    monacoEditor = monaco.editor.create(editorCont, {
                        theme: 'np-transparent',
                        automaticLayout: true,
                        fontSize: 13,
                        fontFamily: "'JetBrains Mono', monospace",
                        minimap: { enabled: false },
                        wordWrap: 'on',
                        scrollBeyondLastLine: false,
                        padding: { top: 16, bottom: 16 },
                    });

                    monacoModels = [];
                    notes.forEach(n => {
                        monacoModels.push(monaco.editor.createModel(n.content, 'markdown'));
                    });

                    monacoEditor.setModel(monacoModels[activeNote]);

                    monacoEditor.onDidChangeModelContent(() => {
                        if (notes[activeNote]) notes[activeNote].content = monacoEditor.getValue();
                        clearTimeout(inputDebounceTimer);
                        inputDebounceTimer = setTimeout(() => {
                            updatePreview();
                            updateStats();
                            save();
                        }, 400);
                    });

                    updatePreview();
                    updateStats();
                } catch (e) {
                    editorCont.innerHTML = `<div style="padding:20px; color:var(--error)">Failed to load Monaco: ${e.message}</div>`;
                }
            }

            initMonaco();

            return {
                cleanup: () => {
                    document.removeEventListener('keydown', globalKey);
                    clearTimeout(saveTimer);
                    if (monacoEditor) {
                        monacoModels.forEach(m => m.dispose());
                        monacoEditor.dispose();
                    }
                },
                onMessage: (msg) => {
                    if (msg.type === 'open') {
                        const title = msg.filename || 'Opened File';
                        notes.push({ 
                            title, 
                            content: msg.content,
                            filename: msg.filename,
                            subfolder: msg.subfolder
                        });
                        if (monacoInstance) {
                            monacoModels.push(monacoInstance.editor.createModel(msg.content, 'markdown'));
                        }
                        switchNote(notes.length - 1);
                        save();
                        updateOriginUI();
                    }
                }
            };

        }
    });
})();
