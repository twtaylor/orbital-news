import { test, expect } from '@playwright/test';

test.describe('Article Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the application to initialize
    await page.waitForTimeout(2000);
    
    // Open the menu to interact with search
    await page.locator('.menu-toggle').click();
  });

  test('should search for articles with zip code', async ({ page }) => {
    // Enter zip code
    await page.locator('#zipCode').fill('10001');
    
    // Click load articles button
    await page.getByRole('button', { name: 'Load Articles' }).click();
    
    // Wait for articles to load
    await page.waitForTimeout(2000);
    
    // Check if orbital system has planets (visual check)
    await page.screenshot({ path: 'tests/screenshots/after-search.png' });
    
    // Verify the zip code field still has the entered value
    await expect(page.locator('#zipCode')).toHaveValue('10001');
  });

  test('should refresh articles', async ({ page }) => {
    // Click load articles button to refresh
    await page.getByRole('button', { name: 'Load Articles' }).click();
    
    // Wait for articles to refresh
    await page.waitForTimeout(2000);
    
    // Check if orbital system has refreshed planets (visual check)
    await page.screenshot({ path: 'tests/screenshots/after-refresh.png' });
    
    // Verify the orbital container is still visible after refresh
    await expect(page.locator('.orbital-container')).toBeVisible();
  });
});
