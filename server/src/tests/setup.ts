import dotenv from 'dotenv';

// Load environment variables for tests
dotenv.config();

// Set test-specific environment variables
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/orbital_news_test';

// Export empty object to satisfy Jest's setup file requirements
export {};
