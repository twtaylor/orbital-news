# Orbital News Development Guide

This document provides development guidelines and technical details for the Orbital News application.

## Table of Contents
- [MongoDB Article Storage](#mongodb-article-storage)
- [Local Development Setup](#local-development-setup)
- [Architecture](#architecture)
- [Services](#services)
- [Troubleshooting](#troubleshooting)

## MongoDB Article Storage

The Orbital News server uses MongoDB to store Reddit articles, including extracted locations and geocoding results. This significantly improves performance and reduces API calls.

### Benefits

- **Reduced API Calls**: Minimizes calls to the Reddit API
- **Faster Response Times**: Serves stored content instead of processing data on each request
- **Preserved Location Data**: Stores the results of NLP-based location extraction
- **Geocoding Efficiency**: Avoids repeated geocoding API calls for the same locations
- **Tier Preservation**: Maintains article tier assignments based on user location
- **Offline Development**: Allows development without constant API access

### Storage Strategy

Articles are stored with the following metadata:
- `fetchedAt`: When the article was retrieved from the API
- `createdAt`: When the article was first stored in the database
- `updatedAt`: When the article was last updated

The system automatically checks for new articles:
- Looks for articles from the current day
- Fetches new articles if none exist for today
- Stores the last 7 days of articles for historical access

## Local Development Setup

### Prerequisites

- Docker installed and running
- Node.js and pnpm

### Development Workflow

The development workflow has been separated into distinct steps for better flexibility:

#### 1. Start MongoDB (if needed)

```bash
# Start the MongoDB container (creates it if it doesn't exist)
pnpm mongo:start
```

#### 2. Check MongoDB Status

```bash
# Verify MongoDB is running and properly configured
pnpm mongo:status
```

#### 3. Start the Development Server

```bash
# Build and start the server
pnpm dev

# Or with file watching for auto-reload
pnpm dev:watch
```

#### Alternative: Using Docker Directly

```bash
# Start MongoDB container
docker run -d -p 27017:27017 --name orbital-mongo mongo:6.0

# If the container already exists but is stopped
docker start orbital-mongo
```

### Environment Variables

The MongoDB connection uses the following environment variables:

```
# MongoDB connection string
MONGODB_URI=mongodb://localhost:27017/orbital_news

# Set to 'true' to require MongoDB for server startup
STRICT_MONGO=false
```

If not specified, the MongoDB URI defaults to the local development URL.

### MongoDB Requirement

MongoDB is now a strict requirement for running the Orbital News server. This ensures:

1. **Consistent Caching**: All article data is properly cached, reducing API calls
2. **Reliable Location Processing**: Location extraction results are preserved
3. **Predictable Performance**: The application always operates with optimal performance

If MongoDB is not available when starting the server, it will exit with an error message directing you to start MongoDB.

```bash
# Start MongoDB before running the server
pnpm mongo:start

# Check MongoDB status
pnpm mongo:status

# Then start the server
pnpm dev
```

This approach ensures that the server always operates with full caching capabilities and prevents excessive API calls.

## Architecture

### Database Module

The `mongodb.ts` module provides:

- Connection management with automatic reconnection
- Startup verification of MongoDB availability
- Collection existence checks
- Connection status reporting

```typescript
// Example: Checking if MongoDB is connected
import { isConnected } from '../database/mongodb';

if (isConnected()) {
  // MongoDB operations
} else {
  // Fallback behavior
}
```

### Article Schema

The MongoDB schema for articles extends the application's Article interface:

```typescript
// Fields added for caching
fetchedAt: Date;      // When the article was fetched from the API
processedAt: Date;    // When the article was processed
cacheExpiry: Date;    // When the cache entry expires
```

## Services

### ArticleStore

The `ArticleStore` manages article storage with methods for:

```typescript
// Store articles in the database
storeArticles(articles: Article[]): Promise<number>

// Retrieve articles with flexible filtering
getArticles(options: {
  source?: string;
  location?: string;
  tier?: string;
  limit?: number;
  daysBack?: number;
}): Promise<Article[]>

// Check if today's articles are available
hasTodaysArticles(source: string): Promise<boolean>

// Get articles from the last week
getLastWeekArticles(limit?: number): Promise<Article[]>
```

### Integration with LocationService

The LocationService extracts geographic locations from article content using NLP. The storage system preserves these extracted locations, avoiding repeated processing of the same content.

```typescript
// Example flow with storage
1. Check database for articles
2. If found, return articles with pre-extracted locations
3. If not found, extract locations and store in database
```

### Integration with GeocodingService

The GeocodingService converts location names to coordinates and calculates distances. Storing these results reduces geocoding API calls and improves performance.

```typescript
// Example flow with storage
1. Check database for articles with geocoded locations
2. If found, return articles with pre-calculated tiers
3. If not found, perform geocoding and store in database
```

## Troubleshooting

### MongoDB Connection Issues

If the server cannot connect to MongoDB:

1. Check if Docker is running: `docker info`
2. Verify the MongoDB container status: `docker ps | grep mongo`
3. Start MongoDB manually if needed: `docker start orbital-mongo`
4. Check MongoDB logs: `docker logs orbital-mongo`

### Storage Not Working

If articles are not being stored:

1. Verify MongoDB connection in server logs
2. Check for errors in the ArticleStore
3. Ensure the MongoDB URI is correct
4. Verify that collections exist in the database

### Retrieving Historical Articles

To access historical articles:

1. Use the `getLastWeekArticles()` method in ArticleStore
2. Query with specific date ranges using the `daysBack` parameter
3. Use MongoDB commands directly for more advanced queries
