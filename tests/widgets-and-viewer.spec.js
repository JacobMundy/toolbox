const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  // Mock Tauri environment
  await page.addInitScript(() => {
    window.__TAURI__ = {
      invoke: async (cmd, args) => {
        console.log('Tauri Invoke:', cmd, args);
        if (cmd === 'get_system_stats') return { cpu_usage: 5.0, memory_usage_mb: 512 };
        return null;
      }
    };
  });
  
  // Navigate to local dev server
  await page.goto('http://localhost:3000');
});

test.describe('Desktop Widgets', () => {
  test('should add clock and sticky note widgets, configure styles/themes, and drag them', async ({ page }) => {
    const desktop = page.locator('#desktop');
    await expect(desktop).toBeVisible();

    // 1. Open Desktop Context Menu
    // Right click on the desktop (empty area)
    await desktop.click({ button: 'right', position: { x: 300, y: 300 } });
    
    const ctxMenu = page.locator('.desktop-ctx-menu');
    await expect(ctxMenu).toBeVisible();

    // 2. Add Clock Widget
    await ctxMenu.locator('#ctx-add-clock').click();
    const clockWidget = desktop.locator('.desktop-widget:has(.widget-clock)');
    await expect(clockWidget).toBeVisible();

    // Verify clock dial has all 12 numbers
    const clockSvg = clockWidget.locator('svg.widget-clock-svg');
    await expect(clockSvg).toBeVisible();
    for (let i = 1; i <= 12; i++) {
      const numText = clockSvg.getByText(String(i), { exact: true });
      await expect(numText).toBeVisible();
    }

    // 3. Configure Clock Widget Style via Right-Click
    await clockWidget.click({ button: 'right' });
    await expect(ctxMenu).toBeVisible();
    // Select Analog Only style
    await ctxMenu.locator('#ctx-clk-analog').click();
    await expect(clockWidget.locator('.widget-clock')).toHaveCSS('height', '140px');
    await expect(clockWidget.locator('.widget-clock')).toHaveCSS('width', '140px');

    // 4. Add Sticky Note Widget
    await desktop.click({ button: 'right', position: { x: 500, y: 300 } });
    await ctxMenu.locator('#ctx-add-sticky').click();
    const stickyWidget = desktop.locator('.desktop-widget:has(.widget-sticky)');
    await expect(stickyWidget).toBeVisible();

    // Write note
    const textarea = stickyWidget.locator('textarea.widget-sticky-textarea');
    await expect(textarea).toBeVisible();
    await textarea.fill('Meet team at 4 PM');
    await textarea.dispatchEvent('input');

    // Change Sticky Theme via Right-Click
    await stickyWidget.click({ button: 'right' });
    await expect(ctxMenu).toBeVisible();
    await ctxMenu.locator('#ctx-stk-yellow').click();
    await expect(stickyWidget.locator('.widget-sticky')).toHaveClass(/theme-yellow/);

    // 5. Test Persistence on Reload
    await page.reload();
    await expect(desktop.locator('.desktop-widget:has(.widget-clock)')).toBeVisible();
    
    const reloadedSticky = desktop.locator('.desktop-widget:has(.widget-sticky)');
    await expect(reloadedSticky).toBeVisible();
    await expect(reloadedSticky.locator('.widget-sticky')).toHaveClass(/theme-yellow/);
    await expect(reloadedSticky.locator('textarea.widget-sticky-textarea')).toHaveValue('Meet team at 4 PM');

    // Delete Widget
    await reloadedSticky.click({ button: 'right' });
    await ctxMenu.locator('#ctx-del-widget').click();
    await expect(desktop.locator('.desktop-widget:has(.widget-sticky)')).not.toBeVisible();
  });
});

test.describe('HTML Viewer Tool', () => {
  test('should open the HTML Viewer, load a sample, and render output in iframe', async ({ page }) => {
    // 1. Open App Drawer and select HTML Viewer
    await page.click('#app-drawer-btn');
    await page.click('.app-drawer-item:has-text("HTML Viewer")');

    const hvWindow = page.locator('.window:has-text("HTML Viewer")');
    await expect(hvWindow).toBeVisible();

    // 2. Load Sample HTML
    const sampleBtn = hvWindow.locator('#hv-sample-btn');
    await sampleBtn.click();

    // 3. Verify Preview Iframe Content
    const previewIframe = hvWindow.locator('iframe#hv-iframe');
    await expect(previewIframe).toBeVisible();

    // Check that inside the iframe, the sample HTML elements are loaded
    const iframeContent = previewIframe.contentFrame();
    const heading = iframeContent.locator('h1');
    await expect(heading).toHaveText('HTML Live Viewer');

    const button = iframeContent.locator('#alert-btn');
    await expect(button).toBeVisible();

    // 4. Test Manual Code Input & Rendering
    // We can clear clear the editor and insert custom HTML
    const clearBtn = hvWindow.locator('#hv-clear-btn');
    
    // Accept confirm dialog automatically
    page.once('dialog', async dialog => {
      await dialog.accept();
    });
    await clearBtn.click();

    // Type new html
    const textarea = hvWindow.locator('#hv-textarea');
    const autoRun = hvWindow.locator('#hv-auto-run');
    
    // Uncheck auto run to test manual trigger
    await autoRun.uncheck();
    
    // Since Monaco might overlay on top, we type in the textarea if Monaco is slow,
    // but we can type directly if textarea is visible or monaco.
    // Let's type in whichever is active.
    const isTextareaVisible = await textarea.isVisible();
    if (isTextareaVisible) {
      await textarea.fill('<h2>Custom Heading</h2>');
      await textarea.dispatchEvent('input');
    } else {
      // Monaco is active, evaluate typing inside Monaco
      await page.evaluate(() => {
        const monacoEl = document.querySelector('#hv-monaco');
        if (monacoEl && monacoEl.style.display !== 'none') {
          // Monaco editor instance is stored in closures, but we can trigger it or we can just mock inputs
          // Or we can evaluate using Monaco's model getValue/setValue
          const editors = window.monaco.editor.getEditors();
          if (editors.length > 0) {
            editors[0].setValue('<h2>Custom Heading</h2>');
          }
        }
      });
    }

    // Since Auto Run is unchecked, the heading should NOT be Custom Heading yet
    await expect(iframeContent.locator('h2')).not.toBeVisible();

    // Click Run Code
    const runBtn = hvWindow.locator('#hv-run-btn');
    await runBtn.click();

    // Now it should show the new heading
    await expect(iframeContent.locator('h2')).toHaveText('Custom Heading');
  });
});
