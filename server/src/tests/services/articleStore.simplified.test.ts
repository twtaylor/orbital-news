import { ArticleStore } from '../../services/articleStore';
import MongoManager from '../../database/MongoManager';
import { Article } from '../../types/models/article.type';
import ArticleModel from '../../models/ArticleSchema';

// Mock the MongoManager
jest.mock('../../database/MongoManager', () => ({
  __esModule: true,
  default: {
    isConnected: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn()
  }
}));

// Mock ArticleModel without importing it directly
jest.mock('../../models/ArticleSchema', () => {
  const mockFindOne = jest.fn();
  const mockFind = jest.fn();
  
  return {
    __esModule: true,
    default: {
      findOne: mockFindOne,
      find: mockFind,
      countDocuments: jest.fn(),
      prototype: {
        save: jest.fn()
      }
    }
  };
});

describe('ArticleStore Simplified Tests', () => {
  let articleStore: ArticleStore;
  
  // Use the imported ArticleModel
  
  // Sample article for testing
  const sampleArticle: Article = {
    id: 'test-article-1',
    title: 'Test Article',
    content: 'This is a test article content',
    source: 'reddit',
    sourceUrl: 'https://reddit.com/r/test/123',
    author: 'testuser',
    publishedAt: new Date().toISOString(),
    location: 'New York',
    tags: ['test', 'sample'],
    mass: 150000
  };
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create a new instance of ArticleStore for each test
    articleStore = new ArticleStore();
    
    // Mock MongoManager.isConnected to return true by default
    (MongoManager.isConnected as jest.Mock).mockReturnValue(true);
  });
  
  describe('MongoDB Connection Checks', () => {
    it('should check MongoDB connection before storing articles', async () => {
      // Mock MongoManager.isConnected to return false
      (MongoManager.isConnected as jest.Mock).mockReturnValue(false);
      
      // Spy on console.warn
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Call the method
      const result = await articleStore.storeArticles([sampleArticle]);
      
      // Verify results
      expect(result).toBe(0);
      expect(MongoManager.isConnected).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith('MongoDB not connected, skipping article storage');
      
      // Restore console.warn
      consoleWarnSpy.mockRestore();
    });
    
    it('should check MongoDB connection before retrieving articles', async () => {
      // Mock MongoManager.isConnected to return false
      (MongoManager.isConnected as jest.Mock).mockReturnValue(false);
      
      // Spy on console.warn
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Call the method
      const result = await articleStore.getArticles();
      
      // Verify results
      expect(result).toEqual([]);
      expect(MongoManager.isConnected).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith('MongoDB not connected, returning empty results');
      
      // Restore console.warn
      consoleWarnSpy.mockRestore();
    });
    
    it('should check MongoDB connection before counting today\'s articles', async () => {
      // Mock MongoManager.isConnected to return false
      (MongoManager.isConnected as jest.Mock).mockReturnValue(false);
      
      // Call the method
      const result = await articleStore.getTodaysArticleCount('reddit');
      
      // Verify results
      expect(result).toBe(0);
      expect(MongoManager.isConnected).toHaveBeenCalled();
      // The getTodaysArticleCount method doesn't log a warning when MongoDB is not connected
    });
  });
  
  describe('Error Handling', () => {
    it('should handle errors when storing articles', async () => {
      // Mock ArticleModel.findOne to throw an error
      jest.spyOn(ArticleModel, 'findOne').mockImplementation(() => {
        throw new Error('Database error');
      });
      
      // Spy on console.error
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Call the method
      const result = await articleStore.storeArticles([sampleArticle]);
      
      // Verify results
      expect(result).toBe(0);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error storing articles:', expect.any(Error));
      
      // Restore console.error
      consoleErrorSpy.mockRestore();
    });
    
    it('should handle errors when retrieving articles', async () => {
      // Mock ArticleModel.find to return a chainable object that throws an error
      const mockLean = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });
      const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
      const mockSort = jest.fn().mockReturnValue({ limit: mockLimit });
      
      jest.spyOn(ArticleModel, 'find').mockReturnValue({ sort: mockSort } as any);
      
      // Spy on console.error
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Call the method
      const result = await articleStore.getArticles();
      
      // Verify results
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error retrieving articles:', expect.any(Error));
      
      // Restore console.error
      consoleErrorSpy.mockRestore();
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
      
      // Restore the spy
      getArticlesSpy.mockRestore();
    });
  });
});
