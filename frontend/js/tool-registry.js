/* ═══════════════════════════════════════════════════════════
   ToolRegistry — Global registry for self-registering tools
   ═══════════════════════════════════════════════════════════ */
const ToolRegistry = {
    _tools: [],

    /**
     * Register a tool.
     * @param {Object} def
     *   id           {string}   unique identifier
     *   name         {string}   display name
     *   icon         {string}   emoji
     *   description  {string}   short description (used in search)
     *   tags         {string[]} search keywords
     *   defaultWidth / defaultHeight / minWidth / minHeight {number}
     *   createUI(container, windowId) → cleanup function | void
     */
    register(def) {
        const required = ['id', 'name', 'icon', 'createUI'];
        for (const f of required) {
            if (!def[f]) {
                console.error(`ToolRegistry: missing "${f}" in`, def);
                return;
            }
        }
        this._tools.push({
            description: '',
            tags: [],
            defaultWidth: 620,
            defaultHeight: 480,
            minWidth: 320,
            minHeight: 220,
            ...def,
        });
        window.dispatchEvent(new CustomEvent('tool-registered', { detail: def }));
    },

    getAll()      { return [...this._tools]; },
    getById(id)   { return this._tools.find(t => t.id === id); },
};
