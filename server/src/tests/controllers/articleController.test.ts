import { Request, Response } from 'express';
import { 
  getArticles, 
  getArticleById, 
  getArticleFetcherStatus,
  triggerArticleFetch
} from '../../controllers/articleController';
import ArticleStore from '../../services/articleStore';
import { GeocodingService } from '../../services/geocodingService';
import { articleFetcher } from '../../services/articleFetcherService';
import { Article, TierType, ArticleWithTier } from '../../types/models/article.type';

// Mock the ArticleStore
jest.mock('../../services/articleStore', () => {
  const mockGetArticles = jest.fn();
  
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      getArticles: mockGetArticles
    })),
    // Export the mocks for direct access in tests
    mockGetArticles
  };
});

// Mock the GeocodingService
jest.mock('../../services/geocodingService', () => {
  const mockGetUserLocation = jest.fn().mockReturnValue({ latitude: 40.7128, longitude: -74.0060 });
  const mockCalculateDistance = jest.fn().mockReturnValue(100000); // 100km
  const mockDetermineTierFromDistance = jest.fn().mockReturnValue('far');
  const mockGetDefaultUserZipCode = jest.fn().mockReturnValue('00000');
  const mockSetUserLocationByZipCode = jest.fn().mockResolvedValue(true);
  const mockCalculateDistanceBetweenZipCodes = jest.fn().mockResolvedValue({
    distanceInKilometers: 2500,
    distanceInMiles: 1553,
    tier: 'far'
  });
  
  return {
    __esModule: true,
    GeocodingService: jest.fn().mockImplementation(() => ({
      getUserLocation: mockGetUserLocation,
      calculateDistance: mockCalculateDistance,
      determineTierFromDistance: mockDetermineTierFromDistance,
      getDefaultUserZipCode: mockGetDefaultUserZipCode,
      setUserLocationByZipCode: mockSetUserLocationByZipCode,
      calculateDistanceBetweenZipCodes: mockCalculateDistanceBetweenZipCodes
    })),
    // Export the mocks for direct access in tests
    mockGetUserLocation,
    mockCalculateDistance,
    mockDetermineTierFromDistance,
    mockGetDefaultUserZipCode,
    mockSetUserLocationByZipCode,
    mockCalculateDistanceBetweenZipCodes
  };
});

// Mock the ArticleFetcherService
jest.mock('../../services/articleFetcherService', () => {
  const mockFetchAndStoreArticles = jest.fn().mockResolvedValue(undefined);
  const mockGetStatus = jest.fn();
  
  return {
    __esModule: true,
    articleFetcher: {
      fetchAndStoreArticles: mockFetchAndStoreArticles,
      getStatus: mockGetStatus
    },
    // Export the mocks for direct access in tests
    mockFetchAndStoreArticles,
    mockGetStatus
  };
});

// Import the mocks directly
const { mockGetArticles } = jest.requireMock('../../services/articleStore');
const { mockGetUserLocation, mockCalculateDistance, mockDetermineTierFromDistance, mockGetDefaultUserZipCode, mockSetUserLocationByZipCode } = jest.requireMock('../../services/geocodingService');
const { mockFetchAndStoreArticles, mockGetStatus } = jest.requireMock('../../services/articleFetcherService');

// Set a longer timeout for all tests in this file
jest.setTimeout(15000); // 15 seconds

