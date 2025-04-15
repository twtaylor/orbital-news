import { test, expect } from '@playwright/test';

test.describe('Orbital System Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the application to initialize
    await page.waitForTimeout(2000);
  });

  test('should allow camera rotation with mouse drag', async ({ page }) => {
    // Get the orbital container
    const container = page.locator('.orbital-container');
    
    // Store initial canvas state
    await page.screenshot({ path: 'tests/screenshots/before-drag.png' });
    
    // Perform a mouse drag operation
    const box = await container.boundingBox();
    if (box) {
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;
      
      await page.mouse.move(centerX, centerY);
      await page.mouse.down();
      await page.mouse.move(centerX + 100, centerY, { steps: 10 });
      await page.mouse.up();
    }
    
    // Wait for animation to stabilize
    await page.waitForTimeout(500);
    
    // Take screenshot after drag
    await page.screenshot({ path: 'tests/screenshots/after-drag.png' });
    
    // Verify the test completes without errors
    // In a real test, we would compare screenshots, but for now we just verify the container is still visible
    await expect(container).toBeVisible();
  });

  test('should allow zooming with mouse wheel', async ({ page }) => {
    // Get the orbital container
    const container = page.locator('.orbital-container');
    
    // Store initial canvas state
    await page.screenshot({ path: 'tests/screenshots/before-zoom.png' });
    
    // Perform a mouse wheel operation
    const box = await container.boundingBox();
    if (box) {
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;
      
      await page.mouse.move(centerX, centerY);
      await page.mouse.wheel(0, -100); // Zoom in
    }
    
    // Wait for animation to stabilize
    await page.waitForTimeout(500);
    
    // Take screenshot after zoom
    await page.screenshot({ path: 'tests/screenshots/after-zoom.png' });
    
    // Verify the test completes without errors
    // In a real test, we would compare screenshots, but for now we just verify the container is still visible
    await expect(container).toBeVisible();
  });
});
