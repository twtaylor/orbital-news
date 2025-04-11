import { RedditService } from '../../services/redditService';
import { LocationService } from '../../services/locationService';
import { Article, TierType } from '../../types/models/article.type';
// Import Jest types
import 'jest';

// Mock the LocationService to avoid real API calls
jest.mock('../../services/locationService', () => {
  return {
    LocationService: jest.fn().mockImplementation(() => {
      return {
        extractLocations: jest.fn().mockResolvedValue({
          primaryLocation: { name: 'Test Location', confidence: 0.8 },
          allLocations: [{ name: 'Test Location', confidence: 0.8 }],
          analyzedText: 'Test content',
          textLength: 12,
          processingTimeMs: 5,
          tier: 'medium'
        })
      };
    })
  };
});

// This test suite verifies that the RedditService can properly fetch
// and transform Reddit articles using the credentials in the .env file
// Set longer timeout for all tests in this suite due to API calls
jest.setTimeout(30000);

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
  
  // Access the private determineTierFromMass method using type assertion
  const determineTierFromMass = (mass: number): TierType => {
    return (redditService as any).determineTierFromMass(mass);
  };
  
  it('should correctly determine tier from mass', () => {
    // Test with values that should correspond to each tier based on the implementation
    // From RedditService: if (mass > 200000) -> 'close', else if (mass > 100000) -> 'medium', else -> 'far'
    const farTier = determineTierFromMass(50000);    // Below 100000 -> 'far'
    const mediumTier = determineTierFromMass(150000); // Between 100000 and 200000 -> 'medium'
    const closeTier = determineTierFromMass(250000);  // Above 200000 -> 'close'
    
    // Verify the tiers are assigned correctly
    expect(farTier).toBe('far');
    expect(mediumTier).toBe('medium');
    expect(closeTier).toBe('close');
    
    // Log the results for debugging
    console.log('Article tier assignment:', {
      far: { mass: 50000, tier: farTier },
      medium: { mass: 150000, tier: mediumTier },
      close: { mass: 250000, tier: closeTier }
    });
  });
  
  it('should transform Reddit posts into articles', async () => {
    // Create mock Reddit post data
    const lowMassPost = {
      id: 'test1',
      title: 'Test Post 1',
      selftext: 'Test content 1',
      url: 'https://reddit.com/r/test/test1',
      author: 'testuser1',
      created_utc: Date.now() / 1000,
      permalink: '/r/test/comments/test1',
      score: 50,
      num_comments: 5,
      total_awards_received: 0
    };
    
    const highMassPost = {
      id: 'test2',
      title: 'Test Post 2',
      selftext: 'Test content 2',
      url: 'https://reddit.com/r/test/test2',
      author: 'testuser2',
      created_utc: Date.now() / 1000,
      permalink: '/r/test/comments/test2',
      score: 400,
      num_comments: 50,
      total_awards_received: 5
    };
    
    // Mock the locationService to return a fixed location without API calls
    (redditService as any).locationService = {
      extractLocations: jest.fn().mockResolvedValue({
        primaryLocation: { name: 'Test Location', confidence: 0.8 },
        allLocations: [{ name: 'Test Location', confidence: 0.8 }],
        analyzedText: 'Test content',
        textLength: 12,
        processingTimeMs: 5,
        tier: 'medium'
      })
    };
    
    // Transform the posts using the private method (now async)
    const lowMassArticle = await (redditService as any).transformRedditPost(lowMassPost);
    const highMassArticle = await (redditService as any).transformRedditPost(highMassPost);
    
    // Verify the transformation
    expect(lowMassArticle.id).toBe('reddit-test1');
    expect(lowMassArticle.title).toBe('Test Post 1');
    expect(lowMassArticle.content).toBe('Test content 1');
    expect(lowMassArticle.source).toBe('reddit');
    // We now expect 'medium' tier because our mock LocationService returns 'medium' tier
    // regardless of the mass-based tier calculation
    expect(lowMassArticle.tier).toBe('medium'); // Location-based tier overrides mass-based tier
    
    expect(highMassArticle.id).toBe('reddit-test2');
    expect(highMassArticle.title).toBe('Test Post 2');
    expect(highMassArticle.content).toBe('Test content 2');
    expect(highMassArticle.source).toBe('reddit');
    // We now expect 'medium' tier because our mock LocationService returns 'medium' tier
    // regardless of the mass-based tier calculation
    expect(highMassArticle.tier).toBe('medium'); // Location-based tier overrides mass-based tier
    
    // Log the results for debugging
    console.log('Transformed posts:', {
      lowMass: { mass: lowMassArticle.mass as number, tier: lowMassArticle.tier as TierType },
      highMass: { mass: highMassArticle.mass as number, tier: highMassArticle.tier as TierType }
    });
  });
  
  it('should provide mock articles when credentials are missing', async () => {
    // Create a new instance with empty credentials
    const mockRedditService = new RedditService();
    
    // Override the credentials to force using mock data
    (mockRedditService as any).clientId = '';
    (mockRedditService as any).clientSecret = '';
    
    // Mock the locationService to return a fixed location without API calls
    (mockRedditService as any).locationService = {
      extractLocations: jest.fn().mockResolvedValue({
        primaryLocation: { name: 'Test Location', confidence: 0.8 },
        allLocations: [{ name: 'Test Location', confidence: 0.8 }],
        analyzedText: 'Test content',
        textLength: 12,
        processingTimeMs: 5,
        tier: 'medium'
      })
    };
    
    // Fetch articles (should return mock data)
    const articles = await mockRedditService.fetchArticles();
    
    // Verify we got mock articles
    expect(Array.isArray(articles)).toBe(true);
    expect(articles.length).toBeGreaterThan(0);
    
    // Check the first mock article
    const mockArticle = articles[0];
    expect(mockArticle.id).toContain('mock');
    
    // Verify location was extracted (will be 'Test Location' from our mock)
    expect(mockArticle.location).toBeDefined();
    
    // Log the mock article for debugging
    console.log('Successfully fetched mock article:', {
      id: mockArticle.id,
      title: mockArticle.title,
      tier: mockArticle.tier as TierType,
      mass: mockArticle.mass as number,
      location: mockArticle.location
    });
  });
});
