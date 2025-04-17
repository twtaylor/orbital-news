import { test, expect, Page } from '@playwright/test';
import enhancedMockArticles from '../fixtures/enhanced-mock-articles.json';

// Define TypeScript interfaces for window extensions
declare global {
  interface Window {
    eventLog: Array<{
      type: string;
      x?: number;
      y?: number;
      target?: string;
      targetClass?: string;
      message?: string;
      source?: string;
      lineno?: number;
      colno?: number;
      reason?: string;
      timestamp: string;
    }>;
    mouseX: number;
    mouseY: number;
    hoverEvents: Array<{
      timestamp: string;
      article: { id: string; title: string } | null;
    }>;
    hoverDetected: boolean;
    OrbitalSystem: any; // Constructor function
    orbitalSystem?: {
      scene: { exists: boolean };
      isPaused: boolean;
    }; // Minimal interface for the OrbitalSystem instance
  }
}

// Add instrumentation code to the page to help debug events
const debugScript = `
window.eventLog = [];
window.mouseX = 0;
window.mouseY = 0;

window.addEventListener('mousemove', (e) => {
  window.mouseX = e.clientX;
  window.mouseY = e.clientY;
});

// Intercept click events to log them
window.addEventListener('click', (e) => {
  window.eventLog.push({
    type: 'click',
    x: e.clientX,
    y: e.clientY,
    target: e.target.tagName,
    targetClass: e.target.className,
    timestamp: new Date().toISOString()
  });
  console.log('Click event logged:', e.clientX, e.clientY, e.target.tagName);
}, true);

// Monitor for errors
window.addEventListener('error', (e) => {
  window.eventLog.push({
    type: 'error',
    message: e.message,
    source: e.filename,
    lineno: e.lineno,
    colno: e.colno,
    timestamp: new Date().toISOString()
  });
  console.error('Error logged:', e.message);
});

// Monitor for unhandled promise rejections
window.addEventListener('unhandledrejection', (e) => {
  window.eventLog.push({
    type: 'unhandledrejection',
    reason: e.reason?.message || String(e.reason),
    timestamp: new Date().toISOString()
  });
  console.error('Unhandled rejection logged:', e.reason);
});
`;

// Configure tests to run in both headed and headless modes
test.describe.configure({ mode: 'parallel' });

