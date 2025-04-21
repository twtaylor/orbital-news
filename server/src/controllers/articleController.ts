import { Request, Response } from 'express';
import ArticleStore from '../services/articleStore';
import { articleFetcher } from '../services/articleFetcherService';
import { GeocodingService } from '../services/geocodingService';
import { Article, ArticleWithTier, TierType } from '../types/models/article.type';

// Initialize the article store and geocoding service
const articleStore = new ArticleStore();
const geocodingService = new GeocodingService();

/**
 * Get all articles
 * @route GET /api/articles
 */
export const getArticles = async (req: Request, res: Response): Promise<void> => {
  try {
    const source = req.query.source as string;
    const location = req.query.location as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 30; // Default to 30 articles
    const daysBack = req.query.daysBack ? parseInt(req.query.daysBack as string) : 7; // Default to 7 days
    const userZipCode = req.query.userZipCode as string; // User's zip code for distance calculation
    
    // Fetch articles from the database
    const articles = await articleStore.getArticles({
      source,
      location,
      limit,
      daysBack
    });
    
    // If no articles found, trigger a fetch
    if (articles.length === 0) {
      console.log('No articles found in database, triggering fetch');
      // Don't await this to avoid blocking the response
      articleFetcher.fetchAndStoreArticles();
    }
    
    // Add tier information to articles for API response
    // If user provided a zip code, set it in the geocoding service
    if (userZipCode) {
      await geocodingService.setUserLocationByZipCode(userZipCode);
    }
    
    const articlesWithTierPromises = articles.map(article => addTierToArticle(article));
    const articlesWithTier = await Promise.all(articlesWithTierPromises);
    
    res.status(200).json({
      status: 'success',
      results: articlesWithTier.length,
      data: {
        articles: articlesWithTier
      }
    });
  } catch (error) {
    console.error('Error in getArticles:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch articles'
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
    const articles = await articleStore.getArticles({
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
    const articleWithTier = await addTierToArticle(articles[0]);
    
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

// markArticleAsRead controller method removed as we no longer track read status

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
    console.error('Error in getArticleFetcherStatus:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get article fetcher status'
    });
  }
};

/**
 * Trigger article fetch manually
 * @route POST /api/articles/fetcher/fetch
 */
/**
 * Add tier information to an article for API responses
 * This calculates the tier dynamically based on the article's properties
 * @param article The article to add tier to
 * @returns Promise with Article with tier information
 */
const addTierToArticle = async (article: Article): Promise<ArticleWithTier> => {
  let tier: TierType = 'medium'; // Default tier
  
  try {
    // Calculate tier based on location if possible
    if (typeof article.location === 'object' && article.location.zipCode) {
      // If we have coordinates, use distance-based tier calculation
      if (article.location.lat && article.location.lng) {
        const userLocation = geocodingService.getUserLocation();
        const distance = geocodingService.calculateDistance(
          userLocation,
          { latitude: article.location.lat, longitude: article.location.lng }
        );
        
        // Convert to kilometers
        const distanceInKm = distance / 1000;
        tier = geocodingService.determineTierFromDistance(distanceInKm);
      } else if (article.location.zipCode) {
        // Try to calculate tier based on zipCode
        try {
          // If we have a zip code, use it directly
          const distanceResult = await geocodingService.calculateDistanceBetweenZipCodes(
            geocodingService.getDefaultUserZipCode(),
            article.location.zipCode
          );
          
          if (distanceResult && distanceResult.tier) {
            tier = distanceResult.tier;
          }
        } catch (error) {
          console.warn(`Failed to calculate tier for article ${article.id}: ${error}`);
          // Fall back to mass-based tier calculation
          tier = calculateTierFromMass(article.mass);
        }
      }
    } else {
      // Fall back to mass-based tier calculation
      tier = calculateTierFromMass(article.mass);
    }
  } catch (error) {
    console.warn(`Error calculating tier for article ${article.id}: ${error}`);
    // Fall back to mass-based tier calculation
    tier = calculateTierFromMass(article.mass);
  }
  
  // Return the article with tier information
  return {
    ...article,
    tier
  };
};

/**
 * Calculate tier based on article mass
 * @param mass Article mass
 * @returns Tier type
 */
const calculateTierFromMass = (mass: number): TierType => {
  if (mass > 200000) {
    return 'close';
  } else if (mass > 100000) {
    return 'medium';
  } else {
    return 'far';
  }
};

export const triggerArticleFetch = async (req: Request, res: Response): Promise<void> => {
  try {
    // Trigger article fetch in the background
    articleFetcher.fetchAndStoreArticles()
      .then(() => console.log('Manual article fetch completed'))
      .catch(err => console.error('Error during manual article fetch:', err));
    
    res.status(202).json({
      status: 'success',
      message: 'Article fetch triggered',
      data: articleFetcher.getStatus()
    });
  } catch (error) {
    console.error('Error in triggerArticleFetch:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to trigger article fetch'
    });
  }
};
