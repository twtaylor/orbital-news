import { test, expect } from '@playwright/test';

test.describe('Orbital News Application', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the application to initialize and 3D scene to render
    await page.waitForTimeout(2000);
  });

  test('should load the application successfully', async ({ page }) => {
    // Check for the orbital container
    await expect(page.locator('.orbital-container')).toBeVisible();
    
    // Check for the menu button
    await expect(page.locator('.menu-toggle')).toBeVisible();
    
    // Check for the pause button
    await expect(page.locator('.pause-button')).toBeVisible();
  });

  test('should toggle menu when menu button is clicked', async ({ page }) => {
    // Click the menu button
    await page.locator('.menu-toggle').click();
    
    // Check if menu panel is open
    await expect(page.locator('.menu-panel')).toHaveClass(/open/);
    
    // Check for menu content
    await expect(page.locator('.menu-panel h1').getByText('Orbital News')).toBeVisible();
    await expect(page.locator('.search-section h2').getByText('Search')).toBeVisible();
    
    // Close the menu
    await page.locator('.menu-toggle').click();
    
    // Check if menu panel is closed
    await expect(page.locator('.menu-panel')).not.toHaveClass(/open/);
  });

  test('should toggle pause state when pause button is clicked', async ({ page }) => {
    // Get the initial pause button state
    const initialText = await page.locator('.pause-button').textContent();
    
    // Click the pause button
    await page.locator('.pause-button').click();
    
    // Check if the button text changed
    const newText = await page.locator('.pause-button').textContent();
    expect(newText).not.toEqual(initialText);
    
    // Click again to toggle back
    await page.locator('.pause-button').click();
    
    // Check if the button text returned to initial state
    const finalText = await page.locator('.pause-button').textContent();
    expect(finalText).toEqual(initialText);
  });
});
