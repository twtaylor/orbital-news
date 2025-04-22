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

// Suppress console output during tests to reduce noise
const originalConsoleLog = console.log;
const originalConsoleInfo = console.info;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

// Set up global test environment
beforeAll(() => {
  // Suppress console output unless DEBUG_TESTS is set
  if (!process.env.DEBUG_TESTS) {
    console.log = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  } else {
    console.log('Test environment initialized with mongoose mocks');
  }
});

afterAll(() => {
  // Clean up after all tests
  jest.clearAllMocks();
  
  // Restore console functions
  console.log = originalConsoleLog;
  console.info = originalConsoleInfo;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

// Export empty object to satisfy Jest's setup file requirements
export {};
