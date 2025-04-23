import { Request, Response } from 'express';
import articleStore from '../services/articleStore';
import { articleFetcher } from '../services/articleFetcherService';
import { GeocodingService } from '../services/geocodingService';
import { addTierToArticle } from './articleController.helpers';

// Initialize services
const articleStoreInstance = new articleStore();
const geocodingService = new GeocodingService();

/**
 * Get all articles with tier information based on user location
 * @route GET /api/articles
 */
export const getArticles = async (req: Request, res: Response): Promise<void> => {
  try {
    const source = req.query.source as string;
    const location = req.query.location as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50; // Default to 50 articles
    const daysBack = req.query.daysBack ? parseInt(req.query.daysBack as string) : 7; // Default to 7 days
    
    // Accept both zipCode and userZipCode parameters for compatibility
    const userZipCode = (req.query.userZipCode || req.query.zipCode) as string; // User's zip code for distance calculation
    
    // Fetch articles from the database only - no fetching from external APIs
    const articles = await articleStoreInstance.getArticles({
      source,
      location,
      limit,
      daysBack
    });
    
    // Log article count for monitoring
    console.log(`Retrieved ${articles.length} articles from database`);
    
    // Add tier information to articles for API response
    // If user provided a zip code, set it in the geocoding service
    if (userZipCode) {
      const success = await geocodingService.setUserLocationByZipCode(userZipCode);
      if (success) {
        console.log(`User location set to ZIP code: ${userZipCode}`);
        // Log the actual user coordinates for debugging
        const userLocation = geocodingService.getUserLocation();
        console.log(`User coordinates: ${JSON.stringify(userLocation)}`);
      } else {
        console.warn(`Failed to set user location for ZIP code: ${userZipCode}`);
      }
    }
    
    console.log('Calculating article tiers based on user location...');
    const articlesWithTierPromises = articles.map(article => addTierToArticle(article, geocodingService));
    const articlesWithTier = await Promise.all(articlesWithTierPromises);
    
    // Log the number of articles retrieved
    console.log(`Retrieved and processed ${articlesWithTier.length} articles with tier information`);
    
    res.status(200).json({
      status: 'success',
      results: articlesWithTier.length,
      data: {
        articles: articlesWithTier
      }
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch articles',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get article by ID
 * @route GET /api/articles/:id
 */
export const getArticleById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Fetch articles from the database with a filter for the ID
    const articles = await articleStoreInstance.getArticles({
      articleId: id,
      limit: 1
    });
    
    if (articles.length === 0) {
      res.status(404).json({
        status: 'fail',
        message: `No article found with ID: ${id}`
      });
      return;
    }

    // Get user zip code from query params
    const userZipCode = req.query.userZipCode as string;
    
    // If user provided a zip code, set it in the geocoding service
    if (userZipCode) {
      await geocodingService.setUserLocationByZipCode(userZipCode);
    }
    
    // Add tier information to the article for API response
    const articleWithTier = await addTierToArticle(articles[0], geocodingService);
    
    res.status(200).json({
      status: 'success',
      data: {
        article: articleWithTier
      }
    });
  } catch (error) {
    console.error('Error in getArticleById:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch article'
    });
  }
};

/**
 * Get article fetcher status
 * @route GET /api/articles/fetcher/status
 */
export const getArticleFetcherStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const status = articleFetcher.getStatus();
    
    res.status(200).json({
      status: 'success',
      data: status
    });
  } catch (error) {
    console.error('Error getting article fetcher status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get article fetcher status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Trigger an article fetch manually
 * @route POST /api/articles/fetcher/fetch
 */
export const triggerArticleFetch = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if a fetch is already in progress
    const status = articleFetcher.getStatus() as any;
    
    if (status.isRunning) {
      res.status(409).json({
        status: 'conflict',
        message: 'Article fetch already in progress',
        data: status
      });
      return;
    }
    
    // Start the article fetch in the background using the worker thread
    articleFetcher.fetchAndStoreArticles();
    
    res.status(200).json({
      status: 'success',
      message: 'Article fetch triggered in worker thread',
      data: articleFetcher.getStatus()
    });
  } catch (error) {
    console.error('Error triggering article fetch:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to trigger article fetch',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
