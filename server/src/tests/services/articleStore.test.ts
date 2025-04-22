import { ArticleStore } from '../../services/articleStore';
import ArticleModel from '../../models/ArticleSchema';
import MongoManager from '../../database/MongoManager';
import { Article, ArticleLocation, TierType } from '../../types/models/article.type';

// Mock the ArticleModel
jest.mock('../../models/ArticleSchema', () => {
  // Create a mock constructor function for ArticleModel
  const MockArticleModel = jest.fn().mockImplementation(() => ({
    save: jest.fn().mockResolvedValue({}),
    articleId: '',
    title: '',
    content: '',
    source: '',
    sourceUrl: '',
    author: '',
    publishedAt: '',
    location: '' as string | ArticleLocation,
    tags: [],
    mass: 0,
    tier: 'medium',
    
    fetchedAt: new Date(),
  }));
  
  // Add static methods to the constructor
  const findOneMock = jest.fn();
  const findMock = jest.fn().mockReturnValue({
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn()
  });
  const countDocumentsMock = jest.fn();
  
  // Add the static methods to the constructor function
  Object.assign(MockArticleModel, {
    findOne: findOneMock,
    find: findMock,
    countDocuments: countDocumentsMock
  });
  
  // Add prototype for instance methods
  MockArticleModel.prototype.save = jest.fn().mockResolvedValue({});
  
  return {
    __esModule: true,
    default: MockArticleModel
  };
});

// Mock the MongoManager
jest.mock('../../database/MongoManager', () => ({
  __esModule: true,
  default: {
    isConnected: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn()
  }
}));

