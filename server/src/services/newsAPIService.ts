import * as dotenv from 'dotenv';
import fetch from 'node-fetch';
import { Article } from '../types/models/article.type';
import { NewsAPIArticle, NewsAPIResponse } from '../types/services/newsapi.type';
import { LocationService } from './locationService';
import { ArticleStore } from './articleStore';
import { GeocodingService } from './geocodingService';
import MongoManager from '../database/MongoManager';
import { geocodeArticleLocation } from '../utils/locationUtils';

/**
 * Service for fetching articles from NewsAPI
 */
export class NewsAPIService {
  private apiKey: string;
  private locationService: LocationService;
  private articleStore: ArticleStore;
  private geocodingService: GeocodingService;
  
  constructor() {
    dotenv.config();
    this.apiKey = process.env.NEWSAPI_API_KEY || '';
    this.locationService = new LocationService();
    this.articleStore = new ArticleStore();
    this.geocodingService = new GeocodingService();
    
    if (!this.apiKey) {
      console.warn('NewsAPI API key not found in environment variables');
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
      const todayCount = await this.articleStore.getTodaysArticleCount('newsapi');
      
      if (todayCount > 0) {
        console.debug(`Found ${todayCount} NewsAPI articles for today, will still check for new ones`);
      }
      
      // Always fetch articles to get the latest ones with forceFetch=true
      // This ensures we bypass the stored articles check and get fresh data
      // The articleStore will handle duplicates
      this.fetchArticles(50, true).catch(err => {
        console.error('Error fetching NewsAPI articles:', err);
      });
    } catch (error: unknown) {
      console.error('Error checking for articles:', error);
    }
  }
  
  /**
   * Fetch articles from NewsAPI
   * @param limit Number of articles to fetch (default: 50)
   * @param forceFetch Whether to force fetching from API even if stored articles exist (default: false)
   * @returns Promise with array of articles
   */
  async fetchArticles(limit: number = 50, forceFetch: boolean = false): Promise<Article[]> {
    // Try to get stored articles first if requested and MongoDB is connected
    // Skip this check if forceFetch is true
    if (!forceFetch && MongoManager.isConnected()) {
      try {
        const storedArticles = await this.articleStore.getArticles({
          source: 'newsapi',
          limit: limit,
          daysBack: 1
        });
        
        if (storedArticles.length > 0) {
          return storedArticles;
        }
      } catch (error) {
        // Continue with API fetch if store retrieval fails
      }
    }

    try {
      if (!this.apiKey) {
        console.error('NewsAPI API key is not set');
        return [];
      }

      console.info(`Fetching articles from NewsAPI...`);
      
      // Fetch top headlines from the US
      const response = await fetch(
        `https://newsapi.org/v2/top-headlines?country=us&pageSize=${limit}`,
        {
          method: 'GET',
          headers: {
            'X-Api-Key': this.apiKey
          }
        }
      );

      if (!response.ok) {
        console.error(`NewsAPI error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json() as NewsAPIResponse;
      
      if (data.status !== 'ok') {
        console.error(`NewsAPI returned error: ${data.code} - ${data.message}`);
        return [];
      }
      
      // Debug log the raw articles from NewsAPI
      console.log(`NewsAPI raw response has ${data.articles.length} articles`);
      
      // Transform NewsAPI articles to our Article format
      const articles = await Promise.all(
        data.articles.map(article => this.transformNewsAPIArticle(article))
      );
      
      // Debug log the transformed articles
      console.log(`After transformation, we have ${articles.length} articles`);
      
      // Only log if not in a test environment
      const isTestEnvironment = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID;
      if (!isTestEnvironment) {
        console.info(`Fetched ${articles.length} articles from NewsAPI`);
      }
      
      // Store the fetched articles if MongoDB is connected
      if (MongoManager.isConnected()) {
        await this.articleStore.storeArticles(articles);
      }
      
      return articles;
    } catch (error) {
      console.error('Error fetching articles from NewsAPI:', error);
      return [];
    }
  }
  
  /**
   * Transform a NewsAPI article into our Article format
   * @param article NewsAPI article
   * @returns Article object
   */
  private async transformNewsAPIArticle(article: NewsAPIArticle): Promise<Article> {
    try {
      // Debug log for each article being transformed
      console.log(`Transforming article: ${article.title.substring(0, 30)}...`);
      // Create a unique ID for the article
      const articleId = `newsapi-${Buffer.from(article.url).toString('base64').substring(0, 40)}`;
      
      // Create a temporary article object to pass to geocodeArticleLocation
      const tempArticle = {
        id: articleId,
        title: article.title,
        content: article.description || '',
        sourceUrl: article.url,
        source: 'newsapi',
        author: article.author || article.source.name,
        publishedAt: article.publishedAt
      } as Article;
      
      // Use the helper function to geocode the article location
      const isTestEnvironment = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID;
      const geocodedArticle = await geocodeArticleLocation(tempArticle, this.locationService, this.geocodingService, {
        fetchFullContent: true,
        minConfidence: 0.3,
        isTestEnvironment,
        defaultZipCode: '00000'
      });
      
      // Calculate article mass based on content length and other factors
      const contentLength = (article.content?.length || 0) + 
                           (article.description?.length || 0) + 
                           article.title.length;
      
      // Base mass calculation - can be adjusted based on source importance
      let mass = contentLength * 100;
      
      // Add mass for articles with images
      if (article.urlToImage) {
        mass += 10000;
      }
      
      // Add mass for articles from major sources
      if (article.source.name.includes('CNN') || 
          article.source.name.includes('BBC') || 
          article.source.name.includes('New York Times')) {
        mass += 20000;
      }
      
      const transformedArticle = {
        id: articleId,
        title: article.title,
        content: article.content || article.description || '',
        source: 'newsapi',
        sourceUrl: article.url,
        author: article.author || article.source.name,
        publishedAt: article.publishedAt,
        location: geocodedArticle.location,
        tags: [], // NewsAPI doesn't provide tags
        mass: mass
      };
      
      // Debug log the location data
      console.log(`Article ${articleId} location: ${JSON.stringify(geocodedArticle.location)}`);
      
      return transformedArticle;
    } catch (error) {
      console.error('Error transforming NewsAPI article:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const newsAPIService = new NewsAPIService();
export default newsAPIService;