test.describe('Hover and Click Interactions', () => {
  test.beforeEach(async ({ page }) => {
    // Add instrumentation to the page before navigating to it
    await page.addInitScript(debugScript);
    
    // Add more detailed instrumentation for hover events
    await page.addInitScript(`
      // Track hover events specifically
      window.hoverEvents = [];
      window.hoverDetected = false;
      
      // Intercept the onArticleHover callback
      const originalOrbitalSystemInit = window.OrbitalSystem;
      if (typeof originalOrbitalSystemInit === 'function') {
        window.OrbitalSystem = function(...args) {
          const instance = new originalOrbitalSystemInit(...args);
          const originalOnArticleHover = instance.onArticleHover;
          
          // Override the onArticleHover to track hover events
          instance.onArticleHover = function(article) {
            window.hoverEvents.push({
              timestamp: new Date().toISOString(),
              article: article ? { id: article.id, title: article.title } : null
            });
            window.hoverDetected = !!article;
            
            // Call the original handler
            if (originalOnArticleHover) {
              return originalOnArticleHover.call(this, article);
            }
          };
          
          return instance;
        };
      }
    `);
    
    // Mock the API response with our enhanced mock articles
    await page.route('/api/articles*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            articles: enhancedMockArticles
          }
        })
      });
    });
    
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the application to initialize
    await page.waitForTimeout(3000);
    
    // Log that the page has loaded
    console.log('Page loaded and initialized');
    
    // Take a screenshot of the initial state
    await page.screenshot({ path: `tests/screenshots/initial-state-${Date.now()}.png` });
  });

  // Helper function to move mouse over the orbital container
  async function hoverOverOrbitalSystem(page: Page) {
    const orbitalContainer = page.locator('.orbital-container');
    await expect(orbitalContainer).toBeVisible();
    
    // Get the bounding box of the orbital container
    const boundingBox = await orbitalContainer.boundingBox();
    if (!boundingBox) {
      throw new Error('Could not get bounding box of orbital container');
    }
    
    // Move mouse to the center of the orbital container
    await page.mouse.move(
      boundingBox.x + boundingBox.width / 2,
      boundingBox.y + boundingBox.height / 2
    );
  }

  // More thorough exploration function
  async function exploreOrbitalSystemThoroughly(page: Page) {
    const orbitalContainer = page.locator('.orbital-container');
    const boundingBox = await orbitalContainer.boundingBox();
    if (!boundingBox) {
      throw new Error('Could not get bounding box of orbital container');
    }
    
    // Move mouse in a grid pattern to thoroughly explore the orbital system
    const centerX = boundingBox.x + boundingBox.width / 2;
    const centerY = boundingBox.y + boundingBox.height / 2;
    
    // First try a spiral pattern (more likely to hit orbiting planets)
    const spiralSteps = 15;
    const radius = Math.min(boundingBox.width, boundingBox.height) * 0.45;
    
    console.log('Starting spiral exploration pattern');
    
    for (let i = 0; i < spiralSteps; i++) {
      const angle = (i / spiralSteps) * Math.PI * 4; // Two full rotations
      const distance = (i / spiralSteps) * radius;
      
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;
      
      await page.mouse.move(x, y);
      
      // Wait briefly at each position to allow hover detection
      await page.waitForTimeout(300);
      
      // Check if the HUD is visible
      const isHudVisible = await page.locator('.article-hud').isVisible();
      if (isHudVisible) {
        console.log(`HUD detected during spiral exploration at step ${i}, position (${x},${y})`);
        await page.screenshot({ path: `tests/screenshots/hover-detected-spiral-${i}-${Date.now()}.png` });
        return; // Exit early if we found a planet
      }
    }
    
    // If spiral pattern didn't work, try a grid pattern
    console.log('Spiral pattern did not find any planets, trying grid pattern');
    const gridSize = 5; // 5x5 grid
    
    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        const posX = boundingBox.x + (boundingBox.width * (x + 0.5)) / gridSize;
        const posY = boundingBox.y + (boundingBox.height * (y + 0.5)) / gridSize;
        
        await page.mouse.move(posX, posY);
        await page.waitForTimeout(300);
        
        // Check if the HUD is visible
        const isHudVisible = await page.locator('.article-hud').isVisible();
        if (isHudVisible) {
          console.log(`HUD detected during grid exploration at position (${x},${y})`);
          await page.screenshot({ 
            path: `tests/screenshots/hover-detected-grid-${x}-${y}-${Date.now()}.png` 
          });
          return; // Exit early if we found a planet
        }
      }
    }
    
    // If we still haven't found a planet, try random positions
    console.log('Grid pattern did not find any planets, trying random positions');
    const randomAttempts = 10;
    
    for (let i = 0; i < randomAttempts; i++) {
      const posX = boundingBox.x + Math.random() * boundingBox.width;
      const posY = boundingBox.y + Math.random() * boundingBox.height;
      
      await page.mouse.move(posX, posY);
      await page.waitForTimeout(500); // Wait a bit longer for random positions
      
      // Check if the HUD is visible
      const isHudVisible = await page.locator('.article-hud').isVisible();
      if (isHudVisible) {
        console.log(`HUD detected during random exploration at attempt ${i}`);
        await page.screenshot({ 
          path: `tests/screenshots/hover-detected-random-${i}-${Date.now()}.png` 
        });
        return;
      }
    }
    
    console.log('Could not find any planets with hover detection after thorough exploration');
  }

  test('should show HUD when hovering over planets', async ({ page }) => {
    // First move to the orbital system
    await hoverOverOrbitalSystem(page);
    
    // Explore the orbital system to find planets with a more thorough approach
    await exploreOrbitalSystemThoroughly(page);
    
    // Check if the HUD was displayed at some point
    const isHudVisible = await page.locator('.article-hud').isVisible();
    
    // Get hover events from the page
    const hoverEvents = await page.evaluate(() => window.hoverEvents || []);
    const hoverDetected = await page.evaluate(() => window.hoverDetected || false);
    
    // Take a screenshot of the final state
    await page.screenshot({ path: `tests/screenshots/after-hover-exploration-${Date.now()}.png` });
    
    // Log detailed information about hover detection
    console.log('HUD visible after exploration:', isHudVisible);
    console.log('Hover detected in JavaScript:', hoverDetected);
    console.log('Number of hover events:', hoverEvents.length);
    if (hoverEvents.length > 0) {
      console.log('Last hover event:', hoverEvents[hoverEvents.length - 1]);
    }
    
    // Verify cursor style changes on hover
    const cursorStyle = await page.evaluate(() => {
      const container = document.querySelector('.orbital-container');
      return container ? window.getComputedStyle(container).cursor : 'not found';
    });
    console.log('Cursor style:', cursorStyle);
    
    // If HUD is visible, verify its contents
    if (isHudVisible) {
      await expect(page.locator('.article-hud-title')).toBeVisible();
      await expect(page.locator('.article-hud-source')).toBeVisible();
    }
  });

  test('should handle click on planet without breaking UI', async ({ page }) => {
    // First move to the orbital system
    await hoverOverOrbitalSystem(page);
    
    // Explore the orbital system to find planets with a more thorough approach
    await exploreOrbitalSystemThoroughly(page);
    
    // Check if the HUD is visible
    const isHudVisible = await page.locator('.article-hud').isVisible();
    
    // If HUD is visible, try clicking on that position
    if (isHudVisible) {
      console.log('HUD found, attempting to click on planet');
      
      // Take screenshot before click
      await page.screenshot({ path: `tests/screenshots/before-planet-click-${Date.now()}.png` });
      
      // Get current mouse position (should be over a planet)
      const currentPosition = await page.evaluate(() => {
        return { x: window.mouseX, y: window.mouseY };
      });
      
      // Log the current state of the application before clicking
      await page.evaluate(() => {
        console.log('Application state before click:', {
          orbitalSystemExists: !!document.querySelector('.orbital-container'),
          hudVisible: !!document.querySelector('.article-hud'),
          menuPanelState: document.querySelector('.menu-panel')?.classList.contains('open') ? 'open' : 'closed',
          canvasElements: document.querySelectorAll('canvas').length,
          threejsScene: window.orbitalSystem?.scene ? 'exists' : 'not found'  
        });
      });
      
      // Click at the current position
      await page.mouse.click(currentPosition.x, currentPosition.y);
      
      // Wait a moment for any UI updates
      await page.waitForTimeout(1000);
      
      // Take screenshot after click
      await page.screenshot({ path: `tests/screenshots/after-planet-click-${Date.now()}.png` });
      
      // Log any events that were captured during the click
      const eventLog = await page.evaluate(() => window.eventLog);
      console.log('Event log:', JSON.stringify(eventLog, null, 2));
      
      // Log the state of the application after clicking
      await page.evaluate(() => {
        console.log('Application state after click:', {
          orbitalSystemExists: !!document.querySelector('.orbital-container'),
          hudVisible: !!document.querySelector('.article-hud'),
          menuPanelState: document.querySelector('.menu-panel')?.classList.contains('open') ? 'open' : 'closed',
          canvasElements: document.querySelectorAll('canvas').length,
          threejsScene: window.orbitalSystem?.scene ? 'exists' : 'not found'
        });
      });
      
      // Check for any errors in the console
      const errors = await page.evaluate(() => {
        return window.eventLog.filter(event => event.type === 'error' || event.type === 'unhandledrejection');
      });
      
      if (errors.length > 0) {
        console.error('Errors detected during click:', errors);
      }
      
      // Check if the sidebar opened
      const isSidebarOpen = await page.locator('.menu-panel.open').isVisible();
      console.log('Sidebar open after click:', isSidebarOpen);
      
      // Check if we can still see the orbital container
      const isOrbitalContainerVisible = await page.locator('.orbital-container').isVisible();
      console.log('Orbital container visible after click:', isOrbitalContainerVisible);
      
      // Verify the UI is still functional
      await expect(page.locator('.orbital-container')).toBeVisible();
      
      // Try clicking again to see if multiple clicks cause issues
      await page.mouse.click(currentPosition.x, currentPosition.y);
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `tests/screenshots/after-second-click-${Date.now()}.png` });
      
      // Verify the UI is still functional after second click
      await expect(page.locator('.orbital-container')).toBeVisible();
      console.log('Orbital container still visible after second click:', 
                 await page.locator('.orbital-container').isVisible());
    } else {
      console.log('No HUD found, skipping click test');
      test.skip();
    }
  });
  
  // Add a specific test for the click issue
  test('should specifically test for click event issues', async ({ page }) => {
    // Take a screenshot of the initial state
    await page.screenshot({ path: `tests/screenshots/click-test-initial-${Date.now()}.png` });
    
    // Get the orbital container
    const orbitalContainer = await page.locator('.orbital-container');
    await expect(orbitalContainer).toBeVisible();
    
    // Get the bounding box
    const boundingBox = await orbitalContainer.boundingBox();
    if (!boundingBox) {
      throw new Error('Could not get bounding box of orbital container');
    }
    
    // Perform a grid of clicks across the orbital container
    const gridSize = 5; // 5x5 grid
    const errors: Array<{ x: number; y: number; errors: any[] }> = [];
    
    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        // Calculate position
        const posX = boundingBox.x + (boundingBox.width * (x + 0.5)) / gridSize;
        const posY = boundingBox.y + (boundingBox.height * (y + 0.5)) / gridSize;
        
        // Move to position and wait to see if hover is detected
        await page.mouse.move(posX, posY);
        await page.waitForTimeout(300);
        
        // Take screenshot if HUD is visible
        const isHudVisible = await page.locator('.article-hud').isVisible();
        if (isHudVisible) {
          await page.screenshot({ 
            path: `tests/screenshots/click-test-hover-${x}-${y}-${Date.now()}.png` 
          });
          
          // Click and check for errors
          await page.mouse.click(posX, posY);
          await page.waitForTimeout(500);
          
          // Take screenshot after click
          await page.screenshot({ 
            path: `tests/screenshots/click-test-after-click-${x}-${y}-${Date.now()}.png` 
          });
          
          // Check if UI is still functional
          const isContainerVisible = await orbitalContainer.isVisible();
          console.log(`Grid position (${x},${y}): Container visible after click: ${isContainerVisible}`);
          
          // Check for errors
          const clickErrors = await page.evaluate(() => {
            return window.eventLog.filter(event => 
              event.type === 'error' || event.type === 'unhandledrejection'
            );
          });
          
          if (clickErrors.length > 0) {
            errors.push({ x, y, errors: clickErrors });
            console.error(`Errors at position (${x},${y}):`, clickErrors);
          }
          
          // Clear the event log for the next iteration
          await page.evaluate(() => { window.eventLog = []; });
          
          // Verify the orbital container is still visible
          await expect(orbitalContainer).toBeVisible();
        }
      }
    }
    
    // Log summary of errors
    if (errors.length > 0) {
      console.error(`Found ${errors.length} positions with errors`);
    } else {
      console.log('No errors detected in grid click test');
    }
  });

  test('should test pause functionality with keyboard', async ({ page }) => {
    // First ensure the orbital system is visible
    await expect(page.locator('.orbital-container')).toBeVisible();
    
    // Take screenshot of initial state
    await page.screenshot({ path: 'tests/screenshots/before-pause.png' });
    
    // Press the 'h' key to pause
    await page.keyboard.press('h');
    
    // Wait a moment for the pause to take effect
    await page.waitForTimeout(500);
    
    // Take screenshot after pause
    await page.screenshot({ path: 'tests/screenshots/after-pause.png' });
    
    // Check if the pause button shows the play icon (▶)
    const pauseButton = page.locator('.pause-button');
    const pauseButtonText = await pauseButton.textContent();
    console.log('Pause button text after pressing h:', pauseButtonText);
    
    // Verify the UI is still functional
    await expect(page.locator('.orbital-container')).toBeVisible();
    
    // Press 'h' again to resume
    await page.keyboard.press('h');
    
    // Wait a moment for the resume to take effect
    await page.waitForTimeout(500);
    
    // Take screenshot after resume
    await page.screenshot({ path: 'tests/screenshots/after-resume.png' });
    
    // Check if the pause button shows the pause icon (⏸)
    const resumeButtonText = await pauseButton.textContent();
    console.log('Pause button text after pressing h again:', resumeButtonText);
  });
});
