import { RedditService } from '../../services/redditService';
import { Article, TierType } from '../../types/models/article.type';
import * as dotenv from 'dotenv';
import 'jest';

// Ensure environment variables are loaded
dotenv.config();

/**
 * Combined Jest test for the RedditService
 * This test suite verifies that the RedditService can properly fetch
 * and transform Reddit articles using the credentials in the .env file
 */
describe('RedditService', () => {
  let redditService: RedditService;
  
  beforeAll(() => {
    // Create a new instance of RedditService before all tests
    redditService = new RedditService();
  });
  
  // Basic functionality test
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
      expect(firstArticle.source).toBe('reddit');
      
      // Test tier-related properties
      expect(typeof firstArticle.mass).toBe('number');
      expect(['close', 'medium', 'far'].includes(firstArticle.tier)).toBe(true);
    }
  }, 10000); // Increase timeout to 10 seconds for API calls
  
  // Test for tier determination based on mass
  test('should determine the correct tier based on mass', async () => {
    // Directly test the determineTierFromMass method by accessing it through the private method
    // We need to use type assertion to access private methods
    const determineTierFromMass = (mass: number): TierType => {
      return (redditService as any)['determineTierFromMass'](mass);
    };
    
    // Test with values that should correspond to each tier based on the implementation
    // From RedditService: if (mass > 200000) -> 'close', else if (mass > 100000) -> 'medium', else -> 'far'
    const farTier = determineTierFromMass(50000);    // Below 100000 -> 'far'
    const mediumTier = determineTierFromMass(150000); // Between 100000 and 200000 -> 'medium'
    const closeTier = determineTierFromMass(250000);  // Above 200000 -> 'close'
    
    // Verify the tiers are assigned correctly based on mass thresholds
    expect(farTier).toBe('far');
    expect(mediumTier).toBe('medium');
    expect(closeTier).toBe('close');
  });
  
  // Test for article transformation
  test('should transform Reddit posts into articles with correct mass and tier', async () => {
    // Test with the transformRedditPost method to ensure end-to-end functionality
    const lowMassPost = redditService['transformRedditPost']({
      id: 'low-mass',
      title: 'Low Mass Article',
      url: 'https://example.com',
      author: 'test-author',
      created_utc: Date.now() / 1000,
      permalink: '/r/test/comments/123/test/',
      score: 50,
      num_comments: 5,
      total_awards_received: 0
    });
    
    const highMassPost = redditService['transformRedditPost']({
      id: 'high-mass',
      title: 'High Mass Article',
      url: 'https://example.com',
      author: 'test-author',
      created_utc: Date.now() / 1000,
      permalink: '/r/test/comments/123/test/',
      score: 20000,
      num_comments: 200,
      total_awards_received: 0
    });
    
    // Check the mass calculation and tier assignment in the transformed posts
    const resolvedLowMassPost = await lowMassPost;
    const resolvedHighMassPost = await highMassPost;
    
    // Verify low mass post has appropriate mass and tier
    expect(resolvedLowMassPost.mass).toBeLessThan(100000); // Should be below medium threshold
    expect(resolvedLowMassPost.tier).toBe('far');
    
    // Verify high mass post has appropriate mass and tier
    expect(resolvedHighMassPost.mass).toBeGreaterThan(200000); // Should be above close threshold
    expect(resolvedHighMassPost.tier).toBe('close');
  });
  
  // Test for fallback to mock data
  test('should fall back to mock data when API credentials are missing', async () => {
    // Create a new instance with empty credentials to force mock data
    const mockRedditService = new RedditService();
    
    // Override the credentials to force mock data
    Object.defineProperty(mockRedditService, 'clientId', { value: undefined });
    Object.defineProperty(mockRedditService, 'clientSecret', { value: undefined });
    
    // Fetch articles (should return mock data)
    const articles = await mockRedditService.fetchArticles();
    
    // Verify we got mock articles
    expect(Array.isArray(articles)).toBe(true);
    expect(articles.length).toBeGreaterThan(0);
    
    // Verify the first article has the expected mock properties
    const firstArticle = articles[0];
    expect(firstArticle.id).toContain('mock');
  });
});
