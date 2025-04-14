import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { exec } from 'child_process';

dotenv.config();

/**
 * MongoDB connection manager class
 * Handles connection to MongoDB, status checking, and disconnection
 */
export class MongoManager {
  private static instance: MongoManager;
  private isInitialized: boolean = false;
  private connectionPromise: Promise<void> | null = null;

  // MongoDB connection URI from environment variables with fallback
  private uri: string = process.env.MONGODB_URI || 'mongodb://localhost:27017/orbital_news';
  
  // Connection options
  private options = {
    autoIndex: true,
    serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  };

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}

  /**
   * Get the singleton instance of MongoManager
   * @returns MongoManager instance
   */
  public static getInstance(): MongoManager {
    if (!MongoManager.instance) {
      MongoManager.instance = new MongoManager();
    }
    return MongoManager.instance;
  }

  /**
   * Check if MongoDB is running locally using the docker ps command
   * @returns Promise that resolves to true if MongoDB is running, false otherwise
   */
  private async isMongoDBRunningLocally(): Promise<boolean> {
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
  }

  /**
   * Check if collections exist in the database
   * @returns Promise that resolves to true if collections exist, false otherwise
   */
  public async checkCollectionsExist(): Promise<boolean> {
    if (!this.isConnected()) {
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
        console.log('⚠️ Articles collection does not exist yet, it will be created when needed');
      }
      
      return articlesCollectionExists;
    } catch (error) {
      console.error('❌ Error checking collections:', error);
      return false;
    }
  }

  /**
   * Connect to MongoDB
   * @returns Promise that resolves when connected
   */
  public async connect(): Promise<void> {
    // Return existing connection promise if it exists
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // Create a new connection promise
    this.connectionPromise = new Promise<void>(async (resolve, reject) => {
      try {
        // Check if MongoDB is running locally
        const isRunning = await this.isMongoDBRunningLocally();
        
        if (!isRunning) {
          throw new Error('MongoDB is not running. Please start MongoDB before starting the server.');
        }
        
        // Try to connect
        await mongoose.connect(this.uri, this.options);
        console.log('🔌 Connected to MongoDB at', this.uri);
        
        // Check if collections exist
        const collectionsExist = await this.checkCollectionsExist();
        if (!collectionsExist) {
          console.log('💾 Collections will be created as needed');
        }

        this.isInitialized = true;
        resolve();
      } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        this.connectionPromise = null;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  /**
   * Disconnect from MongoDB
   * @returns Promise that resolves when disconnected
   */
  public async disconnect(): Promise<void> {
    try {
      await mongoose.disconnect();
      console.log('🔌 Disconnected from MongoDB');
      this.isInitialized = false;
      this.connectionPromise = null;
    } catch (error) {
      console.error('❌ MongoDB disconnection error:', error);
      throw error;
    }
  }

  /**
   * Check if connected to MongoDB
   * @returns True if connected, false otherwise
   */
  public isConnected(): boolean {
    return mongoose.connection.readyState === 1;
  }

  /**
   * Get the mongoose instance
   * @returns Mongoose instance
   */
  public getMongoose(): typeof mongoose {
    return mongoose;
  }
}

// Export a default instance
export default MongoManager.getInstance();
