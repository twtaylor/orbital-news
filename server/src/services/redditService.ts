import * as dotenv from 'dotenv';
import fetch from 'node-fetch';
import { Article, TierType } from '../types/models/article.type';
import { RedditTokenResponse, RedditPost, RedditPostData } from '../types/services/reddit.type';
import { LocationService } from './locationService';
import { ArticleStore } from './articleStore';
import MongoManager from '../database/MongoManager';

// Load environment variables
dotenv.config();

/**
 * Service for fetching articles from Reddit
 */
export class RedditService {
  private clientId: string;
  private clientSecret: string;
  private userAgent: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private locationService: LocationService;
  private articleStore: ArticleStore;

  constructor() {
    this.clientId = process.env.REDDIT_CLIENT_ID || '';
    this.clientSecret = process.env.REDDIT_CLIENT_SECRET || '';
    this.userAgent = 'OrbitalNews/1.0';
    this.locationService = new LocationService();
    this.articleStore = new ArticleStore();
    
    if (!this.clientId || !this.clientSecret) {
      console.warn('Reddit API credentials not found in environment variables');
    }
    
    // Initialize and check for today's articles
    this.checkForTodaysArticles();
  }
  
  /**
   * Check if we have today's articles and fetch them if needed
   */
  private async checkForTodaysArticles(): Promise<void> {
    try {
      // Check if we need to load initial data
      const hasToday = await this.articleStore.hasTodaysArticles('reddit');
      
      if (!hasToday) {
        console.log('No Reddit articles for today, fetching from API...');
        // This will trigger a fetch and store in the background
        this.fetchArticles().catch(err => {
          console.error('Error fetching initial Reddit articles:', err);
        });
      } else {
        console.log('Found Reddit articles for today');
      }
    } catch (error) {
      console.error('Error checking for today\'s articles:', error);
    }
  }

  /**
   * Get an OAuth access token for the Reddit API
   * @returns Access token
   */
  private async getAccessToken(): Promise<string> {
    // Return existing token if it's still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }
    
    // If credentials are missing, throw error
    if (!this.clientId || !this.clientSecret) {
      console.warn('Reddit API credentials not found');
      throw new Error('Reddit API credentials not found');
    }

    try {
      // Create auth string for Basic Auth
      const authString = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      // Make request to Reddit API
      const response = await fetch('https://www.reddit.com/api/v1/access_token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': this.userAgent
        },
        body: 'grant_type=client_credentials'
      });
      
