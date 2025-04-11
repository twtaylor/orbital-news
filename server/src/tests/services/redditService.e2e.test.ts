import { RedditService } from '../../services/redditService';
import { Article } from '../../types/models/article.type';
import 'jest';

/**
 * End-to-end test for the RedditService
 * This test verifies the complete flow from fetching articles to location extraction
 */
// Set longer timeout for all tests in this suite due to API calls
jest.setTimeout(30000);

describe('RedditService E2E', () => {
  let redditService: RedditService;
  
  beforeAll(() => {
    redditService = new RedditService();
  });
  
  it('should fetch an article and extract its location', async () => {
    // Fetch a single article
    const articles = await redditService.fetchArticles('worldnews', 1);
    
    // Verify we got an article back
    expect(articles).toHaveLength(1);
    
    const article = articles[0];
    
    // Verify basic article properties
    expect(article.id).toBeDefined();
    expect(article.title).toBeDefined();
    expect(article.content).toBeDefined();
    expect(article.source).toBe('reddit');
    // Reddit posts may link to external sources, so we just verify the URL is valid
    expect(article.sourceUrl).toBeDefined();
    // Only check the URL format if sourceUrl is defined
    if (article.sourceUrl) {
      expect(article.sourceUrl.startsWith('http')).toBe(true);
    }
    
    // Verify location was extracted
    expect(article.location).toBeDefined();
    expect(article.location.length).toBeGreaterThan(0);
    
    // Log the article details for inspection
    console.log('Reddit article with extracted location:', {
      title: article.title.substring(0, 50) + '...',
      content: article.content.substring(0, 50) + '...',
      location: article.location,
      tier: article.tier,
      mass: article.mass
    });
    
    // Test should pass even if location is "Global" (the default)
    // but we log it for manual inspection
  }, 25000); // Increase timeout for API calls and location extraction
  
  it('should extract location from mock article with known location mentions', async () => {
    // Use getMockArticles which should extract locations from the content
    // Access private method using type assertion
    const mockArticles = await (redditService as any).getMockArticles();
    
    // Get the first mock article which mentions Cambridge, Massachusetts
    const mitArticle = mockArticles[0];
    
    // Verify location was extracted
    expect(mitArticle.location).toBeDefined();
    expect(mitArticle.location.length).toBeGreaterThan(0);
    expect(mitArticle.location.toLowerCase()).toContain('cambridge');
    
    // Log the mock article details
    console.log('Mock article with extracted location:', {
      title: mitArticle.title,
      location: mitArticle.location
    });
    
    // Get the second mock article which mentions San Francisco
    const sfArticle = mockArticles[1];
    
    // Verify location was extracted
    expect(sfArticle.location).toBeDefined();
    expect(sfArticle.location.length).toBeGreaterThan(0);
    expect(
      sfArticle.location.toLowerCase().includes('san francisco') || 
      sfArticle.location.toLowerCase().includes('silicon valley') ||
      sfArticle.location.toLowerCase().includes('california')
    ).toBe(true);
    
    // Log the mock article details
    console.log('Mock article with extracted location:', {
      title: sfArticle.title,
      location: sfArticle.location
    });
  });
  
  // This test makes the private method accessible for testing
  it('should make getMockArticles accessible for testing', () => {
    // Verify the method exists
    expect(typeof (redditService as any).getMockArticles).toBe('function');
  });
});
