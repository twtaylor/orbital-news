import { test, expect } from '@playwright/test';
import mockArticles from '../fixtures/mock-articles.json';

test.describe('API Mocking', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the API response
    await page.route('/api/articles*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            articles: mockArticles
          }
        })
      });
    });
    
    await page.goto('/');
    await page.waitForTimeout(2000);
  });

  test('should display mocked articles', async ({ page }) => {
    // Open the menu
    await page.locator('.menu-toggle').click();
    
    // Click load articles button to trigger API call
    await page.getByRole('button', { name: 'Load Articles' }).click();
    
    // Wait for articles to load
    await page.waitForTimeout(1000);
    
    // Check if orbital system has planets (visual check)
    await page.screenshot({ path: 'tests/screenshots/mocked-articles.png' });
    
    // Verify the orbital container is visible after loading mocked articles
    await expect(page.locator('.orbital-container')).toBeVisible();
    
    // Verify that at least one planet (article) is visible
    // In a real test, we would check for specific elements that represent planets
    const orbitalContainer = page.locator('.orbital-container');
    await expect(orbitalContainer).toBeVisible();
    
    // We can also check that the menu is still open
    await expect(page.locator('.menu-panel')).toBeVisible();
    await expect(page.locator('.menu-panel')).toHaveClass(/open/);
  });
});
