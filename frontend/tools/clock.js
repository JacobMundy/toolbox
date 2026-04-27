/* ═══════════════════════════════════════════════════════════
   Tool: Clock / Timer / Stopwatch (persistent) + Work Log
   ═══════════════════════════════════════════════════════════ */
(function () {
    const STYLE = document.createElement('style');
    STYLE.textContent = `
.clock-app { display:flex; flex-direction:column; height:100%; }

/* Tabs */
.clock-tabs {
    display:flex; border-bottom:1px solid var(--glass-border); flex-shrink:0;
}
.clock-tab {
    flex:1; padding:10px 0; text-align:center;
    font-size:13px; font-weight:500;
    color:var(--text-muted); cursor:pointer;
    border:none; background:none;
    border-bottom:2px solid transparent;
    transition:all .2s;
}
.clock-tab:hover { color:var(--text-secondary); background:rgba(255,255,255,.02); }
.clock-tab.active {
    color:var(--accent-hover);
    border-bottom-color:var(--accent);
    background:rgba(124,108,240,.05);
}

/* Panels */
.clock-panel { display:none; flex:1; flex-direction:column; align-items:center; justify-content:center; padding:24px; overflow-y:auto; }
.clock-panel.active { display:flex; }

/* Shared time display */
.time-display {
    font-family:'JetBrains Mono',monospace;
    font-size:clamp(40px, 8vw, 64px);
    font-weight:600;
    color:var(--text-primary);
    letter-spacing:2px;
    text-align:center;
    text-shadow:0 0 40px var(--accent-glow);
    line-height:1.2;
}
.time-display.small { font-size:clamp(28px, 5vw, 42px); }
.date-display {
    font-size:15px; color:var(--text-secondary);
    margin-top:8px; text-align:center;
}

/* Action buttons row */
.clock-actions {
    display:flex; gap:10px; margin-top:28px; flex-wrap:wrap; justify-content:center;
}
.clock-btn {
    padding:10px 28px; font-size:14px; font-weight:500;
    border:1px solid var(--glass-border); border-radius:var(--r-md);
    background:var(--bg-secondary); color:var(--text-primary);
    cursor:pointer; transition:all .15s;
    min-width:90px;
}
.clock-btn:hover { background:var(--bg-tertiary); }
.clock-btn:active { transform:scale(.97); }
.clock-btn.primary { background:var(--accent); border-color:var(--accent); color:#fff; }
.clock-btn.primary:hover { background:var(--accent-hover); }
.clock-btn.danger  { background:var(--error); border-color:var(--error); color:#fff; }
.clock-btn.danger:hover  { background:#ef4444; }
.clock-btn.success { background:var(--success); border-color:var(--success); color:#0c0c24; }
.clock-btn.success:hover { background:#6ee7b7; }

/* Log Work — subtle pill shown below stopwatch controls */
.sw-log-btn {
    margin-top:10px;
    padding:5px 14px; font-size:11px; font-weight:500;
    border:1px solid rgba(255,255,255,.12); border-radius:20px;
    background:transparent; color:var(--text-muted);
    cursor:pointer; transition:all .2s; letter-spacing:.4px;
    display:none;
}
.sw-log-btn:hover {
    border-color:var(--accent); color:var(--accent-hover);
    background:var(--accent-dim);
}

/* Timer inputs */
.timer-inputs {
    display:flex; gap:8px; align-items:center; margin-bottom:20px;
}
.timer-inputs input {
    width:70px; text-align:center; padding:10px;
    font-family:'JetBrains Mono',monospace; font-size:22px;
    background:var(--bg-input); color:var(--text-primary);
    border:1px solid var(--glass-border); border-radius:var(--r-sm);
    outline:none; transition:border-color .2s;
}
.timer-inputs input:focus { border-color:var(--accent); }
.timer-inputs span { font-size:20px; color:var(--text-muted); }

/* Laps */
.laps-container {
    width:100%; max-width:360px; margin-top:20px;
    max-height:200px; overflow-y:auto;
}
.lap-item {
    display:flex; justify-content:space-between;
    padding:7px 14px; font-family:'JetBrains Mono',monospace;
    font-size:13px; color:var(--text-secondary);
    border-bottom:1px solid var(--glass-border);
}
.lap-item:first-child { color:var(--success); }
.lap-num { color:var(--text-muted); }

/* Timer alert */
.timer-done {
    animation:timer-flash 1s ease infinite;
}
@keyframes timer-flash {
    0%,100% { color:var(--text-primary); }
    50% { color:var(--error); }
}

/* ── Work Log Styles ─────────────────────── */
.worklog-panel {
    justify-content:flex-start !important;
    padding:16px 20px !important;
    gap:0 !important;
}

/* Week navigator */
.wl-week-nav {
    display:flex; align-items:center; gap:12px;
    width:100%; justify-content:center;
    margin-bottom:16px; flex-shrink:0;
}
.wl-week-btn {
    width:30px; height:30px; display:flex;
    align-items:center; justify-content:center;
    border:1px solid var(--glass-border); border-radius:var(--r-sm);
    background:var(--bg-secondary); color:var(--text-secondary);
    cursor:pointer; transition:all .15s; font-size:14px;
}
.wl-week-btn:hover { background:var(--bg-tertiary); color:var(--text-primary); }
.wl-week-label {
    font-size:13px; font-weight:600; color:var(--text-primary);
    min-width:200px; text-align:center;
}
.wl-week-total {
    font-size:11px; color:var(--text-muted); font-weight:400;
    margin-top:2px;
}

/* Bar chart */
.wl-chart {
    display:flex; align-items:flex-end; gap:8px;
    width:100%; height:140px;
    padding:0 4px;
    margin-bottom:12px; flex-shrink:0;
}
.wl-bar-col {
    flex:1; display:flex; flex-direction:column;
    align-items:center; height:100%;
    position:relative;
}
.wl-bar-track {
    flex:1; width:100%; display:flex;
    align-items:flex-end; justify-content:center;
    position:relative;
}
.wl-bar {
    width:100%; max-width:40px; min-height:2px;
    border-radius:4px 4px 0 0;
    background:linear-gradient(180deg, var(--accent-hover), var(--accent));
    transition:height .4s cubic-bezier(.4,0,.2,1);
    cursor:pointer; position:relative;
}
.wl-bar:hover {
    filter:brightness(1.2);
}
.wl-bar.today {
    background:linear-gradient(180deg, #a78bfa, #7c6cf0);
    box-shadow:0 0 12px var(--accent-glow);
}
.wl-bar-hours {
    position:absolute; top:-18px; left:50%; transform:translateX(-50%);
    font-size:10px; font-weight:600; color:var(--text-primary);
    white-space:nowrap; pointer-events:none;
    opacity:0; transition:opacity .15s;
}
.wl-bar:hover .wl-bar-hours,
.wl-bar.today .wl-bar-hours { opacity:1; }
.wl-bar-day {
    margin-top:6px; font-size:11px; font-weight:500;
    color:var(--text-muted); text-align:center;
}
.wl-bar-day.today { color:var(--accent-hover); font-weight:700; }

/* Day entries list */
.wl-entries {
    width:100%; flex:1; overflow-y:auto;
    border-top:1px solid var(--glass-border);
    padding-top:10px;
}
.wl-entry {
    display:flex; align-items:center; gap:8px;
    padding:7px 10px; border-radius:var(--r-sm);
    transition:background .12s;
}
.wl-entry:hover { background:rgba(255,255,255,.03); }
.wl-entry-day {
    font-size:12px; font-weight:600; color:var(--text-secondary);
    min-width:40px;
}
.wl-entry-day.today { color:var(--accent-hover); }
.wl-entry-bar-wrap {
    flex:1; height:6px; background:rgba(255,255,255,.04);
    border-radius:3px; overflow:hidden;
}
.wl-entry-bar-fill {
    height:100%; border-radius:3px;
    background:var(--accent);
    transition:width .4s cubic-bezier(.4,0,.2,1);
}
.wl-entry-bar-fill.today { background:var(--accent-hover); }
.wl-entry-time {
    font-family:'JetBrains Mono',monospace;
    font-size:12px; color:var(--text-primary);
    min-width:52px; text-align:right;
}
.wl-entry-actions {
    display:flex; gap:2px;
}
.wl-entry-btn {
    width:24px; height:24px; display:flex;
    align-items:center; justify-content:center;
    border:none; border-radius:4px;
    background:transparent; color:var(--text-muted);
    cursor:pointer; font-size:12px; transition:all .12s;
}
.wl-entry-btn:hover { background:rgba(255,255,255,.08); color:var(--text-primary); }
.wl-entry-btn.delete:hover { color:var(--error); }

/* Add-time section in work log */
.wl-add-section {
    display:flex; align-items:center; gap:8px;
    width:100%; margin-top:10px; flex-shrink:0;
    padding-top:10px; border-top:1px solid var(--glass-border);
}
.wl-add-inputs {
    display:flex; gap:4px; align-items:center;
}
.wl-add-inputs input {
    width:40px; text-align:center; padding:5px 2px;
    font-family:'JetBrains Mono',monospace; font-size:13px;
    background:var(--bg-input); color:var(--text-primary);
    border:1px solid var(--glass-border); border-radius:4px;
    outline:none; transition:border-color .2s;
}
.wl-add-inputs input:focus { border-color:var(--accent); }
.wl-add-inputs span {
    font-size:12px; color:var(--text-muted);
}
.wl-add-btn {
    padding:5px 14px; font-size:12px; font-weight:500;
    border:1px solid var(--accent); border-radius:var(--r-sm);
    background:var(--accent-dim); color:var(--accent-hover);
    cursor:pointer; transition:all .15s; white-space:nowrap;
}
.wl-add-btn:hover { background:var(--accent); color:#fff; }
.wl-add-label {
    font-size:11px; color:var(--text-muted); margin-right:auto;
}

/* Edit modal overlay */
.wl-edit-overlay {
    position:absolute; inset:0; z-index:100;
    background:rgba(7,7,26,.8); backdrop-filter:blur(6px);
    display:flex; align-items:center; justify-content:center;
}
.wl-edit-card {
    background:var(--bg-primary); border:1px solid var(--glass-border);
    border-radius:var(--r-lg); padding:24px; width:280px;
    box-shadow:var(--shadow-lg);
}
.wl-edit-title {
    font-size:14px; font-weight:600; color:var(--text-primary);
    margin-bottom:16px; text-align:center;
}
.wl-edit-inputs {
    display:flex; gap:6px; align-items:center; justify-content:center;
    margin-bottom:16px;
}
.wl-edit-inputs input {
    width:56px; text-align:center; padding:8px;
    font-family:'JetBrains Mono',monospace; font-size:18px;
    background:var(--bg-input); color:var(--text-primary);
    border:1px solid var(--glass-border); border-radius:var(--r-sm);
    outline:none;
}
.wl-edit-inputs input:focus { border-color:var(--accent); }
.wl-edit-inputs span { font-size:16px; color:var(--text-muted); }
.wl-edit-actions {
    display:flex; gap:8px; justify-content:center;
}
.wl-edit-actions button {
    padding:8px 20px; font-size:13px; font-weight:500;
    border-radius:var(--r-sm); cursor:pointer;
    transition:all .15s; border:1px solid var(--glass-border);
}
.wl-edit-save {
    background:var(--accent); border-color:var(--accent) !important;
    color:#fff;
}
.wl-edit-save:hover { background:var(--accent-hover); }
.wl-edit-cancel {
    background:var(--bg-secondary); color:var(--text-secondary);
}
.wl-edit-cancel:hover { background:var(--bg-tertiary); }


`;
    document.head.appendChild(STYLE);

    const LS = {
        SW_RUNNING:  'toolbox_sw_running',
        SW_START:    'toolbox_sw_start',
        SW_ELAPSED:  'toolbox_sw_elapsed',
        SW_LAPS:     'toolbox_sw_laps',
        TMR_RUNNING: 'toolbox_tmr_running',
        TMR_END:     'toolbox_tmr_end',
        TMR_DUR:     'toolbox_tmr_duration',
        WORK_LOG:    'toolbox_work_log',
    };

    function fmt(ms) {
        const totalSec = Math.floor(ms / 1000);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        const cs = Math.floor((ms % 1000) / 10);
        if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(cs)}`;
        return `${pad(m)}:${pad(s)}.${pad(cs)}`;
    }
    function fmtTimer(ms) {
        if (ms < 0) ms = 0;
        const totalSec = Math.ceil(ms / 1000);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        return `${pad(h)}:${pad(m)}:${pad(s)}`;
    }
    function pad(n) { return String(n).padStart(2, '0'); }
    function lsGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
    function lsSet(k, v) { try { localStorage.setItem(k, v); } catch {} }

    /* ── Work Log helpers ─────────────────────── */
    const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const DAY_FULL  = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    /** Get Monday-based day index (0=Mon, 6=Sun) */
    function getMondayIndex(date) {
        return (date.getDay() + 6) % 7;
    }

    /** Get the Monday of the week containing `date` */
    function getWeekMonday(date) {
        const d = new Date(date);
        const day = getMondayIndex(d);
        d.setDate(d.getDate() - day);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    /** Week key like "2026-W16" */
    function weekKey(monday) {
        const jan1 = new Date(monday.getFullYear(), 0, 1);
        const dayOfYear = Math.floor((monday - jan1) / 86400000) + 1;
        const weekNum = Math.ceil((dayOfYear + jan1.getDay()) / 7);
        return `${monday.getFullYear()}-W${pad(weekNum)}`;
    }

    /** Date key like "2026-04-14" */
    function dateKey(date) {
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }

    /** Format hours to h:mm */
    function fmtHours(totalMinutes) {
        const h = Math.floor(totalMinutes / 60);
        const m = Math.round(totalMinutes % 60);
        return `${h}:${pad(m)}`;
    }

    function loadWorkLog() {
        try { return JSON.parse(lsGet(LS.WORK_LOG)) || {}; } catch { return {}; }
    }
    function saveWorkLog(data) {
        lsSet(LS.WORK_LOG, JSON.stringify(data));
    }

    /**
     * Get minutes worked on a specific date key.
     * Data shape: { "2026-04-14": 485, "2026-04-15": 120, ... }
     * Values in minutes.
     */
    function getWeekData(data, monday) {
        const result = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(d.getDate() + i);
            const key = dateKey(d);
            result.push({
                key,
                day: DAY_NAMES[i],
                dayFull: DAY_FULL[i],
                date: new Date(d),
                minutes: data[key] || 0,
            });
        }
        return result;
    }

    ToolRegistry.register({
        id: 'clock',
        name: 'Clock',
        icon: '⏰',
        description: 'Clock, timer, stopwatch & work log',
        tags: ['clock', 'time', 'timer', 'stopwatch', 'countdown', 'alarm', 'lap', 'work', 'hours', 'log'],
        defaultWidth: 480,
        defaultHeight: 540,
        minWidth: 380,
        minHeight: 420,

        createUI(container) {
            container.innerHTML = `
            <div class="clock-app">
                <div class="clock-tabs">
                    <button class="clock-tab active" data-tab="clock">🕐 Clock</button>
                    <button class="clock-tab" data-tab="timer">⏳ Timer</button>
                    <button class="clock-tab" data-tab="stopwatch">⏱ Stopwatch</button>
                    <button class="clock-tab" data-tab="worklog">📊 Work</button>
                </div>

                <!-- Clock Panel -->
                <div class="clock-panel active" id="panel-clock">
                    <div class="time-display" id="clock-time">00:00:00</div>
                    <div class="date-display" id="clock-date"></div>
                </div>

                <!-- Timer Panel -->
                <div class="clock-panel" id="panel-timer">
                    <div class="timer-inputs" id="tmr-inputs">
                        <input type="number" id="tmr-h" min="0" max="99" value="0" placeholder="HH">
                        <span>:</span>
                        <input type="number" id="tmr-m" min="0" max="59" value="5" placeholder="MM">
                        <span>:</span>
                        <input type="number" id="tmr-s" min="0" max="59" value="0" placeholder="SS">
                    </div>
                    <div class="time-display small" id="tmr-display">00:05:00</div>
                    <div class="clock-actions">
                        <button class="clock-btn primary" id="tmr-start">Start</button>
                        <button class="clock-btn" id="tmr-reset">Reset</button>
                    </div>
                </div>

                <!-- Stopwatch Panel -->
                <div class="clock-panel" id="panel-stopwatch">
                    <div class="time-display" id="sw-display">00:00.00</div>
                    <div class="clock-actions">
                        <button class="clock-btn primary" id="sw-start">Start</button>
                        <button class="clock-btn" id="sw-lap">Lap</button>
                        <button class="clock-btn danger" id="sw-reset">Reset</button>
                    </div>
                    <button class="sw-log-btn" id="sw-log" title="Log elapsed time to today's work total">＋ Log Work</button>
                    <div class="laps-container" id="sw-laps"></div>
                </div>

                <!-- Work Log Panel -->
                <div class="clock-panel worklog-panel" id="panel-worklog">
                    <div class="wl-week-nav">
                        <button class="wl-week-btn" id="wl-prev" title="Previous week">◀</button>
                        <div style="text-align:center">
                            <div class="wl-week-label" id="wl-week-label"></div>
                            <div class="wl-week-total" id="wl-week-total"></div>
                        </div>
                        <button class="wl-week-btn" id="wl-next" title="Next week">▶</button>
                    </div>
                    <div class="wl-chart" id="wl-chart"></div>
                    <div class="wl-entries" id="wl-entries"></div>
                    <div class="wl-add-section">
                        <span class="wl-add-label">Add custom:</span>
                        <div class="wl-add-inputs">
                            <input type="number" id="wl-add-h" min="0" max="23" value="0" title="Hours" style="width: 70px;">
                            <span>h</span>
                            <input type="number" id="wl-add-m" min="0" max="59" value="0" title="Minutes" style="width: 70px;">
                            <span>m</span>
                        </div>
                        <button class="wl-add-btn" id="wl-add-btn">+ Add Today</button>
                    </div>
                </div>
            </div>`;

            const tabs = container.querySelectorAll('.clock-tab');
            const panels = container.querySelectorAll('.clock-panel');
            let intervals = [];

            function clearIntervals() { intervals.forEach(clearInterval); intervals = []; }

            // ── Tab switching ──
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    tabs.forEach(t => t.classList.remove('active'));
                    panels.forEach(p => p.classList.remove('active'));
                    tab.classList.add('active');
                    container.querySelector('#panel-' + tab.dataset.tab).classList.add('active');
                    if (tab.dataset.tab === 'worklog') renderWorkLog();
                });
            });

            // ════════════ CLOCK ════════════
            const clockTime = container.querySelector('#clock-time');
            const clockDate = container.querySelector('#clock-date');

            function updateClock() {
                const now = new Date();
                clockTime.textContent = now.toLocaleTimeString('en-US', { hour12: false });
                clockDate.textContent = now.toLocaleDateString('en-US', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                });
            }
            updateClock();
            intervals.push(setInterval(updateClock, 500));

            // ════════════ TIMER ════════════
            const tmrH = container.querySelector('#tmr-h');
            const tmrM = container.querySelector('#tmr-m');
            const tmrS = container.querySelector('#tmr-s');
            const tmrDisplay = container.querySelector('#tmr-display');
            const tmrStartBtn = container.querySelector('#tmr-start');
            const tmrResetBtn = container.querySelector('#tmr-reset');
            const tmrInputs = container.querySelector('#tmr-inputs');

            let tmrInterval = null;
            let tmrRunning = false;
            let tmrEndTime = 0;

            function updateTimerDisplay() {
                const ms = tmrEndTime - Date.now();
                tmrDisplay.textContent = fmtTimer(ms);

                if (ms <= 0 && tmrRunning) {
                    tmrRunning = false;
                    clearInterval(tmrInterval);
                    tmrDisplay.textContent = '00:00:00';
                    tmrDisplay.classList.add('timer-done');
                    tmrStartBtn.textContent = 'Start';
                    tmrInputs.style.display = 'flex';
                    lsSet(LS.TMR_RUNNING, 'false');
                    // Simple alert
                    try {
                        const ctx = new (window.AudioContext || window.webkitAudioContext)();
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.frequency.value = 800;
                        gain.gain.value = 0.3;
                        osc.start();
                        setTimeout(() => { osc.stop(); ctx.close(); }, 600);
                    } catch {}
                }
            }

            // Restore timer state
            if (lsGet(LS.TMR_RUNNING) === 'true') {
                tmrEndTime = parseInt(lsGet(LS.TMR_END)) || 0;
                if (tmrEndTime > Date.now()) {
                    tmrRunning = true;
                    tmrStartBtn.textContent = 'Pause';
                    tmrInputs.style.display = 'none';
                    tmrInterval = setInterval(updateTimerDisplay, 50);
                    intervals.push(tmrInterval);
                    updateTimerDisplay();
                } else {
                    lsSet(LS.TMR_RUNNING, 'false');
                }
            }

            // Update preview from inputs
            function updateTimerPreview() {
                if (tmrRunning) return;
                const ms = ((+tmrH.value || 0) * 3600 + (+tmrM.value || 0) * 60 + (+tmrS.value || 0)) * 1000;
                tmrDisplay.textContent = fmtTimer(ms);
                tmrDisplay.classList.remove('timer-done');
            }
            [tmrH, tmrM, tmrS].forEach(el => el.addEventListener('input', updateTimerPreview));

            tmrStartBtn.addEventListener('click', () => {
                if (tmrRunning) {
                    // Pause
                    tmrRunning = false;
                    clearInterval(tmrInterval);
                    tmrStartBtn.textContent = 'Resume';
                    // Save remaining as new duration
                    const remaining = tmrEndTime - Date.now();
                    lsSet(LS.TMR_DUR, String(Math.max(remaining, 0)));
                    lsSet(LS.TMR_RUNNING, 'false');
                } else {
                    // Start / Resume
                    tmrDisplay.classList.remove('timer-done');
                    let dur;
                    if (tmrStartBtn.textContent === 'Resume') {
                        dur = parseInt(lsGet(LS.TMR_DUR)) || 0;
                    } else {
                        dur = ((+tmrH.value || 0) * 3600 + (+tmrM.value || 0) * 60 + (+tmrS.value || 0)) * 1000;
                    }
                    if (dur <= 0) return;
                    tmrEndTime = Date.now() + dur;
                    tmrRunning = true;
                    tmrStartBtn.textContent = 'Pause';
                    tmrInputs.style.display = 'none';
                    lsSet(LS.TMR_RUNNING, 'true');
                    lsSet(LS.TMR_END, String(tmrEndTime));
                    tmrInterval = setInterval(updateTimerDisplay, 50);
                    intervals.push(tmrInterval);
                    updateTimerDisplay();
                }
            });

            tmrResetBtn.addEventListener('click', () => {
                tmrRunning = false;
                clearInterval(tmrInterval);
                tmrStartBtn.textContent = 'Start';
                tmrInputs.style.display = 'flex';
                tmrDisplay.classList.remove('timer-done');
                lsSet(LS.TMR_RUNNING, 'false');
                updateTimerPreview();
            });

            // ════════════ STOPWATCH ════════════
            const swDisplay  = container.querySelector('#sw-display');
            const swStartBtn = container.querySelector('#sw-start');
            const swLapBtn   = container.querySelector('#sw-lap');
            const swResetBtn = container.querySelector('#sw-reset');
            const swLogBtn   = container.querySelector('#sw-log');
            const swLapsEl   = container.querySelector('#sw-laps');

            let swRunning = false;
            let swStartTime = 0;
            let swElapsed = 0;   // accumulated ms before current run
            let swInterval = null;
            let swLaps = [];

            function getSwTotal() {
                let total = swElapsed;
                if (swRunning) total += Date.now() - swStartTime;
                return total;
            }

            function updateSwDisplay() {
                const total = getSwTotal();
                swDisplay.textContent = fmt(total);
                if (total >= 60000) {
                    swLogBtn.style.display = 'inline-flex';
                } else {
                    swLogBtn.style.display = 'none';
                }
            }

            function renderLaps() {
                swLapsEl.innerHTML = swLaps.slice().reverse().map((lap, i) =>
                    `<div class="lap-item"><span class="lap-num">Lap ${swLaps.length - i}</span><span>${fmt(lap)}</span></div>`
                ).join('');
            }

            function saveSw() {
                lsSet(LS.SW_RUNNING, swRunning ? 'true' : 'false');
                lsSet(LS.SW_START, String(swStartTime));
                lsSet(LS.SW_ELAPSED, String(swElapsed));
                lsSet(LS.SW_LAPS, JSON.stringify(swLaps));
            }

            // Restore stopwatch
            swRunning = lsGet(LS.SW_RUNNING) === 'true';
            swStartTime = parseInt(lsGet(LS.SW_START)) || 0;
            swElapsed = parseInt(lsGet(LS.SW_ELAPSED)) || 0;
            try { swLaps = JSON.parse(lsGet(LS.SW_LAPS)) || []; } catch { swLaps = []; }

            if (swRunning) {
                swStartBtn.textContent = 'Pause';
                swInterval = setInterval(updateSwDisplay, 30);
                intervals.push(swInterval);
            }
            updateSwDisplay();
            renderLaps();

            swStartBtn.addEventListener('click', () => {
                if (swRunning) {
                    // Pause
                    swElapsed += Date.now() - swStartTime;
                    swRunning = false;
                    clearInterval(swInterval);
                    swStartBtn.textContent = 'Start';
                } else {
                    // Start
                    swStartTime = Date.now();
                    swRunning = true;
                    swStartBtn.textContent = 'Pause';
                    swInterval = setInterval(updateSwDisplay, 30);
                    intervals.push(swInterval);
                }
                saveSw();
            });

            swLapBtn.addEventListener('click', () => {
                if (!swRunning) return;
                let total = swElapsed + (Date.now() - swStartTime);
                swLaps.push(total);
                saveSw();
                renderLaps();
            });

            swResetBtn.addEventListener('click', () => {
                swRunning = false;
                clearInterval(swInterval);
                swElapsed = 0;
                swStartTime = 0;
                swLaps = [];
                swStartBtn.textContent = 'Start';
                updateSwDisplay();
                renderLaps();
                saveSw();
            });

            swLogBtn.addEventListener('click', () => {
                const totalMs = getSwTotal();
                const minutes = Math.round(totalMs / 60000);
                if (minutes > 0) {
                    const data = loadWorkLog();
                    const key = dateKey(new Date());
                    data[key] = (data[key] || 0) + minutes;
                    saveWorkLog(data);
                    
                    const origText = swLogBtn.textContent;
                    swLogBtn.textContent = 'Logged!';
                    swLogBtn.disabled = true;
                    
                    swResetBtn.click();
                    
                    setTimeout(() => {
                        swLogBtn.textContent = origText;
                        swLogBtn.disabled = false;
                    }, 1500);
                }
            });


            // ════════════ WORK LOG ════════════
            const wlChart     = container.querySelector('#wl-chart');
            const wlEntries   = container.querySelector('#wl-entries');
            const wlWeekLabel = container.querySelector('#wl-week-label');
            const wlWeekTotal = container.querySelector('#wl-week-total');
            const wlPrev      = container.querySelector('#wl-prev');
            const wlNext      = container.querySelector('#wl-next');
            const wlAddH      = container.querySelector('#wl-add-h');
            const wlAddM      = container.querySelector('#wl-add-m');
            const wlAddBtn    = container.querySelector('#wl-add-btn');

            let currentMonday = getWeekMonday(new Date());

            function renderWorkLog() {
                const data = loadWorkLog();
                const week = getWeekData(data, currentMonday);
                const today = dateKey(new Date());
                const todayMonday = getWeekMonday(new Date());

                // Week label
                const endDate = new Date(currentMonday);
                endDate.setDate(endDate.getDate() + 6);
                const fmtDate = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                wlWeekLabel.textContent = `${fmtDate(currentMonday)} — ${fmtDate(endDate)}`;

                // Week total
                const totalWeekMin = week.reduce((s, d) => s + d.minutes, 0);
                wlWeekTotal.textContent = `Total: ${fmtHours(totalWeekMin)} hours`;

                // Disable "next" if current week
                wlNext.disabled = currentMonday.getTime() >= todayMonday.getTime();
                wlNext.style.opacity = wlNext.disabled ? '.3' : '1';
                wlNext.style.cursor = wlNext.disabled ? 'default' : 'pointer';

                // ── Bar chart ──
                const maxMin = Math.max(...week.map(d => d.minutes), 60); // min scale = 1 hour
                wlChart.innerHTML = week.map(d => {
                    const pct = Math.max((d.minutes / maxMin) * 100, 0);
                    const isToday = d.key === today;
                    const hrs = fmtHours(d.minutes);
                    return `
                        <div class="wl-bar-col">
                            <div class="wl-bar-track">
                                <div class="wl-bar ${isToday ? 'today' : ''}" style="height:${pct}%"
                                     data-key="${d.key}" title="${d.dayFull}: ${hrs}">
                                    <span class="wl-bar-hours">${hrs}</span>
                                </div>
                            </div>
                            <div class="wl-bar-day ${isToday ? 'today' : ''}">${d.day}</div>
                        </div>
                    `;
                }).join('');

                // Click on bar to edit
                wlChart.querySelectorAll('.wl-bar').forEach(bar => {
                    bar.addEventListener('click', () => openEdit(bar.dataset.key));
                });

                // ── Entry rows ──
                wlEntries.innerHTML = week.map(d => {
                    const isToday = d.key === today;
                    const pct = Math.max((d.minutes / maxMin) * 100, 0);
                    const hrs = fmtHours(d.minutes);
                    return `
                        <div class="wl-entry">
                            <span class="wl-entry-day ${isToday ? 'today' : ''}">${d.day}</span>
                            <div class="wl-entry-bar-wrap">
                                <div class="wl-entry-bar-fill ${isToday ? 'today' : ''}" style="width:${pct}%"></div>
                            </div>
                            <span class="wl-entry-time">${hrs}</span>
                            <div class="wl-entry-actions">
                                <button class="wl-entry-btn" data-edit="${d.key}" title="Edit">✎</button>
                                <button class="wl-entry-btn delete" data-clear="${d.key}" title="Clear">✕</button>
                            </div>
                        </div>
                    `;
                }).join('');

                // Entry action handlers
                wlEntries.querySelectorAll('[data-edit]').forEach(btn => {
                    btn.addEventListener('click', () => openEdit(btn.dataset.edit));
                });
                wlEntries.querySelectorAll('[data-clear]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const data = loadWorkLog();
                        delete data[btn.dataset.clear];
                        saveWorkLog(data);
                        renderWorkLog();
                    });
                });
            }

            function openEdit(key) {
                const data = loadWorkLog();
                const minutes = data[key] || 0;
                const h = Math.floor(minutes / 60);
                const m = minutes % 60;

                // Determine which day this is
                const parts = key.split('-');
                const d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
                const dayName = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

                // Create overlay inside the worklog panel
                const panel = container.querySelector('#panel-worklog');
                const overlay = document.createElement('div');
                overlay.className = 'wl-edit-overlay';
                overlay.innerHTML = `
                    <div class="wl-edit-card">
                        <div class="wl-edit-title">${dayName}</div>
                        <div class="wl-edit-inputs">
                            <input type="number" id="wl-edit-h" min="0" max="23" value="${h}">
                            <span>h</span>
                            <input type="number" id="wl-edit-m" min="0" max="59" value="${m}">
                            <span>m</span>
                        </div>
                        <div class="wl-edit-actions">
                            <button class="wl-edit-save">Save</button>
                            <button class="wl-edit-cancel">Cancel</button>
                        </div>
                    </div>
                `;
                panel.style.position = 'relative';
                panel.appendChild(overlay);

                // Focus the hours input
                overlay.querySelector('#wl-edit-h').focus();
                overlay.querySelector('#wl-edit-h').select();

                overlay.querySelector('.wl-edit-save').addEventListener('click', () => {
                    const newH = parseInt(overlay.querySelector('#wl-edit-h').value) || 0;
                    const newM = parseInt(overlay.querySelector('#wl-edit-m').value) || 0;
                    const total = newH * 60 + newM;
                    const data = loadWorkLog();
                    if (total > 0) {
                        data[key] = total;
                    } else {
                        delete data[key];
                    }
                    saveWorkLog(data);
                    overlay.remove();
                    renderWorkLog();
                });

                overlay.querySelector('.wl-edit-cancel').addEventListener('click', () => {
                    overlay.remove();
                });

                // Close on clicking backdrop
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) overlay.remove();
                });

                // Enter to save, Escape to cancel
                overlay.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') overlay.querySelector('.wl-edit-save').click();
                    if (e.key === 'Escape') overlay.remove();
                });
            }

            // Week navigation
            wlPrev.addEventListener('click', () => {
                currentMonday.setDate(currentMonday.getDate() - 7);
                renderWorkLog();
            });
            wlNext.addEventListener('click', () => {
                if (wlNext.disabled) return;
                currentMonday.setDate(currentMonday.getDate() + 7);
                renderWorkLog();
            });

            // Custom add
            wlAddBtn.addEventListener('click', () => {
                const addH = parseInt(wlAddH.value) || 0;
                const addM = parseInt(wlAddM.value) || 0;
                const addTotal = addH * 60 + addM;
                if (addTotal <= 0) return;

                const data = loadWorkLog();
                const todayK = dateKey(new Date());
                data[todayK] = (data[todayK] || 0) + addTotal;
                saveWorkLog(data);

                // Reset inputs
                wlAddH.value = '0';
                wlAddM.value = '0';

                // Re-navigate to current week to show today
                currentMonday = getWeekMonday(new Date());
                renderWorkLog();

                // Flash feedback
                wlAddBtn.textContent = '✓ Added';
                setTimeout(() => { wlAddBtn.textContent = '+ Add Today'; }, 1200);
            });

            // Initial render
            renderWorkLog();

            // Cleanup
            return () => clearIntervals();
        }
    });
})();
