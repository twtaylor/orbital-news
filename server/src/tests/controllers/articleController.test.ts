import { Request, Response } from 'express';
import { Article } from '../../types/models/article.type';
import { getArticles, getArticleById, getArticleFetcherStatus, triggerArticleFetch } from '../../controllers/articleController';

// Mock the articleStore module
jest.mock('../../services/articleStore', () => {
  const mockGetArticles = jest.fn();
  const mockHasTodaysArticles = jest.fn();
  const mockStoreArticles = jest.fn();
  
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      getArticles: mockGetArticles,
      hasTodaysArticles: mockHasTodaysArticles,
      storeArticles: mockStoreArticles
    })),
    // Export the mocks for direct access in tests
    mockGetArticles,
    mockHasTodaysArticles,
    mockStoreArticles
  };
});

// Mock the geocodingService module
jest.mock('../../services/geocodingService', () => {
  const mockGetUserLocation = jest.fn().mockReturnValue({ latitude: 37.7749, longitude: -122.4194 });
  const mockCalculateDistance = jest.fn().mockResolvedValue(100000); // 100 km in meters
  const mockDetermineTierFromDistance = jest.fn().mockReturnValue('far');
  const mockGetDefaultUserZipCode = jest.fn().mockReturnValue('94103');
  const mockSetUserLocationByZipCode = jest.fn().mockResolvedValue(true);
  
  return {
    __esModule: true,
    GeocodingService: jest.fn().mockImplementation(() => ({
      getUserLocation: mockGetUserLocation,
      calculateDistance: mockCalculateDistance,
      determineTierFromDistance: mockDetermineTierFromDistance,
      getDefaultUserZipCode: mockGetDefaultUserZipCode,
      setUserLocationByZipCode: mockSetUserLocationByZipCode
    })),
    // Export the mocks for direct access in tests
    mockGetUserLocation,
    mockCalculateDistance,
    mockDetermineTierFromDistance,
    mockGetDefaultUserZipCode,
    mockSetUserLocationByZipCode
  };
});

// Mock the articleFetcherService module
jest.mock('../../services/articleFetcherService', () => {
  const mockFetchAndStoreArticles = jest.fn();
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
const { _mockGetUserLocation, _mockCalculateDistance, _mockDetermineTierFromDistance, _mockGetDefaultUserZipCode, mockSetUserLocationByZipCode } = jest.requireMock('../../services/geocodingService');
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
        location: 'New York',
        latitude: 40.7128,
        longitude: -74.0060,
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
        location: 'San Francisco',
        latitude: 37.7749,
        longitude: -122.4194,
        zipCode: '94103'
      },
      tags: ['tech', 'test'],
      mass: 150000
    }
  ];
  
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Create mock request and response objects
    mockRequest = {
      query: {},
      params: {}
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });
  
  describe('getArticles', () => {
    it('should return all articles with default parameters', async () => {
      // Mock the getArticles method to return sample articles
      mockGetArticles.mockResolvedValue(sampleArticles);
      
      // Call the controller method
      await getArticles(mockRequest as Request, mockResponse as Response);
      
      // Verify that the correct response was sent
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        results: sampleArticles.length,
        data: {
          articles: sampleArticles.map(article => ({
            ...article,
            tier: 'far',
            distance: {
              meters: 100000,
              kilometers: 100,
              miles: 62.137100000000004
            }
          }))
        }
      });
      
      // Verify that getArticles was called with the default parameters
      expect(mockGetArticles).toHaveBeenCalledWith({
        source: undefined,
        location: undefined,
        limit: 50,
        daysBack: 7
      });
    });
    
    it('should return articles filtered by source', async () => {
      // Set up query parameters
      mockRequest.query = {
        source: 'reddit'
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
          articles: [ { 
            ...sampleArticles[0], 
            tier: 'far',
            distance: {
              meters: 100000,
              kilometers: 100,
              miles: 62.137100000000004
            }
          } ]
        }
      });
      
      // Verify that getArticles was called with the correct parameters
      expect(mockGetArticles).toHaveBeenCalledWith({
        source: 'reddit',
        location: undefined,
        limit: 50,
        daysBack: 7
      });
    });
    
    it('should return articles filtered by location', async () => {
      // Set up query parameters
      mockRequest.query = {
        location: 'New York',
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
          articles: [ { 
            ...sampleArticles[0], 
            tier: 'far',
            distance: {
              meters: 100000,
              kilometers: 100,
              miles: 62.137100000000004
            }
          } ]
        }
      });
      
      // Verify that getArticles was called with the correct parameters
      expect(mockGetArticles).toHaveBeenCalledWith({
        source: undefined,
        location: 'New York',
        limit: 20,
        daysBack: 3
      });
    });
    
    it('should return an empty array if no articles are found', async () => {
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
      
      // Verify that getArticles was called with the default parameters
      expect(mockGetArticles).toHaveBeenCalledWith({
        source: undefined,
        location: undefined,
        limit: 50,
        daysBack: 7
      });
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
        message: 'Failed to fetch articles',
        error: 'Database error'
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
      
      // Create expected articles with tier and distance information
      const expectedArticlesWithTier = sampleArticles.map(article => ({
        ...article,
        tier: 'far', // This matches our mocked determineTierFromDistance return value
        distance: {
          meters: 100000,
          kilometers: 100,
          miles: 62.137100000000004
        }
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
        limit: 50,
        daysBack: 7
      });
    });
  });
  
  describe('getArticleById', () => {
    it('should return a specific article by ID', async () => {
      // Set up request parameters
      mockRequest.params = {
        id: 'article-1'
      };
      
      // Mock the getArticles method to return a specific article
      mockGetArticles.mockResolvedValue([sampleArticles[0]]);
      
      // Call the controller method
      await getArticleById(mockRequest as Request, mockResponse as Response);
      
      // Verify that the correct response was sent
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      
      // Create expected article with tier and distance information
      const expectedArticleWithTier = {
        ...sampleArticles[0],
        tier: 'far', // This matches our mocked determineTierFromDistance return value
        distance: {
          meters: 100000,
          kilometers: 100,
          miles: 62.137100000000004
        }
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
    
    it('should return 404 if article is not found', async () => {
      // Set up request parameters
      mockRequest.params = {
        id: 'non-existent-article'
      };
      
      // Mock the getArticles method to return an empty array
      mockGetArticles.mockResolvedValue([]);
      
      // Call the controller method
      await getArticleById(mockRequest as Request, mockResponse as Response);
      
      // Verify that the correct response was sent
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'No article found with ID: non-existent-article'
      });
    });
    
    it('should handle errors when fetching article by ID', async () => {
      // Set up request parameters
      mockRequest.params = {
        id: 'article-1'
      };
      
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
        message: 'Failed to get article fetcher status',
        error: 'Fetcher error'
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
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Article fetch triggered in worker thread',
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
        message: 'Failed to trigger article fetch',
        error: 'Fetcher error'
      });
    });
  });
});
