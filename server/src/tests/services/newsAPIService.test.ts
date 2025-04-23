// Mock dependencies first
jest.mock('../../database/mongoManager');
jest.mock('../../services/articleStore');
jest.mock('node-fetch');

// Then import modules
import { NewsAPIService } from '../../services/newsAPIService';
import MongoManager from '../../database/MongoManager';
import { ArticleStore } from '../../services/articleStore';
import { Article } from '../../types/models/article.type';

// Import the mocked fetch function
const fetchModule = jest.requireMock('node-fetch');
const mockedFetch = fetchModule.default;

// Get Response from actual node-fetch
const { Response } = jest.requireActual('node-fetch');

describe('NewsAPIService', () => {
  let newsAPIService: NewsAPIService;
  let mockArticleStore: jest.Mocked<ArticleStore>;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    mockedFetch.mockReset();
    
    // Mock MongoDB connection status
    jest.spyOn(MongoManager, 'isConnected').mockReturnValue(true);
    
    // Mock ArticleStore
    mockArticleStore = new ArticleStore() as jest.Mocked<ArticleStore>;
    (ArticleStore as jest.Mock).mockImplementation(() => mockArticleStore);
    
    // Remove any existing API key
    delete process.env.NEWSAPI_API_KEY;
    
    // Set a test API key
    process.env.NEWSAPI_API_KEY = 'test-api-key';
    
    // Create a new instance of NewsAPIService for each test
    newsAPIService = new NewsAPIService();
  });
  
  afterEach(() => {
    // Clean up environment variables
    delete process.env.NEWSAPI_API_KEY;
  });
  
  describe('fetchArticles', () => {
    it('should fetch articles from NewsAPI', async () => {
      // Mock the fetch response with sample NewsAPI data
      const mockNewsAPIResponse = {
        status: 'ok',
        totalResults: 2,
        articles: [
          {
            source: {
              id: 'cnn',
              name: 'CNN'
            },
            author: 'John Doe',
            title: 'Test Article 1',
            description: 'This is a test article from NewsAPI',
            url: 'https://example.com/article1',
            urlToImage: 'https://example.com/image1.jpg',
            publishedAt: '2025-04-22T10:00:00Z',
            content: 'This is the content of test article 1'
          },
          {
            source: {
              id: 'bbc',
              name: 'BBC'
            },
            author: 'Jane Smith',
            title: 'Test Article 2',
            description: 'This is another test article from NewsAPI',
            url: 'https://example.com/article2',
            urlToImage: null,
            publishedAt: '2025-04-22T11:00:00Z',
            content: null
          }
        ]
      };
      
      mockedFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockNewsAPIResponse), { status: 200 })
      );
      
      // Mock the storeArticles method
      mockArticleStore.storeArticles.mockResolvedValueOnce(2);
      
      // Call the fetchArticles method with forceFetch=true
      const articles = await newsAPIService.fetchArticles(10, true);
      
      // Verify fetch was called with the correct URL and headers
      expect(mockedFetch).toHaveBeenCalledWith(
        'https://newsapi.org/v2/top-headlines?country=us&pageSize=10',
        {
          method: 'GET',
          headers: {
            'X-Api-Key': 'test-api-key'
          }
        }
      );
      
      // Verify the articles were transformed correctly
      expect(articles).toHaveLength(2);
      expect(articles[0].title).toBe('Test Article 1');
      expect(articles[0].source).toBe('newsapi');
      expect(articles[0].sourceUrl).toBe('https://example.com/article1');
      
      // Verify the articles were stored
      expect(mockArticleStore.storeArticles).toHaveBeenCalledWith(articles);
    });
    
    it('should return stored articles if available and not forcing fetch', async () => {
      // Mock stored articles
      const storedArticles: Article[] = [
        {
          id: 'newsapi-stored1',
          title: 'Stored Article 1',
          content: 'Stored content 1',
          source: 'newsapi',
          sourceUrl: 'https://example.com/stored1',
          author: 'Stored Author',
          publishedAt: '2025-04-21T10:00:00Z',
          location: 'New York, NY',
          tags: [],
          mass: 50000
        }
      ];
      
      // Mock the getArticles method to return stored articles
      mockArticleStore.getArticles.mockResolvedValueOnce(storedArticles);
      
      // Call the fetchArticles method without forcing fetch
      const articles = await newsAPIService.fetchArticles(10, false);
      
      // Verify fetch was not called
      expect(mockedFetch).not.toHaveBeenCalled();
      
      // Verify the correct stored articles were returned
      expect(articles).toEqual(storedArticles);
    });
    
    it('should handle API errors gracefully', async () => {
      // Mock an error response from the API
      mockedFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'error', code: 'apiKeyInvalid', message: 'Your API key is invalid' }), 
        { status: 401 })
      );
      
      // Call the fetchArticles method
      const articles = await newsAPIService.fetchArticles(10, true);
      
      // Verify an empty array is returned on error
      expect(articles).toEqual([]);
      
      // Verify storeArticles was not called
      expect(mockArticleStore.storeArticles).not.toHaveBeenCalled();
    });
    
    it('should handle missing API key', async () => {
      // Reset the mock to ensure clean state
      mockedFetch.mockReset();
      
      // Remove the API key
      delete process.env.NEWSAPI_API_KEY;
      
      // Create a new instance with a spy on the apiKey property
      const serviceWithoutKey = new NewsAPIService();
      
      // Explicitly set the apiKey to empty string to simulate missing API key
      Object.defineProperty(serviceWithoutKey, 'apiKey', {
        value: '',
        writable: true
      });
      
      // Call the fetchArticles method
      const articles = await serviceWithoutKey.fetchArticles(10, true);
      
      // Verify an empty array is returned
      expect(articles).toEqual([]);
      
      // Verify fetch was not called
      expect(mockedFetch).not.toHaveBeenCalled();
    });
  });
});
