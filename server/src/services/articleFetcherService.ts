import cron from 'node-cron';
import { NewsService } from './newsService';
import ArticleStore from './articleStore';
import { Article } from '../types/models/article.type';
import { GeocodingService } from './geocodingService';
import MongoManager from '../database/MongoManager';

/**
 * Service for fetching articles on a schedule and storing them in the database
 */
export class ArticleFetcherService {
  private newsService: NewsService;
  private articleStore: ArticleStore;
  private geocodingService: GeocodingService;
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning: boolean = false;
  private fetchCount: number = 0;
  private readonly defaultArticleLimit: number = 30; // Increased from 10 to 30
  private lastFetchTime: Date | null = null;

  constructor() {
    this.newsService = new NewsService();
    this.articleStore = new ArticleStore();
    this.geocodingService = new GeocodingService();
  }

  /**
   * Start the article fetcher service with a cron schedule
   * @param cronSchedule Cron schedule expression (default: every 6 hours)
   */
  public start(cronSchedule: string = '0 */6 * * *'): void {
    if (this.cronJob) {
      console.info('Article fetcher already running, stopping previous job');
      this.stop();
    }

    console.info(`Starting article fetcher with schedule: ${cronSchedule}`);
    
    // Schedule the cron job
    this.cronJob = cron.schedule(cronSchedule, async () => {
      await this.fetchAndStoreArticles();
    });

    // Fetch articles immediately on startup
    this.fetchAndStoreArticles()
      .then(() => console.log('Initial article fetch completed'))
      .catch(err => console.error('Error during initial article fetch:', err));
  }

  /**
   * Stop the article fetcher service
   */
  public stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.info('Article fetcher stopped');
    }
  }

  /**
   * Fetch articles from all sources and store them in the database
   */
  public async fetchAndStoreArticles(): Promise<void> {
    if (this.isRunning) {
      console.debug('Article fetch already in progress, skipping');
      return;
    }

    this.isRunning = true;
    this.fetchCount++;
    this.lastFetchTime = new Date();
    
    try {
      console.info(`Starting article fetch #${this.fetchCount}`);
      
      // Fetch articles from Reddit (real data source)
      const redditArticles = await this.fetchFromSource('reddit');
      console.info(`Fetched ${redditArticles.length} articles from Reddit`);
      
      // Process and geocode the articles
      const processedArticles = await this.processArticles(redditArticles);
      console.info(`Processed ${processedArticles.length} articles with geocoding information`);
      
      // Only store articles from real sources (currently only Reddit)
      const articlesToStore = [...processedArticles];
      
      // Fetch articles from other sources (these are currently mocked)
      // but don't store them in the database
      const twitterArticles = await this.fetchFromSource('twitter', false);
      const washingtonPostArticles = await this.fetchFromSource('washington_post', false);
      
      console.info(`Fetched ${twitterArticles.length} mock Twitter articles and ${washingtonPostArticles.length} mock Washington Post articles`);
      
      // Store articles in the database
      if (articlesToStore.length > 0) {
        const storedCount = await this.articleStore.storeArticles(articlesToStore);
        console.info(`Stored ${storedCount} articles in the database`);
      } else {
        console.info('No articles to store in the database');
      }
      
      console.info('Article fetch completed successfully');
    } catch (error) {
      console.error('Error fetching and storing articles:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Fetch articles from a specific source
   * @param source Source to fetch articles from
   * @param checkForExisting Whether to check if we already have today's articles from this source
   * @returns Array of articles
   */
  private async fetchFromSource(source: string, checkForExisting: boolean = true): Promise<Article[]> {
    try {
      console.log(`Fetching articles from ${source}`);
      
      // Check if we already have today's articles from this source (if requested)
      if (checkForExisting) {
        const hasTodaysArticles = await this.articleStore.hasTodaysArticles(source);
        
        if (hasTodaysArticles) {
          console.log(`Already have today's articles from ${source}, skipping fetch`);
          return [];
        }
      }
      
      let articles: Article[] = [];
      
      // Fetch articles based on source
      switch (source) {
        case 'reddit':
          articles = await this.newsService.fetchFromReddit('news', this.defaultArticleLimit);
          break;
        case 'twitter':
          articles = await this.newsService.fetchFromTwitter();
          break;
        case 'washington_post':
          articles = await this.newsService.fetchFromWashingtonPost();
          break;
        default:
          console.warn(`Unknown source: ${source}`);
      }
      
      console.log(`Fetched ${articles.length} articles from ${source}`);
      return articles;
    } catch (error) {
      console.error(`Error fetching articles from ${source}:`, error);
      return [];
    }
  }

  /**
   * Get the status of the article fetcher service
   * @returns Status information
   */
  public getStatus(): object {
    return {
      isRunning: this.isRunning,
      isScheduled: this.cronJob !== null,
      fetchCount: this.fetchCount,
      lastFetchAt: this.lastFetchTime ? this.lastFetchTime.toISOString() : null,
      nextScheduledFetch: this.cronJob ? this.getNextScheduledRun() : null
    };
  }
  
  /**
   * Calculate the next scheduled run time based on the cron expression
   * @returns Next scheduled run time as ISO string
   */
  private getNextScheduledRun(): string | null {
    if (!this.cronJob) return null;
    
    try {
      // Get the cron expression from the job
      const expression = (this.cronJob as any).options?.cronExpression;
      if (!expression) return null;
      
      // Use cron-parser to get the next run time
      const interval = require('cron-parser').parseExpression(expression);
      return interval.next().toISOString();
    } catch (error) {
      console.error('Error calculating next scheduled run:', error);
      return null;
    }
  }
  
  /**
   * Process articles with geocoding information
   * @param articles Articles to process
   * @returns Processed articles with geocoding information
   */
  private async processArticles(articles: Article[]): Promise<Article[]> {
    const processedArticles: Article[] = [];
    
    for (const article of articles) {
      try {
        // Skip articles without location information
        if (!article.location || typeof article.location === 'string') {
          console.debug(`Skipping article without location information: ${article.id}`);
          continue;
        }
        
        // Skip articles that already have geocoding information
        if (article.location.coordinates) {
          processedArticles.push(article);
          continue;
        }
        
        // Get the city name from the article location
        const cityName = article.location.city;
        if (!cityName) {
          console.debug(`Skipping article without city information: ${article.id}`);
          continue;
        }
        
        // Geocode the location
        console.debug(`Geocoding location: ${cityName}`);
        const geocodedLocation = await this.geocodingService.geocodeLocation(cityName);
        
        if (geocodedLocation) {
          // Update the article with geocoded information
          article.location = {
            ...article.location,
            coordinates: geocodedLocation.coordinates,
            zipCode: geocodedLocation.zipCode || article.location.zipCode,
            state: geocodedLocation.state,
            country: geocodedLocation.country,
            formattedAddress: geocodedLocation.formattedAddress
          };
          
          console.debug(`Successfully geocoded location for article: ${article.id}`);
          processedArticles.push(article);
        } else {
          console.warn(`Failed to geocode location for article: ${article.id}`);
          // Still include the article even without geocoding
          processedArticles.push(article);
        }
      } catch (error) {
        console.error(`Error processing article ${article.id}:`, error);
        // Still include the article even if there was an error
        processedArticles.push(article);
      }
    }
    
    return processedArticles;
  }
}

// Export a singleton instance
export const articleFetcher = new ArticleFetcherService();
export default articleFetcher;
