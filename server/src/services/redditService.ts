import * as dotenv from 'dotenv';
import fetch from 'node-fetch';
import { Article, TierType } from '../types/models/article.type';
import { RedditTokenResponse, RedditPost, RedditPostData } from '../types/services/reddit.type';
import { LocationService } from './locationService';

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

  constructor() {
    this.clientId = process.env.REDDIT_CLIENT_ID || '';
    this.clientSecret = process.env.REDDIT_CLIENT_SECRET || '';
    this.userAgent = 'OrbitalNews/1.0';
    this.locationService = new LocationService();
    
    if (!this.clientId || !this.clientSecret) {
      console.warn('Reddit API credentials not found in environment variables');
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
  async fetchArticles(subreddit: string = 'news', limit: number = 10, timeframe: string = 'day'): Promise<Article[]> {
    // Use mock data if credentials aren't available
    if (!this.clientId || !this.clientSecret) {
      console.log('Using mock Reddit data (no API credentials)');
      return this.getMockArticles();
    }

    try {
      // Get access token
      const token = await this.getAccessToken();
      
      // Fetch posts from Reddit
      const response = await fetch(
        `https://oauth.reddit.com/r/${subreddit}/top.json?limit=${limit}&t=${timeframe}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'User-Agent': this.userAgent
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Reddit API error: ${response.status} ${response.statusText}`);
      }
      
      // Parse response
      const data = await response.json() as RedditPostData;
      
      // Transform Reddit posts into our Article format (with Promise.all to handle async transformations)
      const articlePromises = data.data.children.map(post => 
        this.transformRedditPost(post.data)
      );
      
      const articles = await Promise.all(articlePromises);
      
      // Log a sample article for debugging
      if (articles.length > 0) {
        console.log('Sample article with location:', {
          title: articles[0].title.substring(0, 50) + '...',
          location: articles[0].location,
          tier: articles[0].tier
        });
      }
      
      return articles;
    } catch (error) {
      console.error('Error fetching from Reddit:', error);
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
    
    // Determine tier based on mass
    const tier = this.determineTierFromMass(cappedMass);
    
    // Default location from post flair
    let location = post.link_flair_text || "";
    
    // Create the base article
    const article: Article = {
      id: `reddit-${post.id}`,
      title: post.title,
      content: post.selftext || post.url,
      source: 'reddit',
      sourceUrl: `https://reddit.com${post.permalink}`,
      author: post.author,
      publishedAt: new Date(post.created_utc * 1000).toISOString(),
      location,
      mass: cappedMass,
      tier,
      read: false
    };
    
    // Try to extract location information if not already provided by flair
    if (!location) {
      try {
        // Extract location from title and content
        const locationResult = await this.locationService.extractLocations(article, {
          fetchFullContent: false,  // Don't fetch full content for performance
          minConfidence: 0.4        // Require reasonable confidence
        });
        
        // Set the location if we found one with reasonable confidence
        if (locationResult.primaryLocation && locationResult.primaryLocation.confidence >= 0.4) {
          article.location = locationResult.primaryLocation.name;
        } else {
          article.location = "Global"; // Default if no location found
        }
      } catch (error) {
        console.warn(`Failed to extract location for article ${article.id}: ${error}`);
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
        location: '',  // Will be extracted by LocationService
        mass: 120000,
        tier: 'close' as TierType,
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
        location: '',  // Will be extracted by LocationService
        mass: 180000,
        tier: 'medium' as TierType,
        read: false
      },
      {
        id: 'reddit-mock3',
        title: 'Global Economic Report Shows Surprising Trends in European Markets',
        content: 'The latest economic report reveals unexpected patterns in global markets, particularly in Germany and France...',
        source: 'reddit',
        sourceUrl: 'https://reddit.com/r/economics/mock3',
        author: 'market_analyst',
        publishedAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        location: '',  // Will be extracted by LocationService
        mass: 250000,
        tier: 'far' as TierType,
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
