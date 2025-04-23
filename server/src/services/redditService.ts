import * as dotenv from 'dotenv';
import fetch from 'node-fetch';
import { Article, TierType } from '../types/models/article.type';
import { RedditTokenResponse, RedditPost, RedditPostData } from '../types/services/reddit.type';
import { LocationService } from './locationService';
import { ArticleStore } from './articleStore';
import { GeocodingService } from './geocodingService';
import { geocodeArticleLocation } from '../utils/locationUtils';
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
  private geocodingService: GeocodingService;

  constructor() {
    this.clientId = process.env.REDDIT_CLIENT_ID || '';
    this.clientSecret = process.env.REDDIT_CLIENT_SECRET || '';
    this.userAgent = 'OrbitalNews/1.0';
    this.locationService = new LocationService();
    this.articleStore = new ArticleStore();
    this.geocodingService = new GeocodingService();
    
    if (!this.clientId || !this.clientSecret) {
      console.warn('Reddit API credentials not found in environment variables');
    }
    
    // Initialize and check for today's articles, but only if not in a test environment
    const isTestEnvironment = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID;
    if (!isTestEnvironment) {
      this.checkForTodaysArticles();
    }
  }
  
  /**
   * Check for articles and fetch them regardless of whether we have today's articles
   * This allows the service to fetch new articles every hour
   */
  private async checkForTodaysArticles(): Promise<void> {
    try {
      // Get count of today's articles for logging purposes
      const todayCount = await this.articleStore.getTodaysArticleCount('reddit');
      
      if (todayCount > 0) {
        console.debug(`Found ${todayCount} Reddit articles for today, will still check for new ones`);
      }
      
      // Always fetch articles to get the latest ones with forceFetch=true
      // This ensures we bypass the stored articles check and get fresh data
      // The articleStore will handle duplicates
      this.fetchArticles('news', 30, 'day', true, true).catch(err => {
        console.error('Error fetching Reddit articles:', err);
      });
    } catch (error: unknown) {
      console.error('Error checking for articles:', error);
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
   * @param useStore Whether to try to get stored articles first (default: true)
   * @param forceFetch Whether to force fetching from API even if stored articles exist (default: false)
   * @returns Promise with array of articles
   */
  async fetchArticles(subreddit: string | string[] = 'news', limit: number = 10, timeframe: string = 'day', useStore: boolean = true, forceFetch: boolean = false): Promise<Article[]> {
    // Try to get stored articles first if requested and MongoDB is connected
    // Skip this check if forceFetch is true
    if (useStore && !forceFetch && MongoManager.isConnected()) {
      try {
        const storedArticles = await this.articleStore.getArticles({
          source: 'reddit',
          limit: limit,
          daysBack: timeframe === 'day' ? 1 : (timeframe === 'week' ? 7 : 30)
        });
        
        if (storedArticles.length > 0) {
          return storedArticles;
        }
      } catch (error) {
        // Continue with API fetch if store retrieval fails
      }
    }

    try {
      console.info(`Fetching articles from Reddit API...`);
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
            console.warn(`Reddit API error for r/${sub}: ${response.status} ${response.statusText}`);
            return []; // Return empty array for this failed subreddit fetch
          }

          const data = await response.json() as RedditPostData;
          const articlePromises = data.data.children.map(post => 
            this.transformRedditPost(post.data)
          );
          return await Promise.all(articlePromises);
        } catch (err) {
          console.warn(`Failed to fetch or process articles from r/${sub}:`, err);
          return []; // Return empty array on error for this subreddit
        }
      });

      // Execute all fetch promises concurrently
      const results = await Promise.all(fetchPromises);
      
      // Flatten the results into a single array of articles
      allArticles = results.flat();
      
      // Only log if not in a test environment
      const isTestEnvironment = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID;
      if (!isTestEnvironment) {
        console.info(`Fetched ${allArticles.length} articles from Reddit API`);
      }
      
      // Store the fetched articles if MongoDB is connected
      if (MongoManager.isConnected()) {
        await this.articleStore.storeArticles(allArticles);
      }
      
      return allArticles;
    } catch (error) {
      console.error('Error fetching from Reddit:', error);
      
      // Return empty array if there's an error fetching from Reddit
      console.warn('No articles will be returned due to the error');
      return [];
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
    
    // Default location from post flair
    const location = post.link_flair_text || '';

    // Create a default zipCode for string-based locations
    // We'll use a default zipCode for the article when we don't have a specific one
    const defaultZipCode = '00000';

    // Create the base article with a default location
    const article: Article = {
      id: `reddit-${post.id}`,
      title: post.title,
      // Only include content if it exists
      ...(post.selftext ? { content: post.selftext } : {}),
      source: 'reddit',
      sourceUrl: post.url,
      author: post.author,
      publishedAt: new Date(post.created_utc * 1000).toISOString(),
      // Initialize with a default location that includes mandatory fields
      // This will be replaced with actual geocoded data later if available
      location: {
        location: location || 'Unknown',
        latitude: 0,  // Default coordinates (will be replaced if geocoding succeeds)
        longitude: 0, // Default coordinates (will be replaced if geocoding succeeds)
        zipCode: defaultZipCode
      },
      mass: cappedMass
    };

    // Use the helper function to geocode the article location
    const isTestEnvironment = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID;
    
    const geocodedArticle = await geocodeArticleLocation(article, this.locationService, this.geocodingService, {
      fetchFullContent: post.url ? !post.url.includes('reddit.com') : false,
      minConfidence: 0.3,
      isTestEnvironment,
      defaultZipCode: '00000'
    });
    
    // Update the article with the geocoded location
    article.location = geocodedArticle.location;
    
    return article;
  }

  /**
   * Handle case when Reddit API credentials are not available
   * @returns Empty array of articles
   */
  private async handleMissingCredentials(): Promise<Article[]> {
    console.warn('Reddit API credentials not found. No articles will be fetched from Reddit.');
    return [];
  }
  
  /**
   * Determine tier based on article mass
   * This is used for dynamic tier calculation, not for storage
   * @param mass Article mass
   * @returns Tier type (close, medium, far)
   */
  determineTierFromMass(mass: number): TierType {
    if (mass > 200000) {
      return 'close';
    } else if (mass > 100000) {
      return 'medium';
    } else {
      return 'far';
    }
  }
}
