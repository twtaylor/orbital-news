/**
 * Jest setup file for MongoDB testing
 * This file automatically mocks mongoose for all tests
 * and sets up the test environment
 */

import dotenv from 'dotenv';
import mongooseMock from '../mocks/mongooseMock';

// Load environment variables for tests
dotenv.config();

// Set test-specific environment variables
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/orbital_news_test';

// Mock geocoding environment variables for tests
process.env.GEOCODING_PROVIDER = 'test_provider';
process.env.GEOCODING_API_KEY = 'test_api_key';

// Mock mongoose module
jest.mock('mongoose', () => mongooseMock);

// Set up global test environment
beforeAll(() => {
  // Any global setup needed before all tests
  console.log('Test environment initialized with mongoose mocks');
});

afterAll(() => {
  // Clean up after all tests
  jest.clearAllMocks();
});

// Export empty object to satisfy Jest's setup file requirements
export {};
