import cron from 'node-cron';
import { CronExpressionParser } from 'cron-parser';
import { NewsService } from './newsService';
import articleStore from './articleStore';
import { Article } from '../types/models/article.type';
import { GeocodingService } from './geocodingService';

/**
 * Service for fetching articles on a schedule and storing them in the database
 */
export class ArticleFetcherService {
  private newsService: NewsService;
  private articleStore: any;
  private geocodingService: GeocodingService;
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning: boolean = false;
  private fetchCount: number = 0;
  private readonly defaultArticleLimit: number = 50; // Increased from 30 to 50
  private lastFetchTime: Date | null = null;

  constructor() {
    this.newsService = new NewsService();
    this.articleStore = new articleStore();
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
      const redditArticles = await this.fetchFromSource('reddit', true);
      console.info(`Fetched ${redditArticles.length} articles from Reddit`);
      
      // Fetch articles from NewsAPI (real data source)
      const newsAPIArticles = await this.fetchFromSource('newsapi', true);
      console.info(`Fetched ${newsAPIArticles.length} articles from NewsAPI`);
      
      // Process and geocode all real data source articles
      const processedRedditArticles = await this.processArticles(redditArticles);
      const processedNewsAPIArticles = await this.processArticles(newsAPIArticles);
      
      console.info(`Processed ${processedRedditArticles.length + processedNewsAPIArticles.length} articles with geocoding information`);
      
      // Store articles from all real sources
      const articlesToStore = [...processedRedditArticles, ...processedNewsAPIArticles];
      
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
   * @param storeArticles Whether to store the articles in the database
   * @returns Array of articles
   */
  private async fetchFromSource(source: string, storeArticles: boolean = true): Promise<Article[]> {
    try {
      console.log(`Fetching articles from ${source}`);
      
      let articles: Article[] = [];
      
      // Fetch articles based on source
      switch (source) {
        case 'reddit':
          // Use forceFetch=true to ensure we always get fresh articles
          articles = await this.newsService.fetchFromReddit('news', this.defaultArticleLimit, true);
          break;
        case 'newsapi':
          // Use forceFetch=true to ensure we always get fresh articles
          articles = await this.newsService.fetchFromNewsAPI(this.defaultArticleLimit, true);
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
      const interval = CronExpressionParser.parse(expression);
      return interval.next().toISOString();
    } catch (error) {
      console.error('Error calculating next scheduled run:', error);
      return null;
    }
  }
  
  /**
   * Process articles with geocoding information
   * @param articles Articles to process
   * @returns Processed articles with geocoding information (only those with valid coordinates)
   */
  private async processArticles(articles: Article[]): Promise<Article[]> {
    const processedArticles: Article[] = [];
    
    for (const article of articles) {
      try {
        // Extract location information
        let locationName: string | undefined;
        
        // Handle different location formats
        if (typeof article.location === 'string') {
          // If location is a string, use it directly
          locationName = article.location;
        } else if (article.location && typeof article.location === 'object') {
          // Get location name from the location field
          locationName = article.location.location;
          
          // If the article already has valid coordinates, use it directly
          if (article.location.latitude !== undefined && article.location.longitude !== undefined) {
            processedArticles.push(article);
            continue;
          }
        }
        
        // Skip articles without a location name
        if (!locationName) {
          console.debug(`Skipping article without location information: ${article.id}`);
          continue;
        }
        
        // Geocode the location (US locations will be prioritized by the geocoding service)
        console.debug(`Geocoding location: ${locationName}`);
        const geocodedLocation = await this.geocodingService.geocodeLocation(locationName);
        
        // Only include articles with valid geocoding results that have coordinates
        if (geocodedLocation && geocodedLocation.coordinates) {
          // Create a new location object with the required fields
          article.location = {
            location: locationName,
            latitude: geocodedLocation.coordinates.latitude,
            longitude: geocodedLocation.coordinates.longitude,
            zipCode: geocodedLocation.zipCode
          };
          
          // Log if this is a US location that was prioritized
          if (geocodedLocation.isUSLocation) {
            console.debug(`US location prioritized for article: ${article.id}`);
          }
          
          console.debug(`Successfully geocoded location for article: ${article.id}`);
          processedArticles.push(article);
        } else {
          console.warn(`Failed to geocode location for article: ${article.id}, excluding from results`);
          // Do not include articles without valid coordinates
        }
      } catch (error) {
        console.error(`Error processing article ${article.id}:`, error);
        // Do not include articles with errors
      }
    }
    
    console.info(`Processed ${articles.length} articles, kept ${processedArticles.length} with valid coordinates`);
    return processedArticles;
  }
}

// Export a singleton instance
export const articleFetcher = new ArticleFetcherService();
export default articleFetcher;
