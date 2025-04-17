import { ArticleFetcherService } from '../../services/articleFetcherService';
import { NewsService } from '../../services/newsService';
import ArticleStore from '../../services/articleStore';
import { Article } from '../../types/models/article.type';
import cron from 'node-cron';

// Mock the dependencies
jest.mock('../../services/newsService', () => {
  return {
    __esModule: true,
    NewsService: jest.fn().mockImplementation(() => ({
      fetchFromReddit: jest.fn(),
      fetchFromTwitter: jest.fn(),
      fetchFromWashingtonPost: jest.fn()
    }))
  };
});

jest.mock('../../services/articleStore', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      storeArticles: jest.fn(),
      hasTodaysArticles: jest.fn(),
      getArticles: jest.fn()
    }))
  };
});

jest.mock('node-cron', () => ({
  schedule: jest.fn().mockReturnValue({
    stop: jest.fn()
  })
}));

describe('ArticleFetcherService', () => {
  let articleFetcherService: ArticleFetcherService;
  let mockNewsService: jest.Mocked<NewsService>;
  let mockArticleStore: jest.Mocked<ArticleStore>;
  
  // Sample articles for testing
  const redditArticles: Article[] = [
    {
      id: 'reddit-1',
      title: 'Reddit Article 1',
      content: 'Content from Reddit',
      source: 'reddit',
      sourceUrl: 'https://reddit.com/r/news/123',
      author: 'reddituser',
      publishedAt: new Date().toISOString(),
      location: 'San Francisco, CA',
      tags: ['news', 'technology'],
      mass: 120000,
      tier: 'close',
      read: false
    },
    {
      id: 'reddit-2',
      title: 'Reddit Article 2',
      content: 'More content from Reddit',
      source: 'reddit',
      sourceUrl: 'https://reddit.com/r/news/456',
      author: 'reddituser2',
      publishedAt: new Date().toISOString(),
      location: 'New York, NY',
      tags: ['news', 'politics'],
      mass: 150000,
      tier: 'medium',
      read: false
    }
  ];
  
  const twitterArticles: Article[] = [
    {
      id: 'twitter-1',
      title: 'Twitter Article 1',
      content: 'Content from Twitter',
      source: 'twitter',
      sourceUrl: 'https://twitter.com/user/123',
      author: '@twitteruser',
      publishedAt: new Date().toISOString(),
      location: 'Washington, DC',
      tags: ['politics', 'news'],
      mass: 100000,
      tier: 'close',
      read: false
    }
  ];
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up mocks
    mockNewsService = new NewsService() as jest.Mocked<NewsService>;
    mockArticleStore = new ArticleStore() as jest.Mocked<ArticleStore>;
    
    // Mock the schedule method of node-cron
    (cron.schedule as jest.Mock).mockReturnValue({
      stop: jest.fn()
    });
    
    // Mock the NewsService methods
    mockNewsService.fetchFromReddit = jest.fn().mockResolvedValue(redditArticles);
    mockNewsService.fetchFromTwitter = jest.fn().mockResolvedValue(twitterArticles);
    mockNewsService.fetchFromWashingtonPost = jest.fn().mockResolvedValue([]);
    
    // Mock the ArticleStore methods
    mockArticleStore.storeArticles = jest.fn().mockResolvedValue(3); // 3 articles stored
    mockArticleStore.hasTodaysArticles = jest.fn().mockResolvedValue(false); // No articles for today
    
    // Create a new instance with the mocked dependencies
    // We need to override the constructor to inject our mocks
    articleFetcherService = new ArticleFetcherService();
    (articleFetcherService as any).newsService = mockNewsService;
    (articleFetcherService as any).articleStore = mockArticleStore;
  });
  
  describe('start', () => {
    it('should start the cron job with the provided schedule', () => {
      // Call the method
      articleFetcherService.start('0 * * * *');
      
      // Verify that cron.schedule was called with the correct arguments
      expect(cron.schedule).toHaveBeenCalledWith('0 * * * *', expect.any(Function));
    });
    
    it('should stop any existing cron job before starting a new one', () => {
      // Set up a mock cron job
      const mockCronJob = { stop: jest.fn() };
      (articleFetcherService as any).cronJob = mockCronJob;
      
      // Call the method
      articleFetcherService.start('0 * * * *');
      
      // Verify that the existing cron job was stopped
      expect(mockCronJob.stop).toHaveBeenCalled();
      
      // Verify that a new cron job was started
      expect(cron.schedule).toHaveBeenCalledWith('0 * * * *', expect.any(Function));
    });
  });
  
  describe('stop', () => {
    it('should stop the cron job if it exists', () => {
      // Set up a mock cron job
      const mockCronJob = { stop: jest.fn() };
      (articleFetcherService as any).cronJob = mockCronJob;
      
      // Call the method
      articleFetcherService.stop();
      
      // Verify that the cron job was stopped
      expect(mockCronJob.stop).toHaveBeenCalled();
      
      // Verify that the cronJob property was set to null
      expect((articleFetcherService as any).cronJob).toBeNull();
    });
    
    it('should do nothing if no cron job exists', () => {
      // Ensure cronJob is null
      (articleFetcherService as any).cronJob = null;
      
      // Call the method
      articleFetcherService.stop();
      
      // Verify that nothing happened (no errors)
      expect((articleFetcherService as any).cronJob).toBeNull();
    });
  });
  
  describe('fetchAndStoreArticles', () => {
    it('should fetch articles from all sources and store them', async () => {
      // Call the method
      await articleFetcherService.fetchAndStoreArticles();
      
      // Verify that the articles were fetched from all sources
      expect(mockNewsService.fetchFromReddit).toHaveBeenCalledWith('news', 30);
      expect(mockNewsService.fetchFromTwitter).toHaveBeenCalled();
      expect(mockNewsService.fetchFromWashingtonPost).toHaveBeenCalled();
      
      // Verify that the articles were stored
      expect(mockArticleStore.storeArticles).toHaveBeenCalledWith(
        expect.arrayContaining([...redditArticles, ...twitterArticles])
      );
    });
    
    it('should not fetch from sources that already have articles for today', async () => {
      // Mock hasTodaysArticles to return true for reddit
      mockArticleStore.hasTodaysArticles = jest.fn().mockImplementation((source: string) => {
        return Promise.resolve(source === 'reddit');
      });
      
      // Call the method
      await articleFetcherService.fetchAndStoreArticles();
      
      // Verify that reddit articles were not fetched
      expect(mockNewsService.fetchFromReddit).not.toHaveBeenCalled();
      
      // Verify that other sources were still fetched
      expect(mockNewsService.fetchFromTwitter).toHaveBeenCalled();
      expect(mockNewsService.fetchFromWashingtonPost).toHaveBeenCalled();
      
      // Verify that the articles were stored
      expect(mockArticleStore.storeArticles).toHaveBeenCalledWith(
        expect.arrayContaining([...twitterArticles])
      );
    });
    
    it('should handle errors when fetching articles', async () => {
      // Mock fetchFromReddit to throw an error
      mockNewsService.fetchFromReddit = jest.fn().mockRejectedValue(new Error('API error'));
      
      // Call the method
      await articleFetcherService.fetchAndStoreArticles();
      
      // Verify that the error was handled and other sources were still fetched
      expect(mockNewsService.fetchFromTwitter).toHaveBeenCalled();
      expect(mockNewsService.fetchFromWashingtonPost).toHaveBeenCalled();
      
      // Verify that the articles from other sources were still stored
      expect(mockArticleStore.storeArticles).toHaveBeenCalledWith(
        expect.arrayContaining([...twitterArticles])
      );
    });
    
    it('should not run multiple fetches simultaneously', async () => {
      // Set isRunning to true to simulate a fetch in progress
      (articleFetcherService as any).isRunning = true;
      
      // Call the method
      await articleFetcherService.fetchAndStoreArticles();
      
      // Verify that no articles were fetched
      expect(mockNewsService.fetchFromReddit).not.toHaveBeenCalled();
      expect(mockNewsService.fetchFromTwitter).not.toHaveBeenCalled();
      expect(mockNewsService.fetchFromWashingtonPost).not.toHaveBeenCalled();
      
      // Verify that no articles were stored
      expect(mockArticleStore.storeArticles).not.toHaveBeenCalled();
    });
  });
  
  describe('getStatus', () => {
    it('should return the current status of the article fetcher', () => {
      // Set up some state
      (articleFetcherService as any).isRunning = true;
      (articleFetcherService as any).cronJob = { stop: jest.fn() };
      (articleFetcherService as any).fetchCount = 5;
      
      // Call the method
      const status = articleFetcherService.getStatus();
      
      // Verify the returned status
      expect(status).toEqual({
        isRunning: true,
        isScheduled: true,
        fetchCount: 5,
        lastFetchAt: expect.any(String)
      });
    });
  });
});
