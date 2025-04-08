import { RedditService } from '../services/redditService';
import { Article, TierType } from '../models/Article';
import * as dotenv from 'dotenv';
import 'jest';

// Ensure environment variables are loaded
dotenv.config();

/**
 * Basic Jest test for the RedditService
 * This test verifies that the service can fetch articles from Reddit
 */
describe('RedditService Basic Tests', () => {
  let redditService: RedditService;

  beforeAll(() => {
    redditService = new RedditService();
  });

  test('should fetch articles from Reddit', async () => {
    // Fetch a small number of articles for testing
    const articles = await redditService.fetchArticles('news', 3);
    
    // Verify we got articles back
    expect(Array.isArray(articles)).toBe(true);
    expect(articles.length).toBeGreaterThan(0);
    
    if (articles.length > 0) {
      const firstArticle = articles[0];
      
      // Test basic article properties
      expect(firstArticle.id).toBeDefined();
      expect(typeof firstArticle.id).toBe('string');
      expect(firstArticle.title).toBeDefined();
      expect(typeof firstArticle.title).toBe('string');
      expect(firstArticle.content).toBeDefined();
      expect(firstArticle.source).toBe('reddit');
      expect(firstArticle.sourceUrl).toContain('reddit.com');
      
      // Test tier-related properties
      expect(typeof firstArticle.mass).toBe('number');
      expect(['close', 'medium', 'far'].includes(firstArticle.tier)).toBe(true);
      
      // Log the article for debugging
      console.log('Successfully fetched article:', {
        id: firstArticle.id,
        title: firstArticle.title.substring(0, 50) + (firstArticle.title.length > 50 ? '...' : ''),
        tier: firstArticle.tier,
        mass: firstArticle.mass
      });
    }
  }, 10000); // Increase timeout to 10 seconds for API calls
});