describe('ArticleController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  
  // Sample articles for testing
  const sampleArticles: Article[] = [
    {
      id: 'article-1',
      title: 'Test Article 1',
      content: 'This is test article 1',
      source: 'reddit',
      sourceUrl: 'https://reddit.com/r/news/123',
      author: 'user1',
      publishedAt: new Date().toISOString(),
      location: {
        city: 'New York',
        zipCode: '10001'
      },
      tags: ['news', 'test'],
      mass: 120000
    },
    {
      id: 'article-2',
      title: 'Test Article 2',
      content: 'This is test article 2',
      source: 'twitter',
      sourceUrl: 'https://twitter.com/user/456',
      author: 'user2',
      publishedAt: new Date().toISOString(),
      location: {
        city: 'San Francisco',
        zipCode: '94103'
      },
      tags: ['tech', 'test'],
      mass: 150000
    }
  ];
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock request and response objects
    mockRequest = {
      params: {},
      query: {}
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    // Set up mock return values
    mockGetStatus.mockReturnValue({
      isRunning: false,
      isScheduled: true,
      fetchCount: 5,
      lastFetchAt: new Date().toISOString()
    });
  });
  
  describe('getArticles', () => {
    it('should return articles from the database', async () => {

      // Mock the getArticles method to return sample articles
      mockGetArticles.mockResolvedValue(sampleArticles);
      
      // Call the controller method
      await getArticles(mockRequest as Request, mockResponse as Response);
      
      // Verify that the getArticles method was called
      expect(mockGetArticles).toHaveBeenCalled();
      
      // Create expected articles with tier
      const expectedArticlesWithTier = sampleArticles.map(article => ({
        ...article,
        tier: 'far' // This matches our mocked determineTierFromDistance return value
      }));
      
      // Verify that the correct response was sent
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        results: expectedArticlesWithTier.length,
        data: {
          articles: expectedArticlesWithTier
        }
      });
      
      // Verify that getArticles was called with the correct parameters
      expect(mockGetArticles).toHaveBeenCalledWith({
        source: undefined,
        location: undefined,
        tier: undefined,
        limit: 30,
        daysBack: 7
      });
    });
    
    it('should apply query parameters when fetching articles', async () => {
      // Set up query parameters
      mockRequest.query = {
        source: 'reddit',
        location: 'New York',
        tier: 'close',
        limit: '20',
        daysBack: '3'
      };
      
      // Mock the getArticles method to return filtered articles
      mockGetArticles.mockResolvedValue([sampleArticles[0]]);
      
      // Call the controller method
      await getArticles(mockRequest as Request, mockResponse as Response);
      
      // Verify that the correct response was sent
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        results: 1,
        data: {
          articles: [ { ...sampleArticles[0], tier: 'far' } ]
        }
      });
      
      // Verify that getArticles was called with the correct parameters
      expect(mockGetArticles).toHaveBeenCalledWith({
        source: 'reddit',
        location: 'New York',
        limit: 20,
        daysBack: 3
      });
    });
    
    it('should trigger article fetch if no articles are found', async () => {

      // Mock the getArticles method to return an empty array
      mockGetArticles.mockResolvedValue([]);
      
      // Call the controller method
      await getArticles(mockRequest as Request, mockResponse as Response);
      
      // Verify that the correct response was sent
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        results: 0,
        data: {
          articles: []
        }
      });
      
      // Verify that fetchAndStoreArticles was called
      expect(mockFetchAndStoreArticles).toHaveBeenCalled();
    });
    
    it('should handle errors when fetching articles', async () => {

      // Mock the getArticles method to throw an error
      mockGetArticles.mockRejectedValue(new Error('Database error'));
      
      // Call the controller method
      await getArticles(mockRequest as Request, mockResponse as Response);
      
      // Verify that the correct error response was sent
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Failed to fetch articles'
      });
    });

    it('should set user location when userZipCode is provided', async () => {
      // Set up query parameters with userZipCode
      mockRequest.query = {
        source: 'reddit',
        userZipCode: '94103' // San Francisco zip code
      };
      
      // Mock the getArticles method to return sample articles
      mockGetArticles.mockResolvedValue(sampleArticles);
      
      // Call the controller method
      await getArticles(mockRequest as Request, mockResponse as Response);
      
      // Verify that setUserLocationByZipCode was called with the correct zip code
      expect(mockSetUserLocationByZipCode).toHaveBeenCalledWith('94103');
      
      // Verify that the correct response was sent
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      
      // Create expected articles with tier
      const expectedArticlesWithTier = sampleArticles.map(article => ({
        ...article,
        tier: 'far' // This matches our mocked determineTierFromDistance return value
      }));
      
      // Verify the response data
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        results: expectedArticlesWithTier.length,
        data: {
          articles: expectedArticlesWithTier
        }
      });
      
      // Verify that getArticles was called with the correct parameters
      expect(mockGetArticles).toHaveBeenCalledWith({
        source: 'reddit',
        location: undefined,
        limit: 30,
        daysBack: 7
      });
    });
  });
  
  describe('getArticleById', () => {
    it('should return a specific article by ID', async () => {

      // Set up request parameters
      mockRequest.params = { id: 'article-1' };
      
      // Mock the getArticles method to return a specific article
      mockGetArticles.mockResolvedValue([sampleArticles[0]]);
      
      // Call the controller method
      await getArticleById(mockRequest as Request, mockResponse as Response);
      
      // Verify that the correct response was sent
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      
      // Create expected article with tier
      const expectedArticleWithTier = {
        ...sampleArticles[0],
        tier: 'far' // This matches our mocked determineTierFromDistance return value
      };
      
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          article: expectedArticleWithTier
        }
      });
      
      // Verify that getArticles was called with the correct parameters
      expect(mockGetArticles).toHaveBeenCalledWith({
        articleId: 'article-1',
        limit: 1
      });
    });
    
    it('should return a 404 error if article is not found', async () => {

      // Set up request parameters
      mockRequest.params = { id: 'non-existent-article' };
      
      // Mock the getArticles method to return an empty array
      mockGetArticles.mockResolvedValue([]);
      
      // Call the controller method
      await getArticleById(mockRequest as Request, mockResponse as Response);
      
      // Verify that the correct error response was sent
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'No article found with ID: non-existent-article'
      });
    });
    
    it('should handle errors when fetching an article', async () => {

      // Set up request parameters
      mockRequest.params = { id: 'article-1' };
      
      // Mock the getArticles method to throw an error
      mockGetArticles.mockRejectedValue(new Error('Database error'));
      
      // Call the controller method
      await getArticleById(mockRequest as Request, mockResponse as Response);
      
      // Verify that the correct error response was sent
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Failed to fetch article'
      });
    });
  });
  
  // markArticleAsRead tests removed as we no longer track read status
  
  describe('getArticleFetcherStatus', () => {
    it('should return the article fetcher status', async () => {

      // Mock the getStatus method to return a status object
      const mockStatus = {
        isRunning: false,
        isScheduled: true,
        fetchCount: 5,
        lastFetchAt: new Date().toISOString()
      };
      mockGetStatus.mockReturnValue(mockStatus);
      
      // Call the controller method
      await getArticleFetcherStatus(mockRequest as Request, mockResponse as Response);
      
      // Verify that the correct response was sent
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockStatus
      });
    });
    
    it('should handle errors when getting article fetcher status', async () => {

      // Mock the getStatus method to throw an error
      mockGetStatus.mockImplementation(() => {
        throw new Error('Fetcher error');
      });
      
      // Call the controller method
      await getArticleFetcherStatus(mockRequest as Request, mockResponse as Response);
      
      // Verify that the correct error response was sent
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Failed to get article fetcher status'
      });
    });
  });
  
  describe('triggerArticleFetch', () => {
    it('should trigger an article fetch', async () => {

      // Mock the getStatus method to return a status object
      const mockStatus = {
        isRunning: false,
        isScheduled: true,
        fetchCount: 5,
        lastFetchAt: new Date().toISOString()
      };
      mockGetStatus.mockReturnValue(mockStatus);
      
      // Call the controller method
      await triggerArticleFetch(mockRequest as Request, mockResponse as Response);
      
      // Verify that the correct response was sent
      expect(mockResponse.status).toHaveBeenCalledWith(202);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Article fetch triggered',
        data: mockStatus
      });
      
      // Verify that fetchAndStoreArticles was called
      expect(mockFetchAndStoreArticles).toHaveBeenCalled();
    });
    
    it('should handle errors when triggering an article fetch', async () => {

      // Mock the fetchAndStoreArticles method to throw an error
      mockFetchAndStoreArticles.mockImplementation(() => {
        throw new Error('Fetcher error');
      });
      
      // Call the controller method
      await triggerArticleFetch(mockRequest as Request, mockResponse as Response);
      
      // Verify that the correct error response was sent
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Failed to trigger article fetch'
      });
    });
  });
});
