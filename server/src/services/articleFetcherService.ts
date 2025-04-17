import cron from 'node-cron';
import { NewsService } from './newsService';
import ArticleStore from './articleStore';
import { Article } from '../types/models/article.type';

/**
 * Service for fetching articles on a schedule and storing them in the database
 */
export class ArticleFetcherService {
  private newsService: NewsService;
  private articleStore: ArticleStore;
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning: boolean = false;
  private fetchCount: number = 0;
  private readonly defaultArticleLimit: number = 30; // Increased from 10 to 30

  constructor() {
    this.newsService = new NewsService();
    this.articleStore = new ArticleStore();
  }

  /**
   * Start the article fetcher service with a cron schedule
   * @param cronSchedule Cron schedule expression (default: every hour)
   */
  public start(cronSchedule: string = '0 * * * *'): void {
    if (this.cronJob) {
      console.log('Article fetcher already running, stopping previous job');
      this.stop();
    }

    console.log(`Starting article fetcher with schedule: ${cronSchedule}`);
    
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
      console.log('Article fetcher stopped');
    }
  }

  /**
   * Fetch articles from all sources and store them in the database
   */
  public async fetchAndStoreArticles(): Promise<void> {
    if (this.isRunning) {
      console.log('Article fetch already in progress, skipping');
      return;
    }

    this.isRunning = true;
    this.fetchCount++;
    
    try {
      console.log(`Starting article fetch #${this.fetchCount} at ${new Date().toISOString()}`);
      
      // Fetch articles from Reddit
      const redditArticles = await this.fetchFromSource('reddit');
      
      // Fetch articles from other sources (these are currently mocked)
      const twitterArticles = await this.fetchFromSource('twitter');
      const washingtonPostArticles = await this.fetchFromSource('washington_post');
      
      // Combine all articles
      const allArticles = [
        ...redditArticles,
        ...twitterArticles,
        ...washingtonPostArticles
      ];
      
      console.log(`Fetched ${allArticles.length} articles in total`);
      
      // Store articles in the database
      const storedCount = await this.articleStore.storeArticles(allArticles);
      console.log(`Stored ${storedCount} articles in the database`);
    } catch (error) {
      console.error('Error fetching and storing articles:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Fetch articles from a specific source
   * @param source Source to fetch articles from
   * @returns Array of articles
   */
  private async fetchFromSource(source: string): Promise<Article[]> {
    try {
      console.log(`Fetching articles from ${source}`);
      
      // Check if we already have today's articles from this source
      const hasTodaysArticles = await this.articleStore.hasTodaysArticles(source);
      
      if (hasTodaysArticles) {
        console.log(`Already have today's articles from ${source}, skipping fetch`);
        return [];
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
      lastFetchAt: this.fetchCount > 0 ? new Date().toISOString() : null
    };
  }
}

// Export a singleton instance
export const articleFetcher = new ArticleFetcherService();
export default articleFetcher;
