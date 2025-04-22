// Ensure mongoose is mocked before any imports that might use it
import mongooseMock from '../mocks/mongooseMock';
jest.mock('mongoose', () => mongooseMock);

import { ArticleFetcherService } from '../../services/articleFetcherService';
import ArticleStore from '../../services/articleStore';
import { Article } from '../../types/models/article.type';
import cron from 'node-cron';

// Mock the dependencies
jest.mock('../../services/newsService');
jest.mock('../../services/articleStore');
jest.mock('node-cron', () => ({
  schedule: jest.fn().mockReturnValue({
    stop: jest.fn()
  })
}));

describe('ArticleFetcherService', () => {
  let articleFetcherService: ArticleFetcherService;
  let mockNewsService: jest.Mocked<any>;
  let mockArticleStore: jest.Mocked<ArticleStore>;
  let mockCronJob: { stop: jest.Mock };

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
      location: { location: 'San Francisco, CA', latitude: 37.7749, longitude: -122.4194, zipCode: '94103' },
      tags: ['news', 'technology'],
      mass: 120000,
      
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
      location: { location: 'Washington, DC', latitude: 38.9072, longitude: -77.0369, zipCode: '20001' },
      tags: ['politics', 'news'],
      mass: 100000,
      
    }
  ];

  const washingtonPostArticles: Article[] = [
    {
      id: 'washingtonpost-1',
      title: 'Washington Post Article 1',
      content: 'Content from Washington Post',
      source: 'washington_post',
      sourceUrl: 'https://www.washingtonpost.com/news/123',
      author: 'Washington Post Author',
      publishedAt: new Date().toISOString(),
      location: { location: 'Washington, DC', latitude: 38.9072, longitude: -77.0369, zipCode: '20001' },
      tags: ['politics', 'news'],
      mass: 100000,
      
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock implementations
    mockNewsService = {
      fetchFromReddit: jest.fn().mockResolvedValue(redditArticles),
      fetchFromTwitter: jest.fn().mockResolvedValue(twitterArticles),
      fetchFromWashingtonPost: jest.fn().mockResolvedValue(washingtonPostArticles)
    } as any;

    mockArticleStore = {
      storeArticles: jest.fn().mockResolvedValue(redditArticles.length),
      getTodaysArticleCount: jest.fn().mockResolvedValue(0),
      getArticles: jest.fn().mockResolvedValue([])
    } as any;

    mockCronJob = {
      stop: jest.fn()
    };

    // Create service instance with mocked dependencies
    articleFetcherService = new ArticleFetcherService();
    (articleFetcherService as any).newsService = mockNewsService;
    (articleFetcherService as any).articleStore = mockArticleStore;
  });

  describe('start', () => {
    it('should start the article fetcher with the provided schedule', () => {
      articleFetcherService.start('0 * * * *');
      expect(cron.schedule).toHaveBeenCalledWith('0 * * * *', expect.any(Function));
    });

    it('should stop the previous job if one is already running', () => {
      (articleFetcherService as any).cronJob = mockCronJob;
      articleFetcherService.start('0 * * * *');
      expect(mockCronJob.stop).toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('should stop the cron job if one exists', () => {
      (articleFetcherService as any).cronJob = mockCronJob;
      articleFetcherService.stop();
      expect(mockCronJob.stop).toHaveBeenCalled();
      expect((articleFetcherService as any).cronJob).toBeNull();
    });

    it('should do nothing if no cron job exists', () => {
      (articleFetcherService as any).cronJob = null;
      articleFetcherService.stop();
      expect((articleFetcherService as any).cronJob).toBeNull();
    });
  });

  describe('fetchAndStoreArticles', () => {
    it('should fetch articles from all sources and store only real articles', async () => {
      // Create a spy for fetchFromSource that we can verify was called correctly
      const fetchFromSourceSpy = jest.spyOn(articleFetcherService as any, 'fetchFromSource');
      
      // Mock the implementation to match the actual code
      fetchFromSourceSpy.mockImplementation((...args: any[]) => {
        const source = args[0] as string;
        if (source === 'reddit') return Promise.resolve(redditArticles);
        if (source === 'twitter') return Promise.resolve(twitterArticles);
        if (source === 'washington_post') return Promise.resolve(washingtonPostArticles);
        return Promise.resolve([]);
      });

      await articleFetcherService.fetchAndStoreArticles();
      
      // Verify that articles were fetched from all sources
      expect(fetchFromSourceSpy).toHaveBeenCalledWith('reddit', true);
      expect(fetchFromSourceSpy).toHaveBeenCalledWith('twitter', false);
      expect(fetchFromSourceSpy).toHaveBeenCalledWith('washington_post', false);
      
      // Only Reddit articles should be stored
      expect(mockArticleStore.storeArticles).toHaveBeenCalledWith(redditArticles);
    });

    it('should fetch articles from all sources regardless of existing articles', async () => {
      // Setup mocks for getTodaysArticleCount to return 5 for reddit
      mockArticleStore.getTodaysArticleCount.mockImplementation((source: string) => {
        return Promise.resolve(source === 'reddit' ? 5 : 0);
      });
      
      // Create a spy for the original fetchFromSource method
      const originalFetchFromSource = articleFetcherService['fetchFromSource'];
      
      // Create a mock implementation for fetchFromSource
      const mockFetchFromSource = jest.fn().mockImplementation(async (source: string, _forceFetch = true) => {
        // Return mock articles based on source
        if (source === 'reddit') return redditArticles;
        if (source === 'twitter') return twitterArticles;
        if (source === 'washington_post') return washingtonPostArticles;
        return [];
      });
      
      // Replace the original method with our mock
      articleFetcherService['fetchFromSource'] = mockFetchFromSource;

      try {
        // Reset the storeArticles mock before running the test
        mockArticleStore.storeArticles.mockReset();
        
        await articleFetcherService.fetchAndStoreArticles();
        
        // Verify that our mock was called with the expected arguments
        // In the actual implementation, we now pass forceFetch=true for Reddit
        // to ensure we always get fresh articles
        expect(mockFetchFromSource).toHaveBeenCalledWith('reddit', true);
        expect(mockFetchFromSource).toHaveBeenCalledWith('twitter', false);
        expect(mockFetchFromSource).toHaveBeenCalledWith('washington_post', false);
        
        // Check if storeArticles was called
        // With our changes, it will be called with the redditArticles
        expect(mockArticleStore.storeArticles).toHaveBeenCalledWith(redditArticles);
      } finally {
        // Restore the original method
        articleFetcherService['fetchFromSource'] = originalFetchFromSource;
      }
    });

    it('should handle errors when fetching articles', async () => {
      // Save the original fetchFromSource method
      const originalFetchFromSource = articleFetcherService['fetchFromSource'];
      
      // Create a mock implementation that simulates an error with reddit
      const mockFetchFromSource = jest.fn().mockImplementation(async (source: string, _checkForExisting = true) => {
        if (source === 'reddit') {
          throw new Error('API error');
        }
        
        // Otherwise return the mock articles
        if (source === 'twitter') return twitterArticles;
        if (source === 'washington_post') return washingtonPostArticles;
        return [];
      });
      
      // Replace the original method with our mock
      articleFetcherService['fetchFromSource'] = mockFetchFromSource;
      
      try {
        // Reset the storeArticles mock before running the test
        mockArticleStore.storeArticles.mockReset();
        
        // Execute the method
        await articleFetcherService.fetchAndStoreArticles();
        
        // Verify that our mock was called only with 'reddit' and forceFetch=true
        // The method catches errors and won't continue to other sources if reddit fails
        expect(mockFetchFromSource).toHaveBeenCalledWith('reddit', true);
        
        // Make sure storeArticles was not called since there was an error
        expect(mockArticleStore.storeArticles).not.toHaveBeenCalled();
        
        // Verify the isRunning flag was reset in the finally block
        expect(articleFetcherService['isRunning']).toBe(false);
      } finally {
        // Restore the original method
        articleFetcherService['fetchFromSource'] = originalFetchFromSource;
      }
    });

    it('should not run multiple fetches simultaneously', async () => {
      (articleFetcherService as any).isRunning = true;

      await articleFetcherService.fetchAndStoreArticles();

      expect(mockNewsService.fetchFromReddit).not.toHaveBeenCalled();
      expect(mockNewsService.fetchFromTwitter).not.toHaveBeenCalled();
      expect(mockNewsService.fetchFromWashingtonPost).not.toHaveBeenCalled();
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
        lastFetchAt: null,
        nextScheduledFetch: null
      });
    });
  });
});
