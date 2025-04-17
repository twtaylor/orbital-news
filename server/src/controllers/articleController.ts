import { Request, Response } from 'express';
import ArticleStore from '../services/articleStore';
import { articleFetcher } from '../services/articleFetcherService';

// Initialize the article store
const articleStore = new ArticleStore();

/**
 * Get all articles
 * @route GET /api/articles
 */
export const getArticles = async (req: Request, res: Response): Promise<void> => {
  try {
    const source = req.query.source as string;
    const location = req.query.location as string;
    const tier = req.query.tier as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 30; // Default to 30 articles
    const daysBack = req.query.daysBack ? parseInt(req.query.daysBack as string) : 7; // Default to 7 days
    
    // Fetch articles from the database
    const articles = await articleStore.getArticles({
      source,
      location,
      tier,
      limit,
      daysBack
    });
    
    // If no articles found, trigger a fetch
    if (articles.length === 0) {
      console.log('No articles found in database, triggering fetch');
      // Don't await this to avoid blocking the response
      articleFetcher.fetchAndStoreArticles();
    }
    
    res.status(200).json({
      status: 'success',
      results: articles.length,
      data: {
        articles
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

    res.status(200).json({
      status: 'success',
      data: {
        article: articles[0]
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
    
    // Get the article from the database
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
    
    // Mark as read in the database
    const updatedArticle = await articleStore.markArticleAsRead(id);
    
    res.status(200).json({
      status: 'success',
      data: {
        article: updatedArticle
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
