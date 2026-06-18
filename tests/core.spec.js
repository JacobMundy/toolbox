const { test, expect } = require('@playwright/test');

/**
 * Toolbox Core Functionality Tests
 * Verifies window management, cross-tool navigation, and basic tool operations.
 */

test.beforeEach(async ({ page }) => {
  // Mock Tauri environment for browser testing
  await page.addInitScript(() => {
    const invoke = async (cmd, args) => {
      if (cmd === 'get_system_stats') return { cpu_usage: 12.5, memory_usage_mb: 1024 };
      if (cmd === 'workspace_info') {
        return {
          path: '/mock/workspace',
          files: [
            { name: 'README.md', is_dir: false, size: 512, virtual_file: false },
            { name: 'Notes', is_dir: true, size: 0, virtual_file: false }
          ]
        };
      }
      if (cmd === 'workspace_read') return { success: true, content: '# Mock Content\nTest passed.' };
      return null;
    };
    window.__TAURI__ = { invoke, core: { invoke } };
    localStorage.clear();
  });
  
  await page.goto('http://localhost:3000');
});

test.describe('Application Shell & Navigation', () => {
  
  test('should open/close tools from the app drawer', async ({ page }) => {
    await page.click('#app-drawer-btn');
    await page.click('.app-drawer-item:has-text("Calculator")');
    
    const win = page.locator('.window:has-text("Calculator")');
    await expect(win).toBeVisible();
    
    // Close the tool
    await win.locator('.window-close').click();
    await expect(win).not.toBeVisible();
  });

  test('should minimize and restore windows via taskbar', async ({ page }) => {
    await page.click('#app-drawer-btn');
    await page.click('.app-drawer-item:has-text("Notepad")');
    const win = page.locator('.window:has-text("Notepad")');
    
    // Minimize
    await win.locator('.window-minimize').click();
    await expect(win).toHaveClass(/minimized/);
    
    // Click taskbar item to restore
    await page.click('.taskbar-item:has-text("Notepad")');
    await expect(win).not.toHaveClass(/minimized/);
  });

});

test.describe('Notepad Operations', () => {

  test('should support multi-tab note management', async ({ page }) => {
    await page.click('#app-drawer-btn');
    await page.click('.app-drawer-item:has-text("Notepad")');
    const notepad = page.locator('.window:has-text("Notepad")');
    
    // Initial tab
    await expect(notepad.locator('.np-tab')).toHaveCount(1);
    
    // Add tab
    await notepad.locator('.np-tab-add').click();
    await expect(notepad.locator('.np-tab')).toHaveCount(2);
    
    // Switch tab
    await notepad.locator('.np-tab').first().click();
    await expect(notepad.locator('.np-tab').first()).toHaveClass(/active/);
  });

  test('should update word and character counts when typing', async ({ page }) => {
    await page.click('#app-drawer-btn');
    await page.click('.app-drawer-item:has-text("Notepad")');
    const notepad = page.locator('.window:has-text("Notepad")');
    
    // Wait for Monaco to load
    const editor = notepad.locator('.monaco-editor');
    await expect(editor).toBeVisible();
    
    // Inject text into Monaco
    await page.evaluate(() => {
        const models = window.monaco.editor.getModels();
        if (models.length > 0) models[0].setValue('Testing 123');
    });
    
    // Check stats (debounced)
    await expect(notepad.locator('[id^="np-wc-"]')).toContainText('2 words');
    await expect(notepad.locator('[id^="np-cc-"]')).toContainText('11 chars');
  });

});

test.describe('Workspace Browser', () => {

  test('should display files and open Monaco preview', async ({ page }) => {
    await page.click('#app-drawer-btn');
    await page.click('.app-drawer-item:has-text("Workspace")');
    const ws = page.locator('.window:has-text("Workspace")');
    
    // Verify file listing
    await expect(ws.locator('.ws-file-item:has-text("README.md")')).toBeVisible();
    
    // Click to preview
    await ws.locator('.ws-file-item:has-text("README.md")').click();
    
    const preview = ws.locator('#ws-preview');
    await expect(preview).toHaveClass(/open/);
    await expect(preview.locator('.monaco-editor')).toBeVisible();
  });

});
