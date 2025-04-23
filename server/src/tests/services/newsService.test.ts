import { NewsService } from '../../services/newsService';
import { RedditService } from '../../services/redditService';
import { NewsAPIService } from '../../services/newsAPIService';

// Mock the dependencies
jest.mock('../../services/redditService');
jest.mock('../../services/newsAPIService');

describe('NewsService', () => {
  let newsService: NewsService;
  let mockRedditService: jest.Mocked<RedditService>;
  let mockNewsAPIService: jest.Mocked<NewsAPIService>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create instance of NewsService
    newsService = new NewsService();
    
    // Get the mocked instances
    mockRedditService = (RedditService as jest.MockedClass<typeof RedditService>).mock.instances[0] as jest.Mocked<RedditService>;
    mockNewsAPIService = (NewsAPIService as jest.MockedClass<typeof NewsAPIService>).mock.instances[0] as jest.Mocked<NewsAPIService>;
  });

  describe('fetchFromReddit', () => {
    it('should call RedditService.fetchArticles with default parameters', async () => {
      // Setup
      const mockArticles = [{ id: 'test-article' }];
      mockRedditService.fetchArticles.mockResolvedValue(mockArticles as any);
      
      // Execute
      const result = await newsService.fetchFromReddit();
      
      // Verify
      expect(mockRedditService.fetchArticles).toHaveBeenCalledWith('news', 50, 'day', true, false);
      expect(result).toEqual(mockArticles);
    });

    it('should call RedditService.fetchArticles with custom parameters', async () => {
      // Setup
      const mockArticles = [{ id: 'test-article' }];
      mockRedditService.fetchArticles.mockResolvedValue(mockArticles as any);
      
      // Execute
      const result = await newsService.fetchFromReddit('worldnews', 10, true);
      
      // Verify
      expect(mockRedditService.fetchArticles).toHaveBeenCalledWith('worldnews', 10, 'day', true, true);
      expect(result).toEqual(mockArticles);
    });
  });

  describe('fetchFromNewsAPI', () => {
    it('should call NewsAPIService.fetchArticles with default parameters', async () => {
      // Setup
      const mockArticles = [{ id: 'test-article' }];
      mockNewsAPIService.fetchArticles.mockResolvedValue(mockArticles as any);
      
      // Execute
      const result = await newsService.fetchFromNewsAPI();
      
      // Verify
      expect(mockNewsAPIService.fetchArticles).toHaveBeenCalledWith(50, false);
      expect(result).toEqual(mockArticles);
    });

    it('should call NewsAPIService.fetchArticles with custom parameters', async () => {
      // Setup
      const mockArticles = [{ id: 'test-article' }];
      mockNewsAPIService.fetchArticles.mockResolvedValue(mockArticles as any);
      
      // Execute
      const result = await newsService.fetchFromNewsAPI(10, true);
      
      // Verify
      expect(mockNewsAPIService.fetchArticles).toHaveBeenCalledWith(10, true);
      expect(result).toEqual(mockArticles);
    });
  });

  describe('getMockArticles', () => {
    it('should return an array of mock articles', () => {
      // Execute
      const result = newsService.getMockArticles();
      
      // Verify
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
      expect(result[0].id).toBe('reddit-close');
      expect(result[1].id).toBe('reddit-medium');
      expect(result[2].id).toBe('reddit-far');
    });
  });

  describe('fetchFromTwitter', () => {
    it('should return mock Twitter articles without a query', async () => {
      // Execute
      const result = await newsService.fetchFromTwitter();
      
      // Verify
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
      expect(result[0].id).toBe('twitter-close');
      expect(result[1].id).toBe('twitter-medium');
      expect(result[2].id).toBe('twitter-far');
    });

    it('should return mock Twitter articles with a query', async () => {
      // Execute
      const result = await newsService.fetchFromTwitter('test query');
      
      // Verify
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
      expect(result[0].source).toBe('twitter');
    });
  });

  describe('fetchFromWashingtonPost', () => {
    it('should return mock Washington Post articles without a query', async () => {
      // Execute
      const result = await newsService.fetchFromWashingtonPost();
      
      // Verify
      expect(Array.isArray(result)).toBe(true);
      expect(result.some(article => article.source === 'washington_post')).toBe(true);
    });

    it('should return mock Washington Post articles with a query', async () => {
      // Execute
      const result = await newsService.fetchFromWashingtonPost('politics');
      
      // Verify
      expect(Array.isArray(result)).toBe(true);
      expect(result.some(article => article.source === 'washington_post')).toBe(true);
    });
  });
});
