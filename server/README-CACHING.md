# MongoDB Caching for Orbital News

This document explains the MongoDB caching system implemented for the Orbital News server.

## Overview

The caching system stores processed Reddit articles in MongoDB to:

1. Reduce API calls to Reddit
2. Preserve location extraction results
3. Improve performance by serving cached content
4. Maintain a history of articles for the past week

## Local Development Setup

### Prerequisites

- Docker installed and running
- Node.js and pnpm

### Starting the Server with Caching

```bash
# Start MongoDB and the server
pnpm dev:mongo

# Start with file watching for development
pnpm dev:mongo:watch
```

If MongoDB isn't running, the server will:
1. Notify you that caching is disabled
2. Continue to function using API calls and on-demand location extraction
3. Provide instructions on how to enable caching

## Architecture

### Cache Service

The `CacheService` provides methods for:
- Storing articles in the cache
- Retrieving cached articles with flexible filtering
- Checking if today's articles are already cached
- Cleaning up expired cache entries

### MongoDB Integration

- **Connection Management**: The system checks if MongoDB is running locally and connects automatically
- **Collection Verification**: Verifies if the required collections exist
- **Graceful Degradation**: Falls back to API calls if MongoDB is unavailable
- **Automatic Initialization**: Connects to MongoDB when the server starts

### RedditService Integration

The `RedditService` now:
- Checks the cache before making API calls
- Stores fetched and processed articles in the cache
- Automatically refreshes the cache when needed
- Handles cache misses by falling back to the API

## Cached Data

Articles are cached with:
- All original article properties
- Extracted location information
- Cache metadata (fetchedAt, processedAt, cacheExpiry)

## Benefits

This caching system enhances the existing LocationService and GeocodingService by:

1. **Preserving Location Data**: Stores the results of location extraction and geocoding
2. **Reducing Processing Time**: Avoids repeated NLP processing for the same articles
3. **Improving Tier Determination**: Caches the tier assignments based on user location
4. **Supporting Offline Mode**: Allows the application to work with previously fetched data

## Troubleshooting

If you encounter issues with the caching system:

1. Ensure Docker is running: `docker info`
2. Check MongoDB container status: `docker ps | grep mongo`
3. Start MongoDB manually: `docker run -d -p 27017:27017 --name orbital-mongo mongo:6.0`
4. Verify MongoDB connection: `mongosh mongodb://localhost:27017/orbital_news`
