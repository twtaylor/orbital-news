/**
 * Jest setup file for MongoDB testing
 * This file automatically mocks mongoose for all tests
 * and sets up the test environment
 *
 * Console logging behavior:
 * - By default, all console logs are shown during tests for better debugging
 * - Set DISABLE_CONSOLE_LOGGING=1 to suppress console output (used by 'pnpm test')
 * - Use pnpm test:verbose to see all console logs
 */

// Store original console methods to restore them later
// IMPORTANT: This must be done before any other imports to ensure all console logs are captured
const originalConsoleLog = console.log;
const originalConsoleInfo = console.info;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;
const originalConsoleDebug = console.debug;

// Immediately suppress console output if DISABLE_CONSOLE_LOGGING is set
if (process.env.DISABLE_CONSOLE_LOGGING === '1') {
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
  console.debug = jest.fn();
}

// Now import other modules after console mocking is set up
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
  // Display logging status message only if not already suppressed
  if (process.env.DISABLE_CONSOLE_LOGGING !== '1') {
    originalConsoleLog('Console logging enabled for tests. Use pnpm test to disable logs.');
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
  console.debug = originalConsoleDebug;
});

// Export empty object to satisfy Jest's setup file requirements
export {};
