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
    
    try {
      console.info(`Starting article fetch #${this.fetchCount}`);
      
      // Fetch articles from Reddit (real data source)
      const redditArticles = await this.fetchFromSource('reddit');
      
      // Only store articles from real sources (currently only Reddit)
      // We'll still fetch mock data for display purposes but won't store it
      const articlesToStore = [...redditArticles];
      
      // Fetch articles from other sources (these are currently mocked)
      // but don't store them in the database
      const twitterArticles = await this.fetchFromSource('twitter', false);
      const washingtonPostArticles = await this.fetchFromSource('washington_post', false);
      
      // Combine all articles for display purposes
      const allArticles = [
        ...redditArticles,
        ...twitterArticles,
        ...washingtonPostArticles
      ];
      
      console.info(`Fetched ${allArticles.length} articles (${redditArticles.length} from Reddit, ${twitterArticles.length} from Twitter, ${washingtonPostArticles.length} from Washington Post)`);
      
      // Only store real articles in the database
      if (articlesToStore.length > 0) {
        const storedCount = await this.articleStore.storeArticles(articlesToStore);
        console.info(`Stored ${storedCount} real articles in the database`);
      } else {
        console.info('No real articles to store in the database');
      }
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
      lastFetchAt: this.fetchCount > 0 ? new Date().toISOString() : null
    };
  }
}

// Export a singleton instance
export const articleFetcher = new ArticleFetcherService();
export default articleFetcher;
