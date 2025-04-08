import * as https from 'https';
import { Article, TierType } from '../models/Article';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Service for fetching articles from Reddit
 */
export class RedditService {
  private clientId: string;
  private clientSecret: string;
  private userAgent: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.clientId = process.env.REDDIT_CLIENT_ID || '';
    this.clientSecret = process.env.REDDIT_CLIENT_SECRET || '';
    this.userAgent = 'OrbitalNews/1.0';
    
    if (!this.clientId || !this.clientSecret) {
      console.warn('Reddit API credentials not found in environment variables');
    }
  }

  /**
   * Get an OAuth access token for the Reddit API
   * @returns Access token
   */
  private getAccessToken(): Promise<string> {
    return new Promise((resolve, reject) => {
      // Return existing token if it's still valid
      if (this.accessToken && Date.now() < this.tokenExpiry) {
        return resolve(this.accessToken);
      }
      
      // If credentials are missing, use mock data
      if (!this.clientId || !this.clientSecret) {
        console.warn('Reddit API credentials not found');
        return reject(new Error('Reddit API credentials not found'));
      }

      // Create auth string for Basic Auth
      const authString = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const options = {
        hostname: 'www.reddit.com',
        path: '/api/v1/access_token',
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': this.userAgent
        }
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const parsedData = JSON.parse(data);
            this.accessToken = parsedData.access_token;
            // Set expiry time (typically 1 hour for Reddit tokens)
            this.tokenExpiry = Date.now() + (parsedData.expires_in * 1000);
            resolve(this.accessToken || '');
          } catch (error) {
            reject(error);
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.write('grant_type=client_credentials');
      req.end();
    });
  }

  /**
   * Fetch articles from Reddit
   * @param subreddit Subreddit to fetch from (default: 'news')
   * @param limit Number of articles to fetch (default: 10)
   * @param timeframe Time frame for posts (default: 'day')
   * @returns Promise with array of articles
   */
  fetchArticles(subreddit: string = 'news', limit: number = 10, timeframe: string = 'day'): Promise<Article[]> {
    return new Promise((resolve) => {
      // Use mock data if credentials aren't available
      if (!this.clientId || !this.clientSecret) {
        console.log('Using mock Reddit data (no API credentials)');
        return resolve(this.getMockArticles());
      }

      this.getAccessToken()
        .then((token) => {
          const options = {
            hostname: 'oauth.reddit.com',
            path: `/r/${subreddit}/top.json?limit=${limit}&t=${timeframe}`,
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'User-Agent': this.userAgent
            }
          };
          
          const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
              data += chunk;
            });
            
            res.on('end', () => {
              try {
                console.log('Reddit response:', data);
                const parsedData = JSON.parse(data);
                // Transform Reddit posts into our Article format
                const articles = parsedData.data.children.map((post: any) => 
                  this.transformRedditPost(post.data)
                );
                resolve(articles);
              } catch (error) {
                console.error('Error parsing Reddit data:', error);
                resolve([]);
              }
            });
          });
          
          req.on('error', (error) => {
            console.error('Error fetching from Reddit:', error);
            resolve([]);
          });
          
          req.end();
        })
        .catch((error) => {
          console.error('Error getting access token:', error);
          resolve([]);
        });
    });
  }

  /**
   * Transform a Reddit post into our Article format
   * @param post Reddit post data
   * @returns Article object
   */
  private transformRedditPost(post: any): Article {
    // Calculate a "mass" based on score and number of comments
    const mass = (post.score + (post.num_comments * 2)) * 1000;
    const cappedMass = Math.max(10000, Math.min(500000, mass)); // Limit mass between 10k and 500k
    
    // Determine tier based on mass
    const tier = this.determineTierFromMass(cappedMass);
    
    // Extract location from post flair or default to "Global"
    const location = post.link_flair_text || "Global";
    
    return {
      id: `reddit-${post.id}`,
      title: post.title,
      content: post.selftext || post.url,
      source: 'reddit',
      sourceUrl: `https://reddit.com${post.permalink}`,
      author: post.author,
      publishedAt: new Date(post.created_utc * 1000).toISOString(),
      location,
      mass: cappedMass,
      tier,
      read: false
    };
  }

  /**
   * Get mock Reddit articles for testing or when API is unavailable
   * @returns Array of mock articles
   */
  private getMockArticles(): Article[] {
    return [
      {
        id: 'reddit-mock1',
        title: 'Breaking News: Major Scientific Discovery',
        content: 'Scientists have made a groundbreaking discovery that could change our understanding of the universe...',
        source: 'reddit',
        sourceUrl: 'https://reddit.com/r/science/mock1',
        author: 'science_enthusiast',
        publishedAt: new Date().toISOString(),
        location: 'Cambridge, MA',
        mass: 120000,
        tier: 'close',
        read: false
      },
      {
        id: 'reddit-mock2',
        title: 'New Technology Breakthrough Announced',
        content: 'A major tech company has announced a revolutionary new product...',
        source: 'reddit',
        sourceUrl: 'https://reddit.com/r/technology/mock2',
        author: 'tech_news',
        publishedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        location: 'San Francisco, CA',
        mass: 180000,
        tier: 'medium',
        read: false
      },
      {
        id: 'reddit-mock3',
        title: 'Global Economic Report Shows Surprising Trends',
        content: 'The latest economic report reveals unexpected patterns in global markets...',
        source: 'reddit',
        sourceUrl: 'https://reddit.com/r/economics/mock3',
        author: 'market_analyst',
        publishedAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        location: 'Global',
        mass: 250000,
        tier: 'far',
        read: false
      }
    ];
  }
  
  /**
   * Determine tier based on article mass
   * @param mass Article mass
   * @returns Tier type (close, medium, far)
   */
  private determineTierFromMass(mass: number): TierType {
    if (mass > 200000) {
      return 'close';
    } else if (mass > 100000) {
      return 'medium';
    } else {
      return 'far';
    }
  }
}
