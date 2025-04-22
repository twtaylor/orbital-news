/**
 * Worker thread for fetching articles from various sources
 * This runs in a separate thread to avoid blocking the main API server
 */
import { parentPort, workerData } from 'worker_threads';
import { NewsService } from '../services/newsService';
import ArticleStore from '../services/articleStore';
import { GeocodingService } from '../services/geocodingService';
import { Article } from '../types/models/article.type';
import MongoManager from '../database/MongoManager';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Send log messages back to the main thread
function log(text: string, level: 'log' | 'info' | 'warn' | 'error' | 'debug' = 'info') {
  if (parentPort) {
    parentPort.postMessage({ type: 'log', level, text });
  }
}

// Main worker function
async function runWorker() {
  log(`Article fetch worker started (fetch #${workerData.fetchCount})`, 'info');
  
  // Initialize services
  const newsService = new NewsService();
  const articleStore = new ArticleStore();
  const geocodingService = new GeocodingService();
  const defaultArticleLimit = workerData.defaultArticleLimit || 30;
  
  let totalArticles = 0;
  let storedCount = 0;
  
  try {
    // Connect to MongoDB
    log('Connecting to MongoDB...', 'info');
    await MongoManager.connect();
    log('Connected to MongoDB', 'info');
    
    // Fetch articles from Reddit (real data source)
    log('Fetching articles from Reddit...', 'info');
    const redditArticles = await fetchFromSource('reddit', newsService, articleStore, defaultArticleLimit);
    log(`Fetched ${redditArticles.length} articles from Reddit`, 'info');
    
    // Process and geocode the articles
    log('Processing and geocoding articles...', 'info');
    const processedArticles = await processArticles(redditArticles, geocodingService);
    log(`Processed ${processedArticles.length} articles with geocoding information`, 'info');
    
    // Only store articles from real sources (currently only Reddit)
    const articlesToStore = [...processedArticles];
    totalArticles = articlesToStore.length;
    
    // Fetch articles from other sources (these are currently mocked)
    // but don't store them in the database
    log('Fetching mock articles from other sources...', 'debug');
    const twitterArticles = await fetchFromSource('twitter', newsService, articleStore, defaultArticleLimit, false);
    const washingtonPostArticles = await fetchFromSource('washington_post', newsService, articleStore, defaultArticleLimit, false);
    log(`Fetched ${twitterArticles.length} mock Twitter articles and ${washingtonPostArticles.length} mock Washington Post articles`, 'debug');
    
    // Store articles in the database
    if (articlesToStore.length > 0) {
      log(`Storing ${articlesToStore.length} articles in the database...`, 'info');
      storedCount = await articleStore.storeArticles(articlesToStore);
      log(`Stored ${storedCount} articles in the database`, 'info');
    } else {
      log('No articles to store in the database', 'info');
    }
    
    // Disconnect from MongoDB
    log('Disconnecting from MongoDB...', 'debug');
    await MongoManager.disconnect();
    log('Disconnected from MongoDB', 'debug');
    
    // Send completion message to main thread
    if (parentPort) {
      parentPort.postMessage({ 
        type: 'complete', 
        totalArticles, 
        storedCount 
      });
    }
    
    log('Article fetch worker completed successfully', 'info');
  } catch (error) {
    log(`Error in article fetch worker: ${error}`, 'error');
    
    // Try to disconnect from MongoDB if there was an error
    try {
      await MongoManager.disconnect();
    } catch (disconnectError) {
      log(`Error disconnecting from MongoDB: ${disconnectError}`, 'error');
    }
    
    // Send error message to main thread
    if (parentPort) {
      parentPort.postMessage({ 
        type: 'error', 
        error: error instanceof Error ? error.message : String(error)
      });
    }
    
    process.exit(1);
  }
}

/**
 * Fetch articles from a specific source
 */
async function fetchFromSource(
  source: string, 
  newsService: NewsService, 
  articleStore: ArticleStore, 
  limit: number,
  checkForExisting: boolean = true
): Promise<Article[]> {
  try {
    log(`Fetching articles from ${source}...`, 'debug');
    
    // Check if we already have today's articles from this source (if requested)
    if (checkForExisting) {
      const hasTodaysArticles = await articleStore.hasTodaysArticles(source);
      
      if (hasTodaysArticles) {
        log(`Already have today's articles from ${source}, skipping fetch`, 'info');
        return [];
      }
    }
    
    let articles: Article[] = [];
    
    // Fetch articles based on source
    switch (source) {
      case 'reddit':
        articles = await newsService.fetchFromReddit('news', limit);
        break;
      case 'twitter':
        articles = await newsService.fetchFromTwitter();
        break;
      case 'washington_post':
        articles = await newsService.fetchFromWashingtonPost();
        break;
      default:
        log(`Unknown source: ${source}`, 'warn');
    }
    
    log(`Fetched ${articles.length} articles from ${source}`, 'debug');
    return articles;
  } catch (error) {
    log(`Error fetching articles from ${source}: ${error}`, 'error');
    return [];
  }
}

/**
 * Process articles with geocoding information
 */
async function processArticles(articles: Article[], geocodingService: GeocodingService): Promise<Article[]> {
  const processedArticles: Article[] = [];
  
  for (const article of articles) {
    try {
      // Skip articles without location information
      if (!article.location || typeof article.location === 'string') {
        log(`Skipping article without location information: ${article.id}`, 'debug');
        continue;
      }
      
      // Skip articles that already have geocoding information
      if (typeof article.location === 'object' && article.location.latitude && article.location.longitude) {
        processedArticles.push(article);
        continue;
      }
      
      // Get the location name from the article
      const locationName = typeof article.location === 'string' ? article.location : null;
      if (!locationName) {
        log(`Skipping article without location information: ${article.id}`, 'debug');
        continue;
      }
      
      // Geocode the location
      log(`Geocoding location: ${locationName}`, 'debug');
      const geocodedLocation = await geocodingService.geocodeLocation(locationName);
      
      if (geocodedLocation) {
        // Update the article with geocoded information
        article.location = {
          location: locationName,
          latitude: geocodedLocation.coordinates.latitude,
          longitude: geocodedLocation.coordinates.longitude,
          zipCode: geocodedLocation.zipCode
        };
        
        log(`Successfully geocoded location for article: ${article.id}`, 'debug');
        processedArticles.push(article);
      } else {
        log(`Failed to geocode location for article: ${article.id}`, 'warn');
        // Still include the article even without geocoding
        processedArticles.push(article);
      }
    } catch (error) {
      log(`Error processing article ${article.id}: ${error}`, 'error');
      // Still include the article even if there was an error
      processedArticles.push(article);
    }
  }
  
  return processedArticles;
}

// Start the worker
runWorker().catch(error => {
  log(`Unhandled error in worker: ${error}`, 'error');
  process.exit(1);
});
