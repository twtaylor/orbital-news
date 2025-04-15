import { test, expect } from '@playwright/test';

test.describe('Pause Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the application to initialize
    await page.waitForTimeout(2000);
  });

  test('should pause the orbital system when pause button is clicked', async ({ page }) => {
    // Get the orbital container and pause button
    const container = page.locator('.orbital-container');
    const pauseButton = page.locator('.pause-button');
    
    // Verify initial state
    await expect(container).toBeVisible();
    await expect(pauseButton).toBeVisible();
    
    // Take screenshot before pausing
    await page.screenshot({ path: 'tests/screenshots/before-pause.png' });
    
    // Click pause button
    await pauseButton.click();
    
    // Verify pause button state changed
    await expect(pauseButton).toHaveAttribute('title', 'Resume motion');
    
    // Wait a moment to ensure animation has paused
    await page.waitForTimeout(500);
    
    // Take screenshot after pausing
    await page.screenshot({ path: 'tests/screenshots/after-pause.png' });
    
    // Click pause button again to resume
    await pauseButton.click();
    
    // Verify pause button state changed back
    await expect(pauseButton).toHaveAttribute('title', 'Pause motion');
    
    // Wait a moment to ensure animation has resumed
    await page.waitForTimeout(500);
    
    // Take screenshot after resuming
    await page.screenshot({ path: 'tests/screenshots/after-resume.png' });
  });
});
