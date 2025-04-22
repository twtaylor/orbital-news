import { Article } from '../types/models/article.type';
import articleModel from '../models/ArticleSchema';
import mongoManager from '../database/MongoManager';
import { GeocodingService } from './geocodingService';

/**
 * Service for storing and retrieving articles from MongoDB
 */
export class ArticleStore {
  private geocodingService: GeocodingService;
  
  constructor() {
    this.geocodingService = new GeocodingService();
  }
  /**
   * Store articles in the database
   * @param articles Articles to store
   * @returns Number of articles successfully stored
   */
  async storeArticles(articles: Article[]): Promise<number> {
    if (!mongoManager.isConnected()) {
      console.warn('MongoDB not connected, skipping article storage');
      return 0;
    }

    try {
      let savedCount = 0;
      let duplicateCount = 0;
      
      // Process each article
      for (const article of articles) {
        // Check if article already exists by ID or URL
        const existingArticle = await articleModel.findOne({ 
          $or: [
            { articleId: article.id },
            { sourceUrl: article.sourceUrl }
          ]
        });
        
        if (existingArticle) {
          // Skip update if the article was fetched recently (within the last 24 hours)
          const lastFetchTime = new Date(existingArticle.fetchedAt);
          const hoursSinceLastFetch = (Date.now() - lastFetchTime.getTime()) / (1000 * 60 * 60);
          
          if (hoursSinceLastFetch < 24) {
            duplicateCount++;
            continue;
          }
          
          // Update existing article with new data if it's older than 24 hours
          existingArticle.title = article.title;
          existingArticle.content = article.content;
          existingArticle.location = article.location;
          existingArticle.mass = article.mass;
          existingArticle.fetchedAt = new Date();
          
          await existingArticle.save();
          savedCount++;
        } else {
          // Create new article document
          const newArticle = new articleModel({
            articleId: article.id, // Map id to articleId for MongoDB
            title: article.title,
            content: article.content,
            source: article.source,
            sourceUrl: article.sourceUrl,
            author: article.author,
            publishedAt: article.publishedAt,
            location: article.location,
            tags: article.tags,
            mass: article.mass,
            fetchedAt: new Date()
          });
          
          await newArticle.save();
          savedCount++;
        }
      }
      
      console.log(`Stored ${savedCount} articles successfully (skipped ${duplicateCount} recent duplicates)`);
      return savedCount;
    } catch (error) {
      console.error('Error storing articles:', error);
      return 0;
    }
  }

  /**
   * Retrieve articles from the database
   * @param options Options for retrieving articles
   * @returns Array of articles
   */
  async getArticles(options: {
    source?: string;
    location?: string;
    limit?: number;
    daysBack?: number;
    articleId?: string; // Added articleId parameter
  } = {}): Promise<Article[]> {
    if (!mongoManager.isConnected()) {
      console.warn('MongoDB not connected, returning empty results');
      return [];
    }

    try {
      const { source, location, limit = 100, daysBack = 7 } = options;
      
      // Build query
      const query: any = {};
      
      if (source) query.source = source;
      
      // Handle location query - could be string or object with zipCode
      if (location) {
        // If searching for a specific location, we need to handle both string and object formats
        query.$or = [
          { location: location }, // Match exact string
          { 'location.city': location }, // Match city in object
          { 'location.state': location }, // Match state in object
          { 'location.country': location }, // Match country in object
          { 'location.zipCode': location } // Match zipCode in object
        ];
      }
      
      // Tier is no longer stored in the database, so we don't query by it
      if (options.articleId) query.articleId = options.articleId; // Added articleId to query
      
      // Filter by date range if specified
      if (daysBack > 0) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysBack);
        
        query.publishedAt = { 
          $gte: startDate.toISOString() 
        };
      }
      
      // Execute query
      const storedArticles = await articleModel.find(query)
        .sort({ publishedAt: -1 })
        .limit(limit)
        .lean();
      
      // Map MongoDB documents back to Article interface
      const articles = storedArticles.map(doc => {
        // Cast the document to any to access the articleId field
        const docAny = doc as any;
        
        return {
          id: docAny.articleId, // Map articleId back to id
          title: docAny.title,
          content: docAny.content,
          source: docAny.source,
          sourceUrl: docAny.sourceUrl,
          author: docAny.author,
          publishedAt: docAny.publishedAt,
          location: docAny.location, // This could be string or ArticleLocation object
          tags: docAny.tags,
          mass: docAny.mass
          // tier removed - will be calculated dynamically, not stored
        };
      });
      
      console.log(`Retrieved ${articles.length} articles from database`);
      return articles;
    } catch (error) {
      console.error('Error retrieving articles:', error);
      return [];
    }
  }

  /**
   * Get the count of articles fetched today from a specific source
   * @param source Source to check for
   * @returns Number of articles fetched today
   */
  async getTodaysArticleCount(source: string): Promise<number> {
    if (!mongoManager.isConnected()) {
      return 0;
    }

    try {
      // Get start of today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Build query
      const query: any = {
        fetchedAt: { $gte: today },
        source
      };
      
      // Get count of articles fetched today
      const count = await articleModel.countDocuments(query);
      return count;
    } catch (error) {
      console.error('Error counting today\'s articles:', error);
      return 0;
    }
  }

  /**
   * Get the latest articles from the last 7 days
   * @param limit Maximum number of articles to return
   * @returns Array of articles from the last 7 days
   */
  async getLastWeekArticles(limit: number = 100): Promise<Article[]> {
    return this.getArticles({
      daysBack: 7,
      limit
    });
  }

  // markArticleAsRead method removed as we no longer track read status
}

export default ArticleStore;
