import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { exec } from 'child_process';

dotenv.config();

// MongoDB connection URI from environment variables with fallback
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/orbital_news';

// Connection options
const options = {
  autoIndex: true,
  serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
};

/**
 * Check if MongoDB is running and accessible
 * @returns Promise that resolves to true if MongoDB is running, false otherwise
 */
const isMongoDBRunningLocally = async (): Promise<boolean> => {
  // In production, skip Docker check and just try to connect directly
  if (process.env.NODE_ENV === 'production') {
    return true; // Assume MongoDB is running in production
  }
  
  // In development, check if the MongoDB Docker container is running
  return new Promise((resolve) => {
    exec('docker ps | grep mongo', (error, stdout) => {
      if (error || !stdout) {
        console.warn('MongoDB container not detected. Is Docker running?');
        resolve(false);
      } else {
        console.log('MongoDB container detected');
        resolve(true);
      }
    });
  });
};

/**
 * Check if collections exist in the database
 * @returns Promise that resolves to true if collections exist, false otherwise
 */
export const checkCollectionsExist = async (): Promise<boolean> => {
  if (!isConnected()) {
    return false;
  }
  
  try {
    // Get all collections in the database
    const db = mongoose.connection.db;
    if (!db) {
      console.warn('⚠️ Database connection not fully established');
      return false;
    }
    
    const collections = await db.listCollections().toArray();
    
    // Check if the articles collection exists
    const articlesCollectionExists = collections.some(col => col.name === 'articles');
    
    if (articlesCollectionExists) {
      console.log('✅ Articles collection exists');
    } else {
      console.log('⚠️ Articles collection does not exist yet');
    }
    
    return articlesCollectionExists;
  } catch (error) {
    console.error('❌ Error checking collections:', error);
    return false;
  }
};

// Connect to MongoDB
export const connectToMongoDB = async (): Promise<void> => {
  try {
    // In development, check if MongoDB is running locally
    const isRunning = await isMongoDBRunningLocally();
    
    if (!isRunning) {
      throw new Error('MongoDB is not running. Please start MongoDB before starting the server.');
    }
    
    // Try to connect
    await mongoose.connect(MONGODB_URI, options);
    console.log('🔌 Connected to MongoDB at', MONGODB_URI);
    
    // Check if collections exist
    const collectionsExist = await checkCollectionsExist();
    if (!collectionsExist) {
      console.log('💾 Creating necessary collections for first-time use');
    }
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    // Rethrow the error to be handled by the caller
    throw error;
  }
};

// Disconnect from MongoDB
export const disconnectFromMongoDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ MongoDB disconnection error:', error);
  }
};

// Check connection status
export const isConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};

// Export the mongoose instance for use in other files
export default mongoose;