      if (!response.ok) {
        throw new Error(`Reddit API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json() as RedditTokenResponse;
      
      // Store token and expiry
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000);
      
      return this.accessToken || '';
    } catch (error) {
      console.error('Error getting Reddit access token:', error);
      throw error;
    }
  }

  /**
   * Fetch articles from Reddit
   * @param subreddit Subreddit to fetch from (default: 'news')
   * @param limit Number of articles to fetch (default: 10)
   * @param timeframe Time frame for posts (default: 'day')
   * @returns Promise with array of articles
   */
  async fetchArticles(subreddit: string | string[] = 'news', limit: number = 10, timeframe: string = 'day', useStore: boolean = true): Promise<Article[]> {
    // Try to get stored articles first if requested and MongoDB is connected
    if (useStore && MongoManager.isConnected()) {
      try {
        const storedArticles = await this.articleStore.getArticles({
          source: 'reddit',
          limit: limit,
          daysBack: timeframe === 'day' ? 1 : (timeframe === 'week' ? 7 : 30)
        });
        
        if (storedArticles.length > 0) {
          console.log(`Using ${storedArticles.length} stored Reddit articles`);
          return storedArticles;
        }
      } catch (error) {
        console.warn('Error retrieving stored articles:', error);
        // Continue with API fetch if store retrieval fails
      }
    }
    
    // Use mock data if credentials aren't available
    if (!this.clientId || !this.clientSecret) {
      console.log('Using mock Reddit data (no API credentials)');
      const mockArticles = await this.getMockArticles();
      
      // Store mock articles if MongoDB is connected
      if (MongoManager.isConnected()) {
        await this.articleStore.storeArticles(mockArticles);
      }
      
      return mockArticles;
    }

    try {
      // Get access token
      const token = await this.getAccessToken();
      
      let allArticles: Article[] = [];
      const subredditsToFetch = Array.isArray(subreddit) ? subreddit : [subreddit];

      // Create fetch promises for each subreddit
      const fetchPromises = subredditsToFetch.map(async (sub) => {
        try {
          const response = await fetch(
            `https://oauth.reddit.com/r/${sub}/top.json?limit=${limit}&t=${timeframe}`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'User-Agent': this.userAgent
              }
            }
          );

          if (!response.ok) {
            console.warn(`Reddit API error for ${sub}: ${response.status} ${response.statusText}`);
            return []; // Return empty array for this failed subreddit fetch
          }

          const data = await response.json() as RedditPostData;
          const articlePromises = data.data.children.map(post => 
            this.transformRedditPost(post.data)
          );
          return await Promise.all(articlePromises);
        } catch (err) {
          console.warn(`Failed to fetch or process articles from ${sub}:`, err);
          return []; // Return empty array on error for this subreddit
        }
      });

      // Execute all fetch promises concurrently
      const results = await Promise.all(fetchPromises);
      
      // Flatten the results into a single array of articles
      allArticles = results.flat();
     
      // Log a sample article for debugging, but only when not in a test environment
      if (allArticles.length > 0 && process.env.NODE_ENV !== 'test') {
        console.log('Sample article with location:', {
          title: allArticles[0].title.substring(0, 50) + '...',
          location: allArticles[0].location,
          tier: allArticles[0].tier
        });
      }
      
      // Store the fetched articles if MongoDB is connected
      if (MongoManager.isConnected()) {
        await this.articleStore.storeArticles(allArticles);
      }
      
      return allArticles;
    } catch (error) {
      console.error('Error fetching from Reddit:', error);
      
      // Fall back to mock data on error
      const mockArticles = await this.getMockArticles();
      
      // Store mock articles if MongoDB is connected
      if (MongoManager.isConnected()) {
        await this.articleStore.storeArticles(mockArticles);
      }
      
      return mockArticles;
    }
  }

  /**
   * Transform a Reddit post into our Article format
   * @param post Reddit post data
   * @returns Article object
   */
  private async transformRedditPost(post: RedditPost): Promise<Article> {
    // Calculate a "mass" based on score and number of comments
    const mass = (post.score + (post.num_comments * 2)) * 1000;
    const cappedMass = Math.max(10000, Math.min(500000, mass)); // Limit mass between 10k and 500k
    
    // Determine initial tier based on mass (will be overridden by location-based tier if available)
    const massTier = this.determineTierFromMass(cappedMass);
    
    // Default location from post flair
    let location = post.link_flair_text || "";
    
    // Create the base article with mass-based tier as fallback
    const article: Article = {
      id: `reddit-${post.id}`,
      title: post.title,
      // Only include content if it exists
      ...(post.selftext ? { content: post.selftext } : {}),
      source: 'reddit',
      sourceUrl: post.url,
      author: post.author,
      publishedAt: new Date(post.created_utc * 1000).toISOString(),
      location,
      mass: cappedMass,
      tier: massTier, // Will be updated if location-based tier is available
      read: false
    };
    
    // Try to extract location information and determine location-based tier
    try {
      // Extract location from title and content
      // Use a more conservative approach - don't try to fetch full content by default
      // to avoid issues with paywalled sites
      const locationResult = await this.locationService.extractLocations(article, {
        fetchFullContent: false,  // Don't fetch full content by default to avoid paywall issues
        minConfidence: 0.4        // Require reasonable confidence
      });
      
      // Set the location if we found one with reasonable confidence
      if (locationResult.primaryLocation && locationResult.primaryLocation.confidence >= 0.4) {
        article.location = locationResult.primaryLocation.name;
      } else if (!location) { // Only set to Global if we don't already have a location from flair
        article.location = "Global"; // Default if no location found
      }
      
      // IMPORTANT: Override the mass-based tier with the location-based tier if available
      if (locationResult.tier && (locationResult.tier === 'close' || locationResult.tier === 'medium' || locationResult.tier === 'far')) {
        article.tier = locationResult.tier as TierType;
      }
      
      // If we didn't get a good location from the title/content and the article is from a news source,
      // try to fetch full content only for non-paywalled sites
      if ((!locationResult.primaryLocation || locationResult.primaryLocation.confidence < 0.4) && 
          post.url && post.url.includes('reddit.com') === false) {
        
        // Try again with full content fetch for non-Reddit URLs that might have more location info
        const fullContentResult = await this.locationService.extractLocations(article, {
          fetchFullContent: true,  // Now try with full content
          minConfidence: 0.4
        });
        
        if (fullContentResult.primaryLocation && 
            fullContentResult.primaryLocation.confidence >= 0.4 && 
            (!locationResult.primaryLocation || 
             fullContentResult.primaryLocation.confidence > locationResult.primaryLocation.confidence)) {
          
          article.location = fullContentResult.primaryLocation.name;
          
          // Update tier if available
          if (fullContentResult.tier && 
              (fullContentResult.tier === 'close' || 
               fullContentResult.tier === 'medium' || 
               fullContentResult.tier === 'far')) {
            article.tier = fullContentResult.tier as TierType;
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to extract location for article ${article.id}: ${error}`);
      if (!location) { // Only set to Global if we don't already have a location from flair
        article.location = "Global"; // Default on error
      }
    }
    
    return article;
  }

  /**
   * Get mock Reddit articles for testing or when API is unavailable
   * @returns Array of mock articles
   */
  private async getMockArticles(): Promise<Article[]> {
    const mockArticles: Article[] = [
      {
        id: 'reddit-mock1',
        title: 'Breaking News: Major Scientific Discovery at MIT',
        content: 'Scientists at MIT in Cambridge, Massachusetts have made a groundbreaking discovery that could change our understanding of the universe...',
        source: 'reddit',
        sourceUrl: 'https://reddit.com/r/science/mock1',
        author: 'science_enthusiast',
        publishedAt: new Date().toISOString(),
        location: '',  // Will be extracted as 'Cambridge, Massachusetts' (far from Oklahoma City)
        mass: 120000,
        tier: 'far' as TierType, // Initial tier, will be updated based on location distance
        read: false
      },
      {
        id: 'reddit-mock2',
        title: 'New Technology Breakthrough Announced by Silicon Valley Startup',
        content: 'A major tech company in San Francisco, California has announced a revolutionary new product...',
        source: 'reddit',
        sourceUrl: 'https://reddit.com/r/technology/mock2',
        author: 'tech_news',
        publishedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        location: '',  // Will be extracted as 'San Francisco, California' (far from Oklahoma City)
        mass: 180000,
        tier: 'far' as TierType, // Initial tier, will be updated based on location distance
        read: false
      },
      {
        id: 'reddit-mock3',
        title: 'Dallas City Council Approves New Urban Development Plan',
        content: 'The Dallas City Council has approved a comprehensive urban development plan that will transform the downtown area with new parks and infrastructure...',
        source: 'reddit',
        sourceUrl: 'https://reddit.com/r/localnews/mock3',
        author: 'texas_reporter',
        publishedAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        location: '',  // Will be extracted as 'Dallas, Texas' (close to Oklahoma City)
        mass: 90000,
        tier: 'close' as TierType, // Initial tier, will be updated based on location distance
        read: false
      }
    ];
    
    // Extract locations for mock articles
    const articlesWithLocations = await Promise.all(
      mockArticles.map(async (article) => {
        try {
          const locationResult = await this.locationService.extractLocations(article, {
            fetchFullContent: false
          });
          
          if (locationResult.primaryLocation) {
            article.location = locationResult.primaryLocation.name;
          } else {
            article.location = "Global"; // Default if no location found
          }
        } catch (error) {
          console.warn(`Failed to extract location for mock article ${article.id}`);
          article.location = "Global"; // Default on error
        }
        return article;
      })
    );
    
    return articlesWithLocations;
  }
  
  /**
   * Determine tier based on article mass
   * @param mass Article mass
   * @returns Tier type (close, medium, far)
   */
  private determineTierFromMass(mass: number): TierType {
    if (mass > 200000) {
      return 'close';
    } else if (mass > 100000) {
      return 'medium';
    } else {
      return 'far';
    }
  }
}
