/* ═══════════════════════════════════════════════════════════
   Tool: Date Checker
   ═══════════════════════════════════════════════════════════ */
(function () {
    const STYLE = document.createElement('style');
    STYLE.textContent = `
.dc-container { display: flex; height: 100%; font-family: 'Inter', sans-serif; overflow: hidden; }
.dc-main { flex: 1; display: flex; flex-direction: column; padding: 16px; gap: 16px; min-width: 0; overflow-y: auto; border-right: 1px solid var(--glass-border); }
.dc-section { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
.dc-field { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 140px; }

/* Segmented Control */
.dc-segmented { display: flex; background: var(--bg-input); border: 1px solid var(--glass-border); border-radius: var(--r-sm); padding: 2px; }
.dc-seg-btn { flex: 1; border: none; background: transparent; color: var(--text-secondary); font-size: 11px; font-weight: 600; padding: 6px 12px; border-radius: var(--r-sm); cursor: pointer; transition: all 0.15s; white-space: nowrap; }
.dc-seg-btn.active { background: var(--accent); color: #fff; }
.dc-seg-btn:hover:not(.active) { background: rgba(255, 255, 255, 0.05); color: var(--text-primary); }

/* Add Date Row */
.dc-add-row { display: flex; gap: 8px; width: 100%; }
.dc-add-row input[type="date"] { flex: 1.2; }
.dc-add-row input[type="text"] { flex: 2; }

/* Target List */
.dc-list-container { flex: 1; display: flex; flex-direction: column; min-height: 150px; }
.dc-list { display: flex; flex-direction: column; gap: 8px; overflow-y: auto; flex: 1; padding-right: 4px; }

/* Target Card */
.dc-card { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--glass-border); border-radius: var(--r-sm); transition: all 0.2s; cursor: pointer; }
.dc-card:hover { background: rgba(255, 255, 255, 0.04); border-color: rgba(255,255,255,0.15); }
.dc-card.active { border-color: var(--accent); background: var(--accent-dim); }
.dc-card-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.dc-card-label { font-size: 13px; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dc-card-date { font-size: 11px; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; }

.dc-card-right { display: flex; align-items: center; gap: 10px; }
.dc-card-diff { font-size: 12px; font-weight: 500; font-family: 'JetBrains Mono', monospace; }
.dc-card-diff.future { color: var(--success); }
.dc-card-diff.past { color: var(--text-secondary); }
.dc-card-diff.today { color: var(--accent-hover); }
.dc-card-actions { display: flex; gap: 4px; }
.dc-card-btn { border: none; background: transparent; color: var(--text-muted); padding: 4px 6px; border-radius: var(--r-sm); cursor: pointer; transition: all 0.15s; font-size: 12px; }
.dc-card-btn:hover { background: rgba(255, 255, 255, 0.08); color: var(--text-primary); }
.dc-card-btn.delete:hover { color: var(--error); background: rgba(248, 113, 113, 0.1); }

/* Calendar Panel */
.dc-calendar-panel { width: 300px; display: flex; flex-direction: column; padding: 16px; background: rgba(0, 0, 0, 0.08); overflow-y: auto; flex-shrink: 0; }
.dc-cal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.dc-cal-title { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.dc-cal-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-size: 10px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px; text-transform: uppercase; }
.dc-cal-days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; align-content: start; }

/* Day Cell */
.dc-day { display: flex; align-items: center; justify-content: center; height: 32px; font-size: 12px; border-radius: var(--r-sm); color: var(--text-secondary); cursor: pointer; position: relative; font-family: 'JetBrains Mono', monospace; }
.dc-day:hover:not(.empty) { background: rgba(255, 255, 255, 0.06); color: var(--text-primary); }
.dc-day.empty { cursor: default; }
.dc-day.start { background: var(--accent) !important; color: #fff !important; font-weight: 700; box-shadow: 0 0 10px var(--accent-glow); }
.dc-day.target { background: var(--success) !important; color: #fff !important; font-weight: 700; }
.dc-day.target.past { background: var(--error) !important; }
.dc-day.in-range { background: var(--accent-dim); color: var(--accent-hover); }
.dc-day.today-marker::after { content: ''; position: absolute; bottom: 3px; width: 4px; height: 4px; border-radius: 50%; background: var(--accent-hover); }
.dc-day.start.today-marker::after, .dc-day.target.today-marker::after { background: #fff; }

/* Cal Info */
.dc-cal-info { margin-top: 16px; padding: 12px; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--glass-border); border-radius: var(--r-sm); font-size: 12px; line-height: 1.4; color: var(--text-secondary); }
.dc-cal-info-title { font-weight: 600; color: var(--text-primary); margin-bottom: 4px; border-bottom: 1px solid var(--glass-border); padding-bottom: 4px; }
.dc-cal-info-row { display: flex; justify-content: space-between; margin-top: 6px; }
.dc-cal-info-val { font-family: 'JetBrains Mono', monospace; color: var(--text-primary); font-weight: 500; }

/* Responsive */
@media (max-width: 680px) {
    .dc-container { flex-direction: column; }
    .dc-main { border-right: none; border-bottom: 1px solid var(--glass-border); height: 55%; flex: none; }
    .dc-calendar-panel { width: 100%; height: 45%; flex: none; }
}
`;
    document.head.appendChild(STYLE);

    const LS_KEY = 'date_checker_state';

    // ═══════════════════════════════════════════════════════════
    // Date calculation helpers
    // ═══════════════════════════════════════════════════════════

    function addYears(date, y) {
        const d = new Date(date);
        d.setFullYear(d.getFullYear() + y);
        if (date.getMonth() === 1 && date.getDate() === 29 && d.getMonth() === 2) {
            d.setDate(0); // Rollback to Feb 28
        }
        return d;
    }

    function addMonths(date, m) {
        const d = new Date(date);
        d.setMonth(d.getMonth() + m);
        if (d.getDate() !== date.getDate()) {
            d.setDate(0); // Rollback to last day of previous month
        }
        return d;
    }

    function diffJustDays(d1, d2) {
        const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
        const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
        return Math.floor((utc2 - utc1) / 86400000);
    }

    function diffMonthsDays(d1, d2) {
        let months = 0;
        while (true) {
            const next = addMonths(d1, months + 1);
            if (next > d2) break;
            months++;
        }
        const refDate = addMonths(d1, months);
        const days = diffJustDays(refDate, d2);
        return { months, days };
    }

    function diffYearsMonthsDays(d1, d2) {
        let years = 0;
        while (true) {
            const next = addYears(d1, years + 1);
            if (next > d2) break;
            years++;
        }
        const afterYears = addYears(d1, years);
        let months = 0;
        while (true) {
            const next = addMonths(afterYears, months + 1);
            if (next > d2) break;
            months++;
        }
        const refDate = addMonths(afterYears, months);
        const days = diffJustDays(refDate, d2);
        return { years, months, days };
    }

    function calculateDiff(startStr, endStr) {
        const d1 = parseISODate(startStr);
        const d2 = parseISODate(endStr);
        
        const totalDays = diffJustDays(d1, d2);
        const isPast = totalDays < 0;
        
        let monthsDays, yearsMonthsDays;
        if (isPast) {
            monthsDays = diffMonthsDays(d2, d1);
            yearsMonthsDays = diffYearsMonthsDays(d2, d1);
        } else {
            monthsDays = diffMonthsDays(d1, d2);
            yearsMonthsDays = diffYearsMonthsDays(d1, d2);
        }
        
        return {
            totalDays,
            isPast,
            months: monthsDays.months,
            monthsDaysDays: monthsDays.days,
            years: yearsMonthsDays.years,
            yearsMonths: yearsMonthsDays.months,
            yearsDays: yearsMonthsDays.days
        };
    }

    function formatDiff(diff, format) {
        const absDays = Math.abs(diff.totalDays);
        if (absDays === 0) return 'today';
        const suffix = diff.isPast ? ' ago' : ' remaining';
        
        if (format === 'days') {
            return `${absDays} day${absDays !== 1 ? 's' : ''}${suffix}`;
        }
        
        if (format === 'months') {
            const parts = [];
            if (diff.months > 0) parts.push(`${diff.months} month${diff.months !== 1 ? 's' : ''}`);
            if (diff.monthsDaysDays > 0) parts.push(`${diff.monthsDaysDays} day${diff.monthsDaysDays !== 1 ? 's' : ''}`);
            return parts.join(', ') + suffix;
        }
        
        // years format
        const parts = [];
        if (diff.years > 0) parts.push(`${diff.years} year${diff.years !== 1 ? 's' : ''}`);
        if (diff.yearsMonths > 0) parts.push(`${diff.yearsMonths} month${diff.yearsMonths !== 1 ? 's' : ''}`);
        if (diff.yearsDays > 0) parts.push(`${diff.yearsDays} day${diff.yearsDays !== 1 ? 's' : ''}`);
        return parts.join(', ') + suffix;
    }

    function parseISODate(str) {
        const parts = str.split('-');
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }

    function getTodayString() {
        const t = new Date();
        const y = t.getFullYear();
        const m = String(t.getMonth() + 1).padStart(2, '0');
        const d = String(t.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function formatDateFriendly(str) {
        const d = parseISODate(str);
        return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }

    // ═══════════════════════════════════════════════════════════
    // Tool Registration
    // ═══════════════════════════════════════════════════════════

    ToolRegistry.register({
        id: 'date-checker',
        name: 'Date Checker',
        icon: '📅',
        description: 'Calculate time difference between days and view them on a calendar',
        tags: ['date', 'time', 'difference', 'days', 'calendar', 'months', 'years'],
        defaultWidth: 720,
        defaultHeight: 520,
        minWidth: 480,
        minHeight: 380,

        createUI(container, windowId) {
            container.innerHTML = `
            <div class="dc-container">
                <div class="dc-main">
                    <div class="dc-section">
                        <div class="dc-field">
                            <label class="label">Start Date</label>
                            <input type="date" id="dc-start-date-${windowId}" class="input">
                        </div>
                        <div class="dc-field">
                            <label class="label">Format</label>
                            <div class="dc-segmented" id="dc-format-seg-${windowId}">
                                <button class="dc-seg-btn active" data-fmt="days">Days</button>
                                <button class="dc-seg-btn" data-fmt="months">Months & Days</button>
                                <button class="dc-seg-btn" data-fmt="years">Years/Months/Days</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="dc-section" style="margin-top:4px;">
                        <div style="width:100%;">
                            <label class="label">Add Target Date</label>
                            <div class="dc-add-row">
                                <input type="date" id="dc-new-date-${windowId}" class="input">
                                <input type="text" id="dc-new-label-${windowId}" class="input" placeholder="Label (optional, e.g. Deadline)">
                                <button class="btn btn-accent" id="dc-add-btn-${windowId}">Add</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="dc-list-container">
                        <label class="label">Target Dates</label>
                        <div class="dc-list" id="dc-target-list-${windowId}"></div>
                    </div>
                </div>
                
                <div class="dc-calendar-panel">
                    <div class="dc-cal-header">
                        <button class="btn btn-sm btn-icon" id="dc-cal-prev-${windowId}">◀</button>
                        <div class="dc-cal-title" id="dc-cal-title-${windowId}"></div>
                        <button class="btn btn-sm btn-icon" id="dc-cal-next-${windowId}">▶</button>
                    </div>
                    <div class="dc-cal-weekdays">
                        <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
                    </div>
                    <div class="dc-cal-days" id="dc-cal-days-${windowId}"></div>
                    <div class="dc-cal-info" id="dc-cal-info-${windowId}"></div>
                </div>
            </div>`;

            // Element lookups
            const startInput = container.querySelector(`#dc-start-date-${windowId}`);
            const formatSeg  = container.querySelector(`#dc-format-seg-${windowId}`);
            const newDateInput = container.querySelector(`#dc-new-date-${windowId}`);
            const newLabelInput = container.querySelector(`#dc-new-label-${windowId}`);
            const addBtn = container.querySelector(`#dc-add-btn-${windowId}`);
            const targetList = container.querySelector(`#dc-target-list-${windowId}`);
            
            const calPrev = container.querySelector(`#dc-cal-prev-${windowId}`);
            const calNext = container.querySelector(`#dc-cal-next-${windowId}`);
            const calTitle = container.querySelector(`#dc-cal-title-${windowId}`);
            const calDaysGrid = container.querySelector(`#dc-cal-days-${windowId}`);
            const calInfo = container.querySelector(`#dc-cal-info-${windowId}`);

            // State
            let state = {
                startDate: getTodayString(),
                format: 'days', // 'days' | 'months' | 'years'
                targets: [],
                selectedTargetId: null
            };

            // Calendar state
            let calYear = new Date().getFullYear();
            let calMonth = new Date().getMonth();

            // Load State
            try {
                const saved = ToolboxState.get(LS_KEY);
                if (saved) {
                    state = { ...state, ...saved };
                }
            } catch {}

            // Fallback for empty date inputs
            if (!state.startDate) state.startDate = getTodayString();
            startInput.value = state.startDate;
            newDateInput.value = getTodayString();

            // Update segmented buttons
            formatSeg.querySelectorAll('.dc-seg-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.fmt === state.format);
            });

            // Save state helper
            function saveState() {
                try {
                    ToolboxState.set(LS_KEY, state);
                } catch {}
            }

            // Calculations & List Rendering
            function renderTargets() {
                targetList.innerHTML = '';
                
                if (state.targets.length === 0) {
                    targetList.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:12px;">No target dates added. Add one above!</div>`;
                    return;
                }

                // Render list
                state.targets.forEach(t => {
                    const diff = calculateDiff(state.startDate, t.date);
                    const formattedVal = formatDiff(diff, state.format);
                    const isFuture = diff.totalDays > 0;
                    const isToday = diff.totalDays === 0;
                    
                    let statusClass = 'future';
                    if (isToday) statusClass = 'today';
                    else if (diff.isPast) statusClass = 'past';

                    const card = document.createElement('div');
                    card.className = `dc-card ${state.selectedTargetId === t.id ? 'active' : ''}`;
                    card.dataset.id = t.id;
                    card.innerHTML = `
                        <div class="dc-card-info">
                            <div class="dc-card-label" title="${escapeHtml(t.label || 'Target Date')}">${escapeHtml(t.label || 'Target Date')}</div>
                            <div class="dc-card-date">${formatDateFriendly(t.date)}</div>
                        </div>
                        <div class="dc-card-right">
                            <div class="dc-card-diff ${statusClass}">${formattedVal}</div>
                            <div class="dc-card-actions">
                                <button class="dc-card-btn delete" data-id="${t.id}" title="Delete">🗑</button>
                            </div>
                        </div>
                    `;

                    // Card click selects target for calendar view
                    card.addEventListener('click', (e) => {
                        if (e.target.closest('.delete')) return;
                        
                        // Toggle selection
                        if (state.selectedTargetId === t.id) {
                            state.selectedTargetId = null;
                        } else {
                            state.selectedTargetId = t.id;
                            // Set calendar view to the target's month
                            const targetDate = parseISODate(t.date);
                            calYear = targetDate.getFullYear();
                            calMonth = targetDate.getMonth();
                        }
                        
                        saveState();
                        renderTargets();
                        renderCalendar();
                    });

                    // Delete button event
                    card.querySelector('.delete').addEventListener('click', (e) => {
                        e.stopPropagation();
                        state.targets = state.targets.filter(item => item.id !== t.id);
                        if (state.selectedTargetId === t.id) {
                            state.selectedTargetId = null;
                        }
                        saveState();
                        renderTargets();
                        renderCalendar();
                    });

                    targetList.appendChild(card);
                });
            }

            // Calendar rendering
            function renderCalendar() {
                const monthNames = [
                    "January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December"
                ];

                calTitle.textContent = `${monthNames[calMonth]} ${calYear}`;

                // Calculate parameters
                const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
                const firstDayIndex = new Date(calYear, calMonth, 1).getDay();

                calDaysGrid.innerHTML = '';

                // Empty padding for start of month
                for (let i = 0; i < firstDayIndex; i++) {
                    const emptyCell = document.createElement('div');
                    emptyCell.className = 'dc-day empty';
                    calDaysGrid.appendChild(emptyCell);
                }

                // Midnights for comparison
                const startParsed = parseISODate(state.startDate);
                const startUtc = Date.UTC(startParsed.getFullYear(), startParsed.getMonth(), startParsed.getDate());

                let selectedTarget = null;
                let targetUtc = null;
                if (state.selectedTargetId) {
                    selectedTarget = state.targets.find(t => t.id === state.selectedTargetId);
                    if (selectedTarget) {
                        const targetParsed = parseISODate(selectedTarget.date);
                        targetUtc = Date.UTC(targetParsed.getFullYear(), targetParsed.getMonth(), targetParsed.getDate());
                    }
                }

                // Today midnight for marker
                const tDate = new Date();
                const todayUtc = Date.UTC(tDate.getFullYear(), tDate.getMonth(), tDate.getDate());

                // Populate days
                for (let d = 1; d <= daysInMonth; d++) {
                    const cell = document.createElement('div');
                    cell.className = 'dc-day';
                    cell.textContent = d;

                    const dayUtc = Date.UTC(calYear, calMonth, d);

                    // Add classes based on dates
                    if (dayUtc === startUtc) {
                        cell.classList.add('start');
                    }
                    if (targetUtc !== null && dayUtc === targetUtc) {
                        cell.classList.add('target');
                        if (targetUtc < startUtc) {
                            cell.classList.add('past');
                        }
                    }
                    if (targetUtc !== null) {
                        if (startUtc < targetUtc && dayUtc > startUtc && dayUtc < targetUtc) {
                            cell.classList.add('in-range');
                        } else if (targetUtc < startUtc && dayUtc > targetUtc && dayUtc < startUtc) {
                            cell.classList.add('in-range');
                        }
                    }
                    if (dayUtc === todayUtc) {
                        cell.classList.add('today-marker');
                    }

                    // Click day to toggle it as Start or End (if clicked on start, does nothing. If clicked on target, does nothing. Otherwise set as new target date or start date?)
                    // Let's make clicking a day in the calendar fill in the Target Date input field for ease of use!
                    cell.addEventListener('click', () => {
                        const formattedDateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                        newDateInput.value = formattedDateStr;
                    });

                    calDaysGrid.appendChild(cell);
                }

                // Render Calendar Info Box
                if (selectedTarget) {
                    const diff = calculateDiff(state.startDate, selectedTarget.date);
                    
                    let diffLabel = 'Diff';
                    const isFuture = diff.totalDays > 0;
                    const isPast = diff.totalDays < 0;
                    
                    calInfo.innerHTML = `
                        <div class="dc-cal-info-title">${escapeHtml(selectedTarget.label || 'Target Date')}</div>
                        <div class="dc-cal-info-row">
                            <span>Date:</span>
                            <span class="dc-cal-info-val">${formatDateFriendly(selectedTarget.date)}</span>
                        </div>
                        <div class="dc-cal-info-row">
                            <span>Days:</span>
                            <span class="dc-cal-info-val">${Math.abs(diff.totalDays)} day${Math.abs(diff.totalDays) !== 1 ? 's' : ''} ${isPast ? 'ago' : 'left'}</span>
                        </div>
                        <div class="dc-cal-info-row">
                            <span>Months:</span>
                            <span class="dc-cal-info-val">${diff.months} mo, ${diff.monthsDaysDays} d</span>
                        </div>
                        <div class="dc-cal-info-row">
                            <span>Full breakdown:</span>
                            <span class="dc-cal-info-val" style="font-size:10px;">${diff.years}y ${diff.yearsMonths}m ${diff.yearsDays}d</span>
                        </div>
                    `;
                } else {
                    calInfo.innerHTML = `
                        <div class="dc-cal-info-title" style="text-align:center; border:none; margin:0; padding:0; color:var(--text-secondary); font-weight:normal;">
                            Select a target date card on the left to see the calculation details and visualize the range.
                        </div>
                    `;
                }
            }

            // Input handlers
            startInput.addEventListener('change', () => {
                state.startDate = startInput.value;
                saveState();
                renderTargets();
                renderCalendar();
            });

            formatSeg.querySelectorAll('.dc-seg-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    formatSeg.querySelectorAll('.dc-seg-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    state.format = btn.dataset.fmt;
                    saveState();
                    renderTargets();
                });
            });

            addBtn.addEventListener('click', () => {
                const dateVal = newDateInput.value;
                const labelVal = newLabelInput.value.trim();
                
                if (!dateVal) return;

                const newTarget = {
                    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
                    date: dateVal,
                    label: labelVal || 'Target Date'
                };

                state.targets.push(newTarget);
                state.selectedTargetId = newTarget.id; // Auto select new target
                
                // Show new target month in calendar
                const targetDate = parseISODate(dateVal);
                calYear = targetDate.getFullYear();
                calMonth = targetDate.getMonth();

                // Clear input label
                newLabelInput.value = '';

                saveState();
                renderTargets();
                renderCalendar();
            });

            // Calendar Navigation
            calPrev.addEventListener('click', () => {
                calMonth--;
                if (calMonth < 0) {
                    calMonth = 11;
                    calYear--;
                }
                renderCalendar();
            });

            calNext.addEventListener('click', () => {
                calMonth++;
                if (calMonth > 11) {
                    calMonth = 0;
                    calYear++;
                }
                renderCalendar();
            });

            // Initial render
            // Set calendar to display start date by default
            if (state.startDate) {
                const parsedStart = parseISODate(state.startDate);
                calYear = parsedStart.getFullYear();
                calMonth = parsedStart.getMonth();
            }

            renderTargets();
            renderCalendar();

            // Expose logic helpers for verification/testing
            window.__test_date_checker = {
                addYears,
                addMonths,
                diffJustDays,
                diffMonthsDays,
                diffYearsMonthsDays,
                calculateDiff,
                formatDiff
            };

            // Return empty cleanup
            return () => {};
        }
    });

    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
})();
