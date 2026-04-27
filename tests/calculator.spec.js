const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  // Mock Tauri environment for browser-based testing
  await page.addInitScript(() => {
    window.__TAURI__ = {
      invoke: async (cmd, args) => {
        console.log('Tauri Invoke:', cmd, args);
        if (cmd === 'get_system_stats') return { cpu_usage: 12.5, memory_usage_mb: 1024 };
        return null;
      }
    };
    // Mock other global objects if needed
  });
  
  // Navigate to the app (assuming dev server is running on :3000)
  await page.goto('http://localhost:3000');
});

test.describe('Calculator Tool', () => {
  test('should perform basic arithmetic correctly', async ({ page }) => {
    // 1. Open the App Drawer
    await page.click('#app-drawer-btn');
    
    // 2. Click the Calculator tool
    await page.click('.app-drawer-item:has-text("Calculator")');
    
    // 3. Locate the Calculator window
    const calc = page.locator('.window:has-text("Calculator")');
    await expect(calc).toBeVisible();
    
    // 4. Clear existing state (press 'C')
    await calc.locator('button[data-val="C"]').click();
    
    // 5. Perform: 7 * 8 = 56
    await calc.locator('button[data-val="7"]').click();
    await calc.locator('button[data-val="×"]').click();
    await calc.locator('button[data-val="8"]').click();
    await calc.locator('button[data-val="="]').click();
    
    // 6. Verify result
    const result = await calc.locator('#calc-res').innerText();
    expect(result).toBe('56');
  });

  test('should handle scientific functions (square root)', async ({ page }) => {
    await page.click('#app-drawer-btn');
    await page.click('.app-drawer-item:has-text("Calculator")');
    const calc = page.locator('.window:has-text("Calculator")');
    
    // Switch to Scientific mode
    await calc.locator('button[data-mode="scientific"]').click();
    
    // Calculate √64
    await calc.locator('button[data-val="√"]').click();
    await calc.locator('button[data-val="6"]').click();
    await calc.locator('button[data-val="4"]').click();
    await calc.locator('button[data-val=")"]').click();
    await calc.locator('button[data-val="="]').click();
    
    const result = await calc.locator('#calc-res').innerText();
    expect(result).toBe('8');
  });
});

test.describe('System Monitor', () => {
  test('should display mocked system stats in taskbar', async ({ page }) => {
    // Wait for the setInterval to trigger (2s) or check initial call
    const cpuStat = page.locator('#cpu-stat');
    const memStat = page.locator('#mem-stat');
    
    // Since we mocked 12.5% and 1024MB in the init script
    await expect(cpuStat).toContainText('CPU: 12.5%');
    await expect(memStat).toContainText('RAM: 1024MB');
  });
});
