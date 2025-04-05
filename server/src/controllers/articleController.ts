import { Request, Response } from 'express';
import { NewsService } from '../services/newsService';

// Initialize the news service
const newsService = new NewsService();

// In-memory cache for articles
// In a production app, this would be stored in a database
let cachedArticles: any[] = [];

/**
 * Get all articles
 * @route GET /api/articles
 */
export const getArticles = async (req: Request, res: Response): Promise<void> => {
  try {
    const userZipCode = req.query.zipCode as string || '20001'; // Default to DC
    const query = req.query.query as string;
    
    // Use cached articles if available, otherwise fetch new ones
    if (cachedArticles.length === 0) {
      cachedArticles = await newsService.fetchAllArticles(userZipCode, query);
    }
    
    res.status(200).json({
      status: 'success',
      results: cachedArticles.length,
      data: {
        articles: cachedArticles
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
    
    // Ensure we have articles
    if (cachedArticles.length === 0) {
      const userZipCode = req.query.zipCode as string || '20001';
      cachedArticles = await newsService.fetchAllArticles(userZipCode);
    }
    
    const article = cachedArticles.find(article => article.id === id);

    if (!article) {
      res.status(404).json({
        status: 'fail',
        message: `No article found with ID: ${id}`
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: {
        article
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
 * Mark an article as read
 * @route PATCH /api/articles/:id/read
 */
export const markArticleAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const articleIndex = cachedArticles.findIndex(article => article.id === id);
    
    if (articleIndex === -1) {
      res.status(404).json({
        status: 'fail',
        message: `No article found with ID: ${id}`
      });
      return;
    }
    
    // Mark as read
    cachedArticles[articleIndex].read = true;
    
    res.status(200).json({
      status: 'success',
      data: {
        article: cachedArticles[articleIndex]
      }
    });
  } catch (error) {
    console.error('Error in markArticleAsRead:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update article'
    });
  }
};
