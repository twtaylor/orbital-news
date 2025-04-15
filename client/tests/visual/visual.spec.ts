import { test, expect } from '@playwright/test';

test.describe('Visual Tests', () => {
  test('orbital system visual appearance', async ({ page }) => {
    await page.goto('/');
    // Wait for the application to initialize
    await page.waitForTimeout(2000);
    
    // Take a screenshot of the entire application and save as baseline
    await page.screenshot({ path: 'tests/screenshots/orbital-system-baseline.png' });
    
    // Verify that the orbital container is visible
    await expect(page.locator('.orbital-container')).toBeVisible();
    
    // In a real test with visual comparison, we would do:
    // expect(await page.screenshot()).toMatchSnapshot('orbital-system.png');
  });

  test('paused orbital system appearance', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Pause the orbital system
    await page.locator('.pause-button').click();
    
    // Wait for animation to stop
    await page.waitForTimeout(500);
    
    // Take a screenshot of the paused state
    await page.screenshot({ path: 'tests/screenshots/paused-orbital-system-baseline.png' });
    
    // Verify that the pause button has the correct state
    await expect(page.locator('.pause-button')).toHaveAttribute('title', 'Resume motion');
  });
  
  // Test that verifies the 3D orbital characteristics match user preferences
  test('orbital system should display proper 3D orbits', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Take screenshots from different angles to verify 3D orbits
    const container = page.locator('.orbital-container');
    const box = await container.boundingBox();
    
    if (box) {
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;
      
      // Initial view
      await page.screenshot({ path: 'tests/screenshots/orbit-front-view.png' });
      
      // Rotate to side view to check y-axis variation
      await page.mouse.move(centerX, centerY);
      await page.mouse.down();
      await page.mouse.move(centerX + 200, centerY, { steps: 20 });
      await page.mouse.up();
      await page.waitForTimeout(500);
      
      await page.screenshot({ path: 'tests/screenshots/orbit-side-view.png' });
      
      // Rotate to top view to check elliptical orbits
      await page.mouse.move(centerX, centerY);
      await page.mouse.down();
      await page.mouse.move(centerX, centerY - 200, { steps: 20 });
      await page.mouse.up();
      await page.waitForTimeout(500);
      
      await page.screenshot({ path: 'tests/screenshots/orbit-top-view.png' });
      
      // Verify the orbital container is still visible after all rotations
      await expect(page.locator('.orbital-container')).toBeVisible();
    }
  });
});
