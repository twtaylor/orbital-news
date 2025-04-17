import ArticleStore from '../../services/articleStore';
import ArticleModel from '../../models/ArticleSchema';
import MongoManager from '../../database/MongoManager';
import { Article, TierType } from '../../types/models/article.type';

// Mock the ArticleModel
jest.mock('../../models/ArticleSchema', () => {
  return {
    __esModule: true,
    default: {
      findOneAndUpdate: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnValue([])
      }),
      countDocuments: jest.fn()
    }
  };
});

// Mock the MongoManager
jest.mock('../../database/MongoManager', () => ({
  __esModule: true,
  default: {
    isConnected: jest.fn().mockReturnValue(true)
  }
}));

describe('ArticleStore - markArticleAsRead', () => {
  let articleStore: ArticleStore;
  
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
    read: true, // Now marked as read
    fetchedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Create a new instance of ArticleStore for each test
    articleStore = new ArticleStore();
  });
  
  it('should mark an article as read successfully', async () => {
    // Mock findOneAndUpdate to return the updated document
    (ArticleModel.findOneAndUpdate as jest.Mock).mockImplementation(() => ({
      lean: () => sampleDbArticle
    }));
    
    // Call the method
    const result = await articleStore.markArticleAsRead('test-article-1');
    
    // Verify results
    expect(result).not.toBeNull();
    expect(result?.id).toBe('test-article-1');
    expect(result?.read).toBe(true);
    
    // Verify that findOneAndUpdate was called with the correct arguments
    expect(ArticleModel.findOneAndUpdate).toHaveBeenCalledWith(
      { articleId: 'test-article-1' },
      { read: true },
      { new: true }
    );
  });
  
  it('should return null when article is not found', async () => {
    // Mock findOneAndUpdate to return null (article not found)
    (ArticleModel.findOneAndUpdate as jest.Mock).mockImplementation(() => ({
      lean: () => null
    }));
    
    // Call the method
    const result = await articleStore.markArticleAsRead('non-existent-article');
    
    // Verify results
    expect(result).toBeNull();
    
    // Verify that findOneAndUpdate was called with the correct arguments
    expect(ArticleModel.findOneAndUpdate).toHaveBeenCalledWith(
      { articleId: 'non-existent-article' },
      { read: true },
      { new: true }
    );
  });
  
  it('should return null when MongoDB is not connected', async () => {
    // Mock MongoManager.isConnected to return false
    (MongoManager.isConnected as jest.Mock).mockReturnValueOnce(false);
    
    // Call the method
    const result = await articleStore.markArticleAsRead('test-article-1');
    
    // Verify results
    expect(result).toBeNull();
    
    // Verify that findOneAndUpdate was not called
    expect(ArticleModel.findOneAndUpdate).not.toHaveBeenCalled();
  });
  
  it('should handle errors when marking an article as read', async () => {
    // Mock findOneAndUpdate to throw an error
    (ArticleModel.findOneAndUpdate as jest.Mock).mockImplementation(() => {
      throw new Error('Database error');
    });
    
    // Call the method
    const result = await articleStore.markArticleAsRead('test-article-1');
    
    // Verify results
    expect(result).toBeNull();
    
    // Verify that findOneAndUpdate was called
    expect(ArticleModel.findOneAndUpdate).toHaveBeenCalled();
  });
});
