import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import routes from './routes';
import { globalErrorHandler } from './utils/errorHandler';
import mongoManager from './database/MongoManager';
import { articleFetcher } from './services/articleFetcherService';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic route for testing
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Orbital News API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api', routes);

// Handle 404 errors
app.all('*', (req: Request, res: Response, _next: NextFunction) => {
  res.status(404).json({
    status: 'fail',
    message: `Can't find ${req.originalUrl} on this server!`
  });
});

// Global error handling middleware
app.use(globalErrorHandler);

// Function to start the server
const startServer = (): ReturnType<typeof app.listen> => {
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 API available at http://localhost:${PORT}/api`);
  });

  // Return server instance for graceful shutdown
  return server;
};

// Connect to MongoDB and start server
console.log('🔌 Connecting to MongoDB...');
mongoManager.connect()
  .then(() => {
    console.log('💾 MongoDB connection initialized');
    console.log('🔄 Article storage enabled for improved performance');
    
    // Initialize the article fetcher service
    console.log('🔄 Starting article fetcher service...');
    articleFetcher.start('0 * * * *'); // Run every hour
    console.log('✅ Article fetcher service started');
    
    // Start the server after successful MongoDB connection
    const server = startServer();
    
    // Handle graceful shutdown
    process.on('uncaughtException', (_err) => {
      console.log('SIGTERM received, shutting down gracefully');
      
      // Stop the article fetcher
      articleFetcher.stop();
      console.log('Article fetcher stopped');
      
      server.close(() => {
        console.log('Server closed');
        mongoManager.disconnect()
          .then(() => {
            console.log('MongoDB disconnected');
            process.exit(0);
          })
          .catch(() => process.exit(1));
      });
    });
  })
  .catch((_err: Error) => {
    console.error('❌ MongoDB connection failed');
    console.error('🚫 Server startup aborted - MongoDB is required');
    console.log('💡 Start MongoDB with `pnpm mongo:start` and try again');
    console.log('💡 Run `pnpm mongo:status` to check MongoDB status');
    process.exit(1);
  });

// SIGTERM handlers are now defined in the MongoDB connection promise chains above

export default app;
