// No longer need to import determineTier as tier is calculated dynamically in the controller
import { Article } from '../types/models/article.type';
import { RedditService } from './redditService';
import { NewsAPIService } from './newsAPIService';

/**
 * NewsService handles fetching and processing articles from various data sources
 */
export class NewsService {
  private _redditService: RedditService;
  private _newsAPIService: NewsAPIService;
  
  constructor() {
    this._redditService = new RedditService();
    this._newsAPIService = new NewsAPIService();
  }
  
  /**
   * Fetch articles from Reddit
   * @param subreddit Optional subreddit to fetch from (default: 'news')
   * @param limit Optional number of articles to fetch (default: 50)
   * @param forceFetch Optional parameter to force fetching from API even if stored articles exist (default: false)
   * @returns Promise with array of articles
   */
  async fetchFromReddit(subreddit: string = 'news', limit: number = 50, forceFetch: boolean = false): Promise<Article[]> {
    console.log(`Fetching from Reddit subreddit: ${subreddit}, limit: ${limit}, forceFetch: ${forceFetch}`);
    return this._redditService.fetchArticles(subreddit, limit, 'day', true, forceFetch);
  }
  
  /**
   * Fetch articles from NewsAPI
   * @param limit Optional number of articles to fetch (default: 50)
   * @param forceFetch Optional parameter to force fetching from API even if stored articles exist (default: false)
   * @returns Promise with array of articles
   */
  async fetchFromNewsAPI(limit: number = 50, forceFetch: boolean = false): Promise<Article[]> {
    console.log(`Fetching from NewsAPI, limit: ${limit}, forceFetch: ${forceFetch}`);
    return this._newsAPIService.fetchArticles(limit, forceFetch);
  }
  
  /**
   * Get mock data for testing
   * @returns Array of mock articles
   */
  getMockArticles(): Article[] {
    return [
      {
        id: 'reddit-close',
        title: 'New Breakthrough in Quantum Computing',
        content: 'Researchers have achieved a significant breakthrough in quantum computing stability...',
        source: 'reddit',
        sourceUrl: 'https://reddit.com/r/science/123456',
        author: 'quantum_enthusiast',
        publishedAt: new Date().toISOString(),
        location: 'Cambridge, MA',
        tags: ['science', 'technology', 'quantum'],
        mass: 120000
      },
      {
        id: 'reddit-medium',
        title: 'SpaceX Successfully Launches New Satellite',
        content: 'SpaceX has successfully launched their newest satellite into orbit...',
        source: 'reddit',
        sourceUrl: 'https://reddit.com/r/space/789012',
        author: 'space_explorer',
        publishedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        location: 'Cape Canaveral, FL',
        tags: ['space', 'technology', 'spacex'],
        mass: 150000
      },
      {
        id: 'reddit-far',
        title: 'Newly Discovered Exoplanet Could Harbor Life',
        content: 'Astronomers have discovered a new exoplanet in the habitable zone of its star...',
        source: 'reddit',
        sourceUrl: 'https://reddit.com/r/astronomy/345678',
        author: 'exoplanet_hunter',
        publishedAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        location: 'Chile',
        tags: ['astronomy', 'exoplanet', 'science'],
        mass: 180000
      }
    ];
  }

  /**
   * Fetch articles from Twitter
   * @param query Optional search query
   * @returns Promise with array of articles (MOCK DATA)
   */
  async fetchFromTwitter(query?: string): Promise<Article[]> {
    // This is a placeholder implementation using MOCK DATA
    // In a real implementation, this would use the Twitter API
    console.debug(`[MOCK DATA] Fetching from Twitter with query: ${query || 'none'}`);
    
    // Mock data with articles at different orbital distances
    return [
      {
        id: 'twitter-close',
        title: 'Breaking: Major Tech Acquisition Announced',
        content: 'A major tech company has just announced the acquisition of a promising startup...',
        source: 'twitter',
        sourceUrl: 'https://twitter.com/techinsider/123456',
        author: '@techinsider',
        publishedAt: new Date().toISOString(),
        location: 'San Francisco, CA',
        tags: ['technology', 'business', 'acquisition'],
        mass: 100000
      },
      {
        id: 'twitter-medium',
        title: 'New AI Model Breaks All Previous Benchmarks',
        content: 'A research lab has released a new AI model that outperforms all previous benchmarks...',
        source: 'twitter',
        sourceUrl: 'https://twitter.com/ai_news/567890',
        author: '@ai_news',
        publishedAt: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
        location: 'Palo Alto, CA',
        tags: ['ai', 'technology', 'research'],
        mass: 130000
      },
      {
        id: 'twitter-far',
        title: 'Climate Report Shows Accelerating Changes',
        content: 'A new climate report indicates that global climate changes are accelerating faster than predicted...',
        source: 'twitter',
        sourceUrl: 'https://twitter.com/climate_news/901234',
        author: '@climate_news',
        publishedAt: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
        location: 'Geneva, Switzerland',
        tags: ['climate', 'environment', 'science'],
        mass: 160000
      }
    ];
  }

  /**
   * Fetch articles from Washington Post
   * @param query Optional search query
   * @returns Promise with array of articles (MOCK DATA)
   */
  async fetchFromWashingtonPost(query?: string): Promise<Article[]> {
    // This is a placeholder implementation using MOCK DATA
    // In a real implementation, this would use the Washington Post API
    console.debug(`[MOCK DATA] Fetching from Washington Post with query: ${query || 'none'}`);
    
    // Mock data with articles at different orbital distances
    return [
      {
        id: 'wapo-close',
        title: 'Political Analysis: New Policy Implications',
        content: 'The recently passed legislation will have far-reaching effects on industry regulations...',
        source: 'washington_post',
        sourceUrl: 'https://washingtonpost.com/politics/123456',
        author: 'Political Correspondent',
        publishedAt: new Date().toISOString(),
        location: 'Washington DC',
        tags: ['politics', 'policy', 'legislation'],
        mass: 150000
      },
      {
        id: 'wapo-medium',
        title: 'Economic Report: Inflation Trends Shifting',
        content: 'The latest economic indicators suggest a shift in inflation trends that could impact markets...',
        source: 'washington_post',
        sourceUrl: 'https://washingtonpost.com/business/234567',
        author: 'Economics Editor',
        publishedAt: new Date(Date.now() - 64800000).toISOString(), // 18 hours ago
        location: 'New York, NY',
        tags: ['economics', 'inflation', 'markets'],
        mass: 140000
      },
      {
        id: 'wapo-far',
        title: 'International Relations: Diplomatic Breakthrough',
        content: 'A diplomatic breakthrough has been achieved in long-standing international negotiations...',
        source: 'washington_post',
        sourceUrl: 'https://washingtonpost.com/world/345678',
        author: 'Foreign Affairs Correspondent',
        publishedAt: new Date(Date.now() - 345600000).toISOString(), // 4 days ago
        location: 'Brussels, Belgium',
        tags: ['international', 'diplomacy', 'politics'],
        mass: 170000
      }
    ];
  }
}
