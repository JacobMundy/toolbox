const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  // Mock Tauri environment for browser-based testing
  await page.addInitScript(() => {
    window.__TAURI__ = {
      invoke: async (cmd, args) => {
        console.log('Tauri Invoke:', cmd, args);
        if (cmd === 'get_system_stats') return { cpu_usage: 5.0, memory_usage_mb: 512 };
        return null;
      }
    };
  });
  
  // Navigate to the app (assuming dev server is running on :3000)
  await page.goto('http://localhost:3000');
});

test.describe('Date Checker Tool UI & Integration', () => {
  test('should open, add target dates, toggle formats, and render the calendar range', async ({ page }) => {
    // 1. Open App Drawer and select Date Checker
    await page.click('#app-drawer-btn');
    await page.click('.app-drawer-item:has-text("Date Checker")');
    
    // Locate the Date Checker window
    const dc = page.locator('.window:has-text("Date Checker")');
    await expect(dc).toBeVisible();

    // 2. Set Start Date to 2026-06-10
    const startInput = dc.locator('input[id^="dc-start-date-"]');
    await startInput.fill('2026-06-10');
    await startInput.dispatchEvent('change');

    // 3. Add a target date: 2026-06-25, Label: "My Birthday"
    const newDateInput = dc.locator('input[id^="dc-new-date-"]');
    const newLabelInput = dc.locator('input[id^="dc-new-label-"]');
    const addBtn = dc.locator('button[id^="dc-add-btn-"]');

    await newDateInput.fill('2026-06-25');
    await newLabelInput.fill('My Birthday');
    await addBtn.click();

    // 4. Verify target date card is created in the list
    const targetList = dc.locator('div[id^="dc-target-list-"]');
    const card = targetList.locator('.dc-card:has-text("My Birthday")');
    await expect(card).toBeVisible();
    await expect(card.locator('.dc-card-date')).toHaveText('Jun 25, 2026');

    // 5. Test different formats on the card
    const formatSeg = dc.locator('div[id^="dc-format-seg-"]');
    
    // By default, it should be in "days" format
    await expect(card.locator('.dc-card-diff')).toHaveText('15 days remaining');

    // Click "Months & Days" format
    await formatSeg.locator('button[data-fmt="months"]').click();
    await expect(card.locator('.dc-card-diff')).toHaveText('15 days remaining'); // 15 days is less than 1 month, so still 15 days

    // Click "Years/Months/Days" format
    await formatSeg.locator('button[data-fmt="years"]').click();
    await expect(card.locator('.dc-card-diff')).toHaveText('15 days remaining');

    // Add another target date that is far away: 2027-08-15, Label: "Next Vacation"
    await newDateInput.fill('2027-08-15');
    await newLabelInput.fill('Next Vacation');
    await addBtn.click();

    const vacationCard = targetList.locator('.dc-card:has-text("Next Vacation")');
    await expect(vacationCard).toBeVisible();

    // With Y/M/D format selected:
    // From 2026-06-10 to 2027-08-15:
    // 2026-06-10 + 1 year = 2027-06-10
    // 2027-06-10 + 2 months = 2027-08-10
    // 2027-08-10 to 2027-08-15 = 5 days
    // Expected: 1 year, 2 months, 5 days remaining
    await expect(vacationCard.locator('.dc-card-diff')).toHaveText('1 year, 2 months, 5 days remaining');

    // Switch back to "days" format:
    await formatSeg.locator('button[data-fmt="days"]').click();
    // 2026 is not a leap year. 2027 is not.
    // Days between 2026-06-10 and 2027-08-15:
    // 365 + 30 (Jun) - 10 + 31 (Jul) + 15 (Aug) = 431 days. Let's verify:
    await expect(vacationCard.locator('.dc-card-diff')).toHaveText('431 days remaining');

    // Switch to "Months & Days" format:
    await formatSeg.locator('button[data-fmt="months"]').click();
    // Expected: 14 months, 5 days remaining
    await expect(vacationCard.locator('.dc-card-diff')).toHaveText('14 months, 5 days remaining');

    // 6. Test calendar highlight
    // Click on the birthday card to highlight it
    await card.click();
    await expect(card).toHaveClass(/active/);

    const calDays = dc.locator('div[id^="dc-cal-days-"]');
    // Start date is June 10, Target is June 25.
    // June 10 should have .start, June 25 should have .target
    // Let's verify that the calendar shows the correct start and target highlights
    const startDay = calDays.locator('.dc-day.start:has-text("10")');
    const targetDay = calDays.locator('.dc-day.target:has-text("25")');
    await expect(startDay).toBeVisible();
    await expect(targetDay).toBeVisible();

    // Range days (11 to 24) should have .in-range class
    const inRangeDay = calDays.locator('.dc-day.in-range:has-text("18")');
    await expect(inRangeDay).toBeVisible();

    // 7. Test state persistence
    // Reload the page and make sure data persists
    await page.reload();
    
    // Open the Date Checker again
    await page.click('#app-drawer-btn');
    await page.click('.app-drawer-item:has-text("Date Checker")');
    
    // Verify target dates are still there and start date matches
    const reloadedDc = page.locator('.window:has-text("Date Checker")');
    await expect(reloadedDc.locator('input[id^="dc-start-date-"]')).toHaveValue('2026-06-10');
    await expect(reloadedDc.locator('.dc-card:has-text("My Birthday")')).toBeVisible();
    await expect(reloadedDc.locator('.dc-card:has-text("Next Vacation")')).toBeVisible();
  });
});

