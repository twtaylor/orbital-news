/**
 * Complete mock for ArticleSchema module
 * This mock simulates both the mongoose Schema and the ArticleModel
 */

import { Article } from '../../types/models/article.type';

// Mock Schema class
class MockSchema {
  constructor(definition: any, options?: any) {
    return {
      ...definition,
      options: options || {},
      index: jest.fn().mockReturnThis(),
      pre: jest.fn().mockReturnThis(),
      post: jest.fn().mockReturnThis(),
      virtual: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    };
  }
}

// Create a mock for mongoose module that will be imported by ArticleSchema
const mockMongoose = {
  Schema: MockSchema,
  model: jest.fn().mockReturnValue({})
};

// Mock the mongoose module
jest.mock('mongoose', () => mockMongoose, { virtual: true });

// Create a mock ArticleModel
const ArticleModel = {
  findOne: jest.fn(),
  find: jest.fn().mockReturnValue({
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue([])
  }),
  countDocuments: jest.fn(),
  findOneAndUpdate: jest.fn(),
  create: jest.fn(),
  deleteMany: jest.fn(),
  save: jest.fn()
};

// Mock constructor for document instances
const MockArticleDocument = jest.fn().mockImplementation((data: Partial<Article>) => {
  return {
    ...data,
    _id: 'mock-id-' + Math.random().toString(36).substring(7),
    save: jest.fn().mockResolvedValue(data)
  };
});

// Add the constructor to the model
Object.assign(ArticleModel, {
  // This allows "new ArticleModel(data)" to work
  new: MockArticleDocument
});

export default ArticleModel;