describe('ArticleStore', () => {
  let articleStore: ArticleStore;
  
  // Mock article data
  const mockArticle: Article = {
    id: 'test-123',
    title: 'Test Article',
    content: 'This is a test article content',
    source: 'test-source',
    sourceUrl: 'https://example.com/test',
    author: 'Test Author',
    publishedAt: new Date().toISOString(),
    location: { location: 'Test Location', latitude: 0, longitude: 0, zipCode: '00000' },
    tags: ['test', 'article'],
    mass: 50000
  };
  
  // Mock article with structured location
  const mockArticleWithStructuredLocation: Article = {
    id: 'test-456',
    title: 'Test Article with Structured Location',
    content: 'This is a test article with structured location data',
    source: 'test-source',
    sourceUrl: 'https://example.com/test2',
    author: 'Test Author',
    publishedAt: new Date().toISOString(),
    location: {
      location: 'San Francisco, California, United States',
      latitude: 37.7749,
      longitude: -122.4194,
      zipCode: '94103'
    },
    tags: ['test', 'article', 'location'],
    mass: 60000
  };
  
  // Sample article from database (with MongoDB fields)
  const sampleDbArticle = {
    _id: 'mongodb-id-123',
    articleId: 'test-article-1',
    title: 'Test Article',
    content: 'This is a test article content',
    source: 'reddit',
    sourceUrl: 'https://reddit.com/r/test/123',
    author: 'testuser',
    publishedAt: new Date().toISOString(),
    location: 'New York',
    tags: ['test', 'sample'],
    mass: 150000,
    tier: 'medium',
    
    fetchedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn().mockResolvedValue({})
  };
  
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Create a new instance of ArticleStore for each test
    articleStore = new ArticleStore();
    
    // Mock MongoManager.isConnected to return true by default
    (MongoManager.isConnected as jest.Mock).mockReturnValue(true);
  });
  
  describe('storeArticles', () => {
    it('should store new articles successfully', async () => {
      // Mock ArticleModel.findOne to return null (article doesn't exist)
      (ArticleModel.findOne as jest.Mock).mockResolvedValue(null);
      
      // Call the method
      const result = await articleStore.storeArticles([mockArticle]);
      
      // Verify results
      expect(result).toBe(1); // 1 article stored
      expect(ArticleModel.findOne).toHaveBeenCalledWith({ articleId: mockArticle.id });
      // Verify that a new ArticleModel was created
      expect(ArticleModel).toHaveBeenCalled();
    });
    
    it('should update existing articles', async () => {
      // Mock ArticleModel.findOne to return an existing article
      (ArticleModel.findOne as jest.Mock).mockResolvedValue(sampleDbArticle);
      
      // Call the method
      const result = await articleStore.storeArticles([mockArticle]);
      
      // Verify results
      expect(result).toBe(1); // 1 article updated
      expect(ArticleModel.findOne).toHaveBeenCalledWith({ articleId: mockArticle.id });
      expect(sampleDbArticle.save).toHaveBeenCalled();
    });
    
    it('should return 0 when MongoDB is not connected', async () => {
      // Mock MongoManager.isConnected to return false
      (MongoManager.isConnected as jest.Mock).mockReturnValue(false);
      
      // Call the method
      const result = await articleStore.storeArticles([mockArticle]);
      
      // Verify results
      expect(result).toBe(0); // No articles stored
      expect(ArticleModel.findOne).not.toHaveBeenCalled();
    });
    
    it('should handle errors when storing articles', async () => {
      // Mock ArticleModel.findOne to throw an error
      (ArticleModel.findOne as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      // Call the method
      const result = await articleStore.storeArticles([mockArticle]);
      
      // Verify results
      expect(result).toBe(0); // No articles stored due to error
      expect(ArticleModel.findOne).toHaveBeenCalledWith({ articleId: mockArticle.id });
    });
  });
  
  describe('getArticles', () => {
    it('should retrieve articles with default options', async () => {
      // Mock database response
      const mockArticles = [sampleDbArticle, { ...sampleDbArticle, articleId: 'test-article-2' }];
      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockArticles)
      };
      (ArticleModel.find as jest.Mock).mockReturnValue(mockFind);
      
      // Mock Date.now() to return a fixed timestamp for testing
      const realDateNow = Date.now;
      const mockDateNow = jest.fn(() => new Date('2025-04-11T00:00:00Z').getTime());
      global.Date.now = mockDateNow;
      
      // Call the method
      const result = await articleStore.getArticles();
      
      // Verify results
      expect(result.length).toBe(2);
      expect(result[0].id).toBe('test-article-1');
      
      // We need to check that find was called, but we don't care about the exact date value
      expect(ArticleModel.find).toHaveBeenCalled();
      expect(mockFind.sort).toHaveBeenCalledWith({ publishedAt: -1 });
      expect(mockFind.limit).toHaveBeenCalledWith(100);
      
      // Restore the original Date.now
      global.Date.now = realDateNow;
    });
    
    it('should filter articles by source', async () => {
      // Mock database response
      const mockArticles = [sampleDbArticle];
      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockArticles)
      };
      (ArticleModel.find as jest.Mock).mockReturnValue(mockFind);
      
      // Mock Date.now() to return a fixed timestamp for testing
      const realDateNow = Date.now;
      const mockDateNow = jest.fn(() => new Date('2025-04-11T00:00:00Z').getTime());
      global.Date.now = mockDateNow;
      
      // Call the method with source filter
      const result = await articleStore.getArticles({ source: 'reddit' });
      
      // Verify results
      expect(result.length).toBe(1);
      
      // We need to check that find was called with the source parameter
      // but we don't care about the exact date value in the query
      expect(ArticleModel.find).toHaveBeenCalledWith(expect.objectContaining({
        source: 'reddit'
      }));
      
      // Restore the original Date.now
      global.Date.now = realDateNow;
    });
    
    it('should filter articles by date range', async () => {
      // Mock database response
      const mockArticles = [sampleDbArticle];
      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockArticles)
      };
      (ArticleModel.find as jest.Mock).mockReturnValue(mockFind);
      
      // Call the method with daysBack filter
      const result = await articleStore.getArticles({ daysBack: 7 });
      
      // Verify results
      expect(result.length).toBe(1);
      expect(ArticleModel.find).toHaveBeenCalledWith(expect.objectContaining({
        publishedAt: expect.objectContaining({
          $gte: expect.any(String)
        })
      }));
    });
    
    it('should return empty array when MongoDB is not connected', async () => {
      // Mock MongoManager.isConnected to return false
      (MongoManager.isConnected as jest.Mock).mockReturnValue(false);
      
      // Call the method
      const result = await articleStore.getArticles();
      
      // Verify results
      expect(result).toEqual([]);
      expect(ArticleModel.find).not.toHaveBeenCalled();
    });
    
    it('should handle errors when retrieving articles', async () => {
      // Mock database error
      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockRejectedValue(new Error('Database error'))
      };
      (ArticleModel.find as jest.Mock).mockReturnValue(mockFind);
      
      // Call the method
      const result = await articleStore.getArticles();
      
      // Verify results
      expect(result).toEqual([]);
      expect(ArticleModel.find).toHaveBeenCalled();
    });
  });
  
  describe('hasTodaysArticles', () => {
    it('should return true when articles exist for today', async () => {
      // Mock ArticleModel.countDocuments to return a count > 0
      (ArticleModel.countDocuments as jest.Mock).mockResolvedValue(5);
      
      // Call the method
      const result = await articleStore.hasTodaysArticles('reddit');
      
      // Verify results
      expect(result).toBe(true);
      expect(ArticleModel.countDocuments).toHaveBeenCalledWith(expect.objectContaining({
        fetchedAt: expect.any(Object),
        source: 'reddit'
      }));
    });
    
    it('should return false when no articles exist for today', async () => {
      // Mock ArticleModel.countDocuments to return 0
      (ArticleModel.countDocuments as jest.Mock).mockResolvedValue(0);
      
      // Call the method
      const result = await articleStore.hasTodaysArticles('reddit');
      
      // Verify results
      expect(result).toBe(false);
      expect(ArticleModel.countDocuments).toHaveBeenCalled();
    });
    
    it('should return false when MongoDB is not connected', async () => {
      // Mock MongoManager.isConnected to return false
      (MongoManager.isConnected as jest.Mock).mockReturnValue(false);
      
      // Call the method
      const result = await articleStore.hasTodaysArticles('reddit');
      
      // Verify results
      expect(result).toBe(false);
      expect(ArticleModel.countDocuments).not.toHaveBeenCalled();
    });
    
    it('should handle errors when checking for today\'s articles', async () => {
      // Mock ArticleModel.countDocuments to throw an error
      (ArticleModel.countDocuments as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      // Call the method
      const result = await articleStore.hasTodaysArticles('reddit');
      
      // Verify results
      expect(result).toBe(false);
      expect(ArticleModel.countDocuments).toHaveBeenCalled();
    });
  });
  
  describe('getLastWeekArticles', () => {
    it('should call getArticles with correct parameters', async () => {
      // Spy on the getArticles method
      const getArticlesSpy = jest.spyOn(articleStore, 'getArticles').mockResolvedValue([]);
      
      // Call the method
      await articleStore.getLastWeekArticles(50);
      
      // Verify results
      expect(getArticlesSpy).toHaveBeenCalledWith({
        daysBack: 7,
        limit: 50
      });
    });
  });
});
