/* ═══════════════════════════════════════════════════════════
   Tool: Kanban Board — Professional Task Management
   Features: Multi-board, Drag & Drop (SortableJS), Priority, 
             Tags, Subtasks, Modern Modals.
   ═══════════════════════════════════════════════════════════ */
(function () {
    // Load SortableJS
    if (!window.Sortable) {
        const script = document.createElement('script');
        script.src = 'js/libs/Sortable.min.js';
        document.head.appendChild(script);
    }

    const STYLE = document.createElement('style');
    STYLE.textContent = `
/* ── Kanban Layout ───────────────────────────── */
.kanban-root { display: flex; height: 100%; background: var(--bg-primary); font-family: 'Inter', sans-serif; overflow: hidden; }

/* Sidebar */
.kanban-sidebar {
    width: 200px; flex-shrink: 0; border-right: 1px solid var(--glass-border);
    display: flex; flex-direction: column; background: rgba(0,0,0,0.2);
}
.kanban-sidebar-header {
    padding: 12px 14px; border-bottom: 1px solid var(--glass-border);
    font-size: 10px; font-weight: 700; color: var(--text-muted);
    text-transform: uppercase; letter-spacing: .1em;
    display: flex; justify-content: space-between; align-items: center;
}
.kanban-board-list { flex: 1; overflow-y: auto; padding: 8px 0; }
.kanban-board-item {
    display: flex; align-items: center; gap: 10px; padding: 10px 14px;
    cursor: pointer; transition: all .15s; font-size: 13px; color: var(--text-secondary);
    border-left: 3px solid transparent;
}
.kanban-board-item:hover { background: rgba(255,255,255,0.06); color: var(--text-primary); }
.kanban-board-item.active {
    background: var(--accent-dim); color: var(--accent-hover);
    border-left-color: var(--accent); font-weight: 500;
}
.kb-board-remove { opacity: 0; margin-left: auto; color: var(--text-muted); transition: opacity .2s; }
.kanban-board-item:hover .kb-board-remove { opacity: 0.6; }
.kb-board-remove:hover { color: var(--error); opacity: 1 !important; }

/* Main Area */
.kanban-main { flex: 1; display: flex; flex-direction: column; min-width: 0; position: relative; }
.kanban-toolbar {
    display: flex; align-items: center; gap: 10px; padding: 10px 16px;
    border-bottom: 1px solid var(--glass-border); background: rgba(0,0,0,0.1);
}
.kanban-title { font-size: 16px; font-weight: 600; color: var(--text-primary); flex: 1; outline: none; }

/* Board Columns */
.kanban-board {
    flex: 1; display: flex; overflow-x: auto; padding: 16px; gap: 16px;
    background: radial-gradient(circle at top right, rgba(var(--accent-rgb), 0.03), transparent 40%);
}
.kanban-column {
    width: 280px; flex-shrink: 0; display: flex; flex-direction: column;
    background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border);
    border-radius: var(--r-md); max-height: 100%;
}
.kanban-column-header {
    padding: 12px 14px; display: flex; align-items: center; justify-content: space-between;
    cursor: grab;
}
.kanban-column-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--text-muted); flex: 1; outline: none; }
.kanban-task-count { font-size: 10px; background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 10px; color: var(--text-muted); }

.kanban-task-list { flex: 1; overflow-y: auto; padding: 8px; min-height: 50px; }
.kanban-task-add {
    padding: 8px; border-top: 1px solid var(--glass-border);
    display: flex; justify-content: center;
}
.btn-task-add {
    width: 100%; padding: 6px; border: 1px dashed var(--glass-border);
    background: transparent; color: var(--text-muted); cursor: pointer;
    font-size: 12px; border-radius: var(--r-sm); transition: all .2s;
}
.btn-task-add:hover { border-color: var(--accent); color: var(--accent-hover); background: var(--accent-dim); }

/* Task Card */
.kanban-card {
    background: var(--bg-secondary); border: 1px solid var(--glass-border);
    border-radius: var(--r-sm); padding: 12px; margin-bottom: 8px;
    cursor: pointer; transition: all .15s; position: relative;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.kanban-card:hover { border-color: var(--accent-glow); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
.kanban-card.sortable-ghost { opacity: 0.4; border: 1px dashed var(--accent); }

.kb-card-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 6px; }
.kb-tag { font-size: 9px; font-weight: 700; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; color: #fff; }

.kb-card-content { font-size: 13px; color: var(--text-primary); line-height: 1.4; margin-bottom: 8px; word-break: break-word; }

.kb-card-footer { display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: var(--text-muted); }
.kb-priority { width: 4px; height: 12px; border-radius: 2px; }
.prio-high { background: var(--error); box-shadow: 0 0 6px rgba(248,113,113,0.4); }
.prio-med { background: var(--warning); }
.prio-low { background: var(--success); }

.kb-stats { display: flex; gap: 8px; }
.kb-stat { display: flex; align-items: center; gap: 3px; }

/* ── Modal ───────────────────────────────────── */
.kb-modal-overlay {
    position: absolute; inset: 0; background: rgba(0,0,0,0.6);
    backdrop-filter: blur(4px); z-index: 1000;
    display: flex; align-items: center; justify-content: center;
    opacity: 0; pointer-events: none; transition: opacity .2s;
}
.kb-modal-overlay.open { opacity: 1; pointer-events: auto; }
.kb-modal {
    background: var(--bg-primary); border: 1px solid var(--glass-border);
    border-radius: var(--r-lg); width: 480px; max-width: 90%;
    box-shadow: var(--shadow-lg); overflow: hidden;
    transform: translateY(20px); transition: transform .3s var(--ease-out);
}
.kb-modal-overlay.open .kb-modal { transform: translateY(0); }

.kb-modal-header {
    padding: 16px 20px; border-bottom: 1px solid var(--glass-border);
    display: flex; justify-content: space-between; align-items: center;
    background: rgba(255,255,255,0.02);
}
.kb-modal-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
.kb-modal-footer {
    padding: 14px 20px; border-top: 1px solid var(--glass-border);
    display: flex; justify-content: flex-end; gap: 10px;
    background: rgba(0,0,0,0.1);
}

.kb-input-group { display: flex; flex-direction: column; gap: 6px; }
.kb-label { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; }
.kb-input {
    background: var(--bg-input); border: 1px solid var(--glass-border);
    border-radius: var(--r-sm); color: var(--text-primary);
    padding: 8px 12px; font-size: 13px; outline: none; transition: border-color .2s;
}
.kb-input:focus { border-color: var(--accent); }
.kb-textarea { min-height: 80px; resize: vertical; }

.kb-prio-picker { display: flex; gap: 10px; }
.kb-prio-opt {
    flex: 1; padding: 6px; border: 1px solid var(--glass-border);
    border-radius: var(--r-sm); text-align: center; font-size: 11px;
    cursor: pointer; transition: all .15s; font-weight: 600;
}
.kb-prio-opt.active.high { background: var(--error); border-color: var(--error); color: #fff; }
.kb-prio-opt.active.med { background: var(--warning); border-color: var(--warning); color: #000; }
.kb-prio-opt.active.low { background: var(--success); border-color: var(--success); color: #fff; }

.kb-subtask-item {
    display: flex; align-items: center; gap: 8px; margin-top: 4px;
}
.kb-subtask-check { appearance: none; width: 16px; height: 16px; border: 2px solid var(--glass-border); border-radius: 4px; cursor: pointer; position: relative; }
.kb-subtask-check:checked { background: var(--accent); border-color: var(--accent); }
.kb-subtask-check:checked::after { content: '✓'; position: absolute; top: -2px; left: 2px; color: #fff; font-size: 11px; font-weight: 700; }
`;
    document.head.appendChild(STYLE);

    const LS_KEY = 'toolbox_kanban_state';

    ToolRegistry.register({
        id: 'kanban',
        name: 'Kanban Board',
        icon: '📋',
        description: 'Advanced project management with subtasks, labels, and multiple boards',
        tags: ['kanban', 'board', 'tasks', 'todo', 'project', 'management', 'planning', 'cards'],
        defaultWidth: 960,
        defaultHeight: 640,
        minWidth: 700,
        minHeight: 450,

        createUI(container, windowId) {
            let state = {
                boards: [
                    {
                        id: Date.now(),
                        name: 'My Project',
                        columns: [
                            { id: 1, name: 'To Do', tasks: [] },
                            { id: 2, name: 'In Progress', tasks: [] },
                            { id: 3, name: 'Done', tasks: [] }
                        ]
                    }
                ],
                activeBoardId: null
            };

            // Load State
            try {
                const saved = JSON.parse(localStorage.getItem(LS_KEY));
                if (saved && saved.boards && saved.boards.length) {
                    state = saved;
                }
                if (!state.activeBoardId) state.activeBoardId = state.boards[0].id;
            } catch (e) {}

            function save() {
                localStorage.setItem(LS_KEY, JSON.stringify(state));
            }

            container.innerHTML = `
            <div class="kanban-root" id="kb-root-${windowId}">
                <aside class="kanban-sidebar">
                    <div class="kanban-sidebar-header">
                        <span>Boards</span>
                        <button class="btn btn-sm btn-icon" id="kb-add-board-${windowId}" title="New Board">+</button>
                    </div>
                    <div class="kanban-board-list" id="kb-board-list-${windowId}"></div>
                </aside>
                <main class="kanban-main">
                    <div class="kanban-toolbar">
                        <div class="kanban-title" id="kb-board-title-${windowId}" contenteditable="true" spellcheck="false"></div>
                        <button class="btn btn-sm" id="kb-add-col-${windowId}">+ Column</button>
                    </div>
                    <div class="kanban-board" id="kb-board-view-${windowId}"></div>

                    <!-- Task Modal -->
                    <div class="kb-modal-overlay" id="kb-modal-overlay-${windowId}">
                        <div class="kb-modal">
                            <div class="kb-modal-header">
                                <span id="kb-modal-title-${windowId}" style="font-weight: 600; font-size: 15px;">Edit Task</span>
                                <button class="btn btn-sm btn-icon" id="kb-modal-close-${windowId}">✕</button>
                            </div>
                            <div class="kb-modal-body">
                                <div class="kb-input-group">
                                    <label class="kb-label">Content</label>
                                    <textarea class="kb-input kb-textarea" id="kb-task-content-${windowId}" placeholder="What needs to be done?"></textarea>
                                </div>
                                <div class="kb-input-group">
                                    <label class="kb-label">Priority</label>
                                    <div class="kb-prio-picker">
                                        <div class="kb-prio-opt low" data-prio="low">Low</div>
                                        <div class="kb-prio-opt med" data-prio="med">Medium</div>
                                        <div class="kb-prio-opt high" data-prio="high">High</div>
                                    </div>
                                </div>
                                <div class="kb-input-group">
                                    <label class="kb-label">Tags (comma separated)</label>
                                    <input type="text" class="kb-input" id="kb-task-tags-${windowId}" placeholder="Design, Feature, Bug...">
                                </div>
                                <div class="kb-input-group">
                                    <label class="kb-label">Subtasks</label>
                                    <div id="kb-subtasks-list-${windowId}"></div>
                                    <button class="btn-task-add" id="kb-add-subtask-${windowId}" style="margin-top: 8px;">+ Add Subtask</button>
                                </div>
                            </div>
                            <div class="kb-modal-footer">
                                <button class="btn" id="kb-task-delete-${windowId}" style="color: var(--error); border-color: rgba(248,113,113,0.2);">Delete Task</button>
                                <button class="btn btn-accent" id="kb-task-save-${windowId}">Save Changes</button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>`;

            const boardListEl = container.querySelector(`#kb-board-list-${windowId}`);
            const boardTitleEl = container.querySelector(`#kb-board-title-${windowId}`);
            const boardViewEl = container.querySelector(`#kb-board-view-${windowId}`);
            const addBoardBtn = container.querySelector(`#kb-add-board-${windowId}`);
            const addColBtn = container.querySelector(`#kb-add-col-${windowId}`);
            
            // Modal Elements
            const modalOverlay = container.querySelector(`#kb-modal-overlay-${windowId}`);
            const modalContent = container.querySelector(`#kb-task-content-${windowId}`);
            const modalTags = container.querySelector(`#kb-task-tags-${windowId}`);
            const modalSubtasks = container.querySelector(`#kb-subtasks-list-${windowId}`);
            const modalPrioOpts = container.querySelectorAll('.kb-prio-opt');
            let currentEditingTask = null; // { boardId, colId, taskId }

            function renderSidebar() {
                boardListEl.innerHTML = state.boards.map(b => `
                    <div class="kanban-board-item ${b.id === state.activeBoardId ? 'active' : ''}" data-id="${b.id}">
                        <span>${escape(b.name)}</span>
                        ${state.boards.length > 1 ? `<span class="kb-board-remove" data-id="${b.id}">✕</span>` : ''}
                    </div>
                `).join('');

                boardListEl.querySelectorAll('.kanban-board-item').forEach(el => {
                    el.onclick = (e) => {
                        if (e.target.classList.contains('kb-board-remove')) {
                            const id = +e.target.dataset.id;
                            state.boards = state.boards.filter(b => b.id !== id);
                            if (state.activeBoardId === id) state.activeBoardId = state.boards[0].id;
                            save();
                            render();
                            return;
                        }
                        state.activeBoardId = +el.dataset.id;
                        save();
                        render();
                    };
                });
            }

            function renderBoard() {
                const board = state.boards.find(b => b.id === state.activeBoardId);
                if (!board) return;

                boardTitleEl.textContent = board.name;
                boardViewEl.innerHTML = board.columns.map(col => `
                    <div class="kanban-column" data-id="${col.id}">
                        <div class="kanban-column-header">
                            <span class="kanban-column-title" contenteditable="true" spellcheck="false" data-id="${col.id}">${escape(col.name)}</span>
                            <span class="kanban-task-count">${col.tasks.length}</span>
                        </div>
                        <div class="kanban-task-list" data-id="${col.id}">
                            ${col.tasks.map(t => renderTask(t, col.id)).join('')}
                        </div>
                        <div class="kanban-task-add">
                            <button class="btn-task-add" data-col="${col.id}">+ Add Task</button>
                        </div>
                    </div>
                `).join('');

                // Initialize SortableJS for columns
                const initSortable = () => {
                    if (!window.Sortable) {
                        setTimeout(initSortable, 100);
                        return;
                    }
                    new Sortable(boardViewEl, {
                        animation: 150,
                        handle: '.kanban-column-header',
                        onEnd: (evt) => {
                            const movedCol = board.columns.splice(evt.oldIndex, 1)[0];
                            board.columns.splice(evt.newIndex, 0, movedCol);
                            save();
                        }
                    });

                    // Initialize SortableJS for tasks in each column
                    boardViewEl.querySelectorAll('.kanban-task-list').forEach(el => {
                        new Sortable(el, {
                            group: 'tasks',
                            animation: 150,
                            onEnd: (evt) => {
                                const fromColId = +evt.from.dataset.id;
                                const toColId = +evt.to.dataset.id;
                                const fromCol = board.columns.find(c => c.id === fromColId);
                                const toCol = board.columns.find(c => c.id === toColId);
                                
                                const task = fromCol.tasks.splice(evt.oldIndex, 1)[0];
                                toCol.tasks.splice(evt.newIndex, 0, task);
                                
                                save();
                                renderBoard(); 
                            }
                        });
                    });
                };
                initSortable();

                // Bind column title edits
                boardViewEl.querySelectorAll('.kanban-column-title').forEach(el => {
                    el.onblur = () => {
                        const colId = +el.dataset.id;
                        const col = board.columns.find(c => c.id === colId);
                        if (col) {
                            col.name = el.textContent || 'Untitled';
                            save();
                        }
                    };
                });

                // Bind task add
                boardViewEl.querySelectorAll('.btn-task-add').forEach(btn => {
                    btn.onclick = () => {
                        const colId = +btn.dataset.col;
                        const col = board.columns.find(c => c.id === colId);
                        const newTask = {
                            id: Date.now(),
                            content: 'New Task',
                            priority: 'low',
                            tags: [],
                            subtasks: []
                        };
                        col.tasks.push(newTask);
                        save();
                        renderBoard();
                        openTaskModal(board.id, colId, newTask.id);
                    };
                });

                // Bind task clicks
                boardViewEl.querySelectorAll('.kanban-card').forEach(card => {
                    card.onclick = () => {
                        const taskId = +card.dataset.id;
                        const colId = +card.dataset.col;
                        openTaskModal(board.id, colId, taskId);
                    };
                });
            }

            function renderTask(t, colId) {
                const tagHtml = t.tags.map(tag => `<span class="kb-tag" style="background:${getTagColor(tag)}">${escape(tag)}</span>`).join('');
                const doneCount = t.subtasks ? t.subtasks.filter(s => s.done).length : 0;
                const totalCount = t.subtasks ? t.subtasks.length : 0;
                
                return `
                <div class="kanban-card" data-id="${t.id}" data-col="${colId}">
                    <div class="kb-card-tags">${tagHtml}</div>
                    <div class="kb-card-content">${escape(t.content)}</div>
                    <div class="kb-card-footer">
                        <div class="kb-priority prio-${t.priority || 'low'}"></div>
                        <div class="kb-stats">
                            ${totalCount > 0 ? `
                                <div class="kb-stat" title="Subtasks">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 12 2 2 4-4"/></svg>
                                    <span>${doneCount}/${totalCount}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>`;
            }

            function openTaskModal(boardId, colId, taskId) {
                const board = state.boards.find(b => b.id === boardId);
                const col = board.columns.find(c => c.id === colId);
                const task = col.tasks.find(t => t.id === taskId);
                if (!task) return;

                currentEditingTask = { boardId, colId, taskId };
                modalContent.value = task.content;
                modalTags.value = task.tags.join(', ');
                
                // Priority
                modalPrioOpts.forEach(opt => {
                    opt.classList.toggle('active', opt.dataset.prio === task.priority);
                });

                renderSubtasksInModal(task);
                modalOverlay.classList.add('open');
            }

            function renderSubtasksInModal(task) {
                modalSubtasks.innerHTML = (task.subtasks || []).map((s, i) => `
                    <div class="kb-subtask-item">
                        <input type="checkbox" class="kb-subtask-check" ${s.done ? 'checked' : ''} data-idx="${i}">
                        <input type="text" class="kb-input" style="flex:1" value="${escape(s.text)}" data-idx="${i}">
                        <button class="btn btn-sm btn-icon" style="border:none" data-act="del-sub" data-idx="${i}">✕</button>
                    </div>
                `).join('');

                modalSubtasks.querySelectorAll('.kb-subtask-check').forEach(cb => {
                    cb.onchange = () => {
                        const idx = +cb.dataset.idx;
                        task.subtasks[idx].done = cb.checked;
                    };
                });
                modalSubtasks.querySelectorAll('input[type="text"]').forEach(inp => {
                    inp.oninput = () => {
                        const idx = +inp.dataset.idx;
                        task.subtasks[idx].text = inp.value;
                    };
                });
                modalSubtasks.querySelectorAll('[data-act="del-sub"]').forEach(btn => {
                    btn.onclick = () => {
                        const idx = +btn.dataset.idx;
                        task.subtasks.splice(idx, 1);
                        renderSubtasksInModal(task);
                    };
                });
            }

            function closeTaskModal() {
                modalOverlay.classList.remove('open');
                currentEditingTask = null;
            }

            // Bind Modal Actions
            container.querySelector(`#kb-modal-close-${windowId}`).onclick = closeTaskModal;
            container.querySelector(`#kb-add-subtask-${windowId}`).onclick = () => {
                if (!currentEditingTask) return;
                const task = getActiveTask();
                if (!task.subtasks) task.subtasks = [];
                task.subtasks.push({ text: 'New subtask', done: false });
                renderSubtasksInModal(task);
            };

            modalPrioOpts.forEach(opt => {
                opt.onclick = () => {
                    modalPrioOpts.forEach(o => o.classList.remove('active'));
                    opt.classList.add('active');
                };
            });

            container.querySelector(`#kb-task-save-${windowId}`).onclick = () => {
                if (!currentEditingTask) return;
                const task = getActiveTask();
                task.content = modalContent.value;
                task.priority = container.querySelector('.kb-prio-opt.active').dataset.prio;
                task.tags = modalTags.value.split(',').map(t => t.trim()).filter(t => t);
                save();
                renderBoard();
                closeTaskModal();
            };

            container.querySelector(`#kb-task-delete-${windowId}`).onclick = () => {
                if (!currentEditingTask) return;
                const board = state.boards.find(b => b.id === currentEditingTask.boardId);
                const col = board.columns.find(c => c.id === currentEditingTask.colId);
                col.tasks = col.tasks.filter(t => t.id !== currentEditingTask.taskId);
                save();
                renderBoard();
                closeTaskModal();
            };

            function getActiveTask() {
                const { boardId, colId, taskId } = currentEditingTask;
                const board = state.boards.find(b => b.id === boardId);
                const col = board.columns.find(c => c.id === colId);
                return col.tasks.find(t => t.id === taskId);
            }

            boardTitleEl.onblur = () => {
                const board = state.boards.find(b => b.id === state.activeBoardId);
                if (board) {
                    board.name = boardTitleEl.textContent || 'Untitled';
                    save();
                    renderSidebar();
                }
            };

            addBoardBtn.onclick = () => {
                const newBoard = {
                    id: Date.now(),
                    name: 'New Project',
                    columns: [
                        { id: 1, name: 'To Do', tasks: [] },
                        { id: 2, name: 'Done', tasks: [] }
                    ]
                };
                state.boards.push(newBoard);
                state.activeBoardId = newBoard.id;
                save();
                render();
            };

            addColBtn.onclick = () => {
                const board = state.boards.find(b => b.id === state.activeBoardId);
                if (board) {
                    board.columns.push({ id: Date.now(), name: 'New Column', tasks: [] });
                    save();
                    renderBoard();
                }
            };

            function render() {
                renderSidebar();
                renderBoard();
            }

            render();

            function escape(s) {
                return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
            }

            function getTagColor(tag) {
                const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
                let hash = 0;
                for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
                return colors[Math.abs(hash) % colors.length];
            }
        }
    });
})();
