import { RedditService } from '../services/redditService';
import { Article, TierType } from '../types/models/article.type';
// Import Jest types
import 'jest';

// This test suite verifies that the RedditService can properly fetch
// and transform Reddit articles using the credentials in the .env file
describe('RedditService', () => {
  let redditService: RedditService;
  
  beforeAll(() => {
    // Create a new instance of RedditService before all tests
    redditService = new RedditService();
  });
  
  it('should fetch articles from Reddit', async () => {
    // Fetch a small number of articles for testing
    const articles = await redditService.fetchArticles('news', 3);
    
    // Verify we got articles back
    expect(Array.isArray(articles)).toBe(true);
    expect(articles.length).toBeGreaterThan(0);
    
    // If we got articles, verify the first one has the expected properties
    if (articles.length > 0) {
      const firstArticle = articles[0];
      
      // Test basic article properties
      expect(firstArticle.id).toBeDefined();
      expect(firstArticle.id.startsWith('reddit-')).toBe(true);
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
  
  it('should determine the correct tier based on mass', async () => {
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
    
    // Log the results for debugging
    console.log('Article tier assignment:', {
      far: { mass: 50000, tier: farTier },
      medium: { mass: 150000, tier: mediumTier },
      close: { mass: 250000, tier: closeTier }
    });
    
    // Also test with the transformRedditPost method to ensure end-to-end functionality
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
    
    console.log('Transformed posts:', {
      lowMass: { mass: resolvedLowMassPost.mass, tier: resolvedLowMassPost.tier },
      highMass: { mass: resolvedHighMassPost.mass, tier: resolvedHighMassPost.tier }
    });
  });
  
  it('should fall back to mock data when API credentials are missing', async () => {
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
    
    // Log the mock article
    console.log('Successfully fetched mock article:', {
      id: firstArticle.id,
      title: firstArticle.title.substring(0, 50) + (firstArticle.title.length > 50 ? '...' : ''),
      tier: firstArticle.tier,
      mass: firstArticle.mass
    });
  });
});