test.describe('Date Checker Core Calculations Unit Tests', () => {
  test('should compute date differences correctly for standard and edge cases (including leap years)', async ({ page }) => {
    // Open Date Checker to load the script and expose window.__test_date_checker
    await page.click('#app-drawer-btn');
    await page.click('.app-drawer-item:has-text("Date Checker")');
    
    const results = await page.evaluate(() => {
      const dc = window.__test_date_checker;
      if (!dc) return { error: 'helper not found' };

      // Helper to format diff object
      const fmt = (s, e, format) => {
        const diff = dc.calculateDiff(s, e);
        return dc.formatDiff(diff, format);
      };

      return {
        // Case 1: Same month normal difference
        case1_days: fmt('2026-06-10', '2026-06-25', 'days'),
        case1_months: fmt('2026-06-10', '2026-06-25', 'months'),
        case1_years: fmt('2026-06-10', '2026-06-25', 'years'),

        // Case 2: Across months normal difference
        case2_days: fmt('2026-06-10', '2026-08-15', 'days'),
        case2_months: fmt('2026-06-10', '2026-08-15', 'months'),
        case2_years: fmt('2026-06-10', '2026-08-15', 'years'),

        // Case 3: Leap year (leap day Feb 29 included)
        case3_leap_days: fmt('2024-02-20', '2024-03-05', 'days'),
        case3_leap_months: fmt('2024-02-20', '2024-03-05', 'months'),
        
        // Case 4: Non-leap year (same dates as Case 3)
        case4_nonleap_days: fmt('2025-02-20', '2025-03-05', 'days'),
        case4_nonleap_months: fmt('2025-02-20', '2025-03-05', 'months'),

        // Case 5: 1 year across leap day
        case5_leap_year_days: fmt('2024-02-28', '2025-02-28', 'days'),
        case5_leap_year_years: fmt('2024-02-28', '2025-02-28', 'years'),

        // Case 6: Exact leap day start to next non-leap year Feb 28
        case6_exact_leap_years: fmt('2024-02-29', '2025-02-28', 'years'),

        // Case 7: End of month rollover (Jan 31 to Mar 1)
        case7_rollover_months: fmt('2026-01-31', '2026-03-01', 'months'),
        case7_rollover_years: fmt('2026-01-31', '2026-03-01', 'years'),

        // Case 8: Past date
        case8_past_days: fmt('2026-06-10', '2026-05-10', 'days'),
        case8_past_months: fmt('2026-06-10', '2026-05-10', 'months')
      };
    });

    expect(results.error).toBeUndefined();

    // Check Case 1: Same month
    expect(results.case1_days).toBe('15 days remaining');
    expect(results.case1_months).toBe('15 days remaining');
    expect(results.case1_years).toBe('15 days remaining');

    // Check Case 2: Across months
    expect(results.case2_days).toBe('66 days remaining');
    expect(results.case2_months).toBe('2 months, 5 days remaining');
    expect(results.case2_years).toBe('2 months, 5 days remaining');

    // Check Case 3: Leap year (Feb 20, 2024 to Mar 5, 2024 is 14 days due to Feb 29)
    expect(results.case3_leap_days).toBe('14 days remaining');
    expect(results.case3_leap_months).toBe('14 days remaining');

    // Check Case 4: Non-leap year (Feb 20, 2025 to Mar 5, 2025 is 13 days)
    expect(results.case4_nonleap_days).toBe('13 days remaining');
    expect(results.case4_nonleap_months).toBe('13 days remaining');

    // Check Case 5: 1 year across leap day
    expect(results.case5_leap_year_days).toBe('366 days remaining');
    expect(results.case5_leap_year_years).toBe('1 year remaining');

    // Check Case 6: Exact leap day start to next Feb 28
    expect(results.case6_exact_leap_years).toBe('1 year remaining');

    // Check Case 7: End of month rollover (Jan 31 to Feb 28 is 1 month; Feb 28 to Mar 1 is 1 day)
    expect(results.case7_rollover_months).toBe('1 month, 1 day remaining');
    expect(results.case7_rollover_years).toBe('1 month, 1 day remaining');

    // Check Case 8: Past date
    expect(results.case8_past_days).toBe('31 day' + ('s' /* 31 days */) + ' ago');
    expect(results.case8_past_months).toBe('1 month ago');
  });
});
