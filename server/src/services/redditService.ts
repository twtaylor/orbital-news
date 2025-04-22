import * as dotenv from 'dotenv';
import fetch from 'node-fetch';
import { Article, ArticleLocation, TierType } from '../types/models/article.type';
import { RedditTokenResponse, RedditPost, RedditPostData } from '../types/services/reddit.type';
import { LocationService } from './locationService';
import { ArticleStore } from './articleStore';
import { GeocodingService } from './geocodingService';
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
        // This will trigger a fetch and store in the background
        this.fetchArticles().catch(err => {
          console.error('Error fetching initial Reddit articles:', err);
        });
      } else {
        console.debug('Found Reddit articles for today');
      }
    } catch (error: unknown) {
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
     
      console.info(`Fetched ${allArticles.length} articles from Reddit API`);
      
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

    // Try to extract location information
    try {
      // Extract location from title and content
      // Use a more conservative approach - don't try to fetch full content by default
      // to avoid issues with paywalled sites
      const locationResult = await this.locationService.extractLocations(article, {
        fetchFullContent: false, // Don't fetch full content by default to avoid paywall issues
        minConfidence: 0.4, // Require reasonable confidence
        includeGeoData: true // Ensure geocoding is performed
      });

      console.debug(`Article ${article.id}: Extracted primary location: ${locationResult.primaryLocation?.name || 'None'}`);
      
      // Set the location if we found one with reasonable confidence
      if (locationResult.primaryLocation && locationResult.primaryLocation.confidence >= 0.4) {
        // Check if we have detailed location data (from geocoding)
        if (locationResult.primaryLocation.latitude && locationResult.primaryLocation.longitude) {
          console.debug(`Article ${article.id}: Using geocoded data from LocationService: ${locationResult.primaryLocation.name} (${locationResult.primaryLocation.latitude}, ${locationResult.primaryLocation.longitude}, ${locationResult.primaryLocation.zipCode})`);
          
          // Create structured location object with required zipCode
          const structuredLocation: ArticleLocation = {
            location: locationResult.primaryLocation.name || 'Unknown',
            latitude: locationResult.primaryLocation.latitude,
            longitude: locationResult.primaryLocation.longitude,
            zipCode: locationResult.primaryLocation.zipCode || defaultZipCode
          };
          
          // Set the structured location
          article.location = structuredLocation;
        } else {
          // For simple string locations, we need to create a structured object with zipCode
          // Try to geocode the location name to get a zipCode
          try {
            console.debug(`Article ${article.id}: Attempting to geocode location: ${locationResult.primaryLocation.name}`);
            const geocodedLocation = await this.geocodingService.geocodeLocation(locationResult.primaryLocation.name);
            
            if (geocodedLocation && geocodedLocation.zipCode) {
              console.debug(`Article ${article.id}: Successfully geocoded to: ${geocodedLocation.zipCode} (${geocodedLocation.coordinates.latitude}, ${geocodedLocation.coordinates.longitude})`);
              
              article.location = {
                location: locationResult.primaryLocation.name || 'Unknown',
                latitude: geocodedLocation.coordinates.latitude,
                longitude: geocodedLocation.coordinates.longitude,
                zipCode: geocodedLocation.zipCode
              };
            } else {
              // If geocoding fails, use the default zipCode
              console.debug(`Article ${article.id}: Geocoding failed - no valid result returned`);
              article.location = {
                location: locationResult.primaryLocation.name || 'Unknown',
                latitude: 0,
                longitude: 0,
                zipCode: defaultZipCode
              };
            }
          } catch (error) {
            // If geocoding fails, use the default zipCode
            console.error(`Article ${article.id}: Geocoding error:`, error);
            article.location = {
              location: locationResult.primaryLocation.name || 'Unknown',
              latitude: 0,
              longitude: 0,
              zipCode: defaultZipCode
            };
          }
        }
      } else {
        // If no primary location with good confidence was found, check if the article's location
        // is a US state or major city that we can geocode directly
        const currentLocation = typeof article.location === 'object' ? 
          (article.location as { location: string }).location : 'Unknown';
        
        if (currentLocation && currentLocation !== 'Unknown') {
          try {
            console.debug(`Article ${article.id}: No primary location found, trying to geocode original location: ${currentLocation}`);
            const fallbackGeocode = await this.geocodingService.geocodeLocation(currentLocation);
            
            if (fallbackGeocode && fallbackGeocode.coordinates.latitude && fallbackGeocode.coordinates.longitude) {
              console.debug(`Article ${article.id}: Successfully geocoded original location to: ${fallbackGeocode.zipCode || defaultZipCode} (${fallbackGeocode.coordinates.latitude}, ${fallbackGeocode.coordinates.longitude})`);
              
              article.location = {
                location: currentLocation,
                latitude: fallbackGeocode.coordinates.latitude,
                longitude: fallbackGeocode.coordinates.longitude,
                zipCode: fallbackGeocode.zipCode || defaultZipCode
              };
            }
          } catch (error) {
            console.error(`Article ${article.id}: Fallback geocoding error:`, error);
          }
        }
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
          
          // For full content results, ensure we have a structured location with zipCode
          try {
            const geocodedLocation = await this.geocodingService.geocodeLocation(fullContentResult.primaryLocation.name);
            if (geocodedLocation && geocodedLocation.zipCode) {
              article.location = {
                location: fullContentResult.primaryLocation.name || 'Unknown',
                latitude: geocodedLocation.coordinates.latitude,
                longitude: geocodedLocation.coordinates.longitude,
                zipCode: geocodedLocation.zipCode
              };
            } else {
              // If geocoding fails, use the default zipCode
              article.location = {
                location: fullContentResult.primaryLocation.name || 'Unknown',
                latitude: 0,
                longitude: 0,
                zipCode: defaultZipCode
              };
            }
          } catch (error) {
            // If geocoding fails, use the default zipCode
            article.location = {
              location: fullContentResult.primaryLocation.name || 'Unknown',
              latitude: 0,
              longitude: 0,
              zipCode: defaultZipCode
            };
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to extract location for article ${article.id}: ${error}`);
      // Ensure location is always a structured object with zipCode
      if (typeof article.location === 'string') {
        article.location = {
          location: article.location,
          latitude: 0,
          longitude: 0,
          zipCode: defaultZipCode
        };
      }
    }
    
    // Final check to ensure location is always a structured object with zipCode
    if (typeof article.location === 'string') {
      article.location = {
        location: article.location,
        latitude: 0, // Default coordinates since we couldn't extract any
        longitude: 0, // Default coordinates since we couldn't extract any
        zipCode: defaultZipCode
      };
    }
    
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
