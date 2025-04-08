import { Article, Position } from '../models/Article';

/**
 * NewsService handles fetching and processing articles from various data sources
 */
export class NewsService {
  /**
   * Fetch articles from Reddit
   * @param query Optional search query
   * @returns Promise with array of articles
   */
  async fetchFromReddit(query?: string): Promise<Article[]> {
    // This is a placeholder implementation
    // In a real implementation, this would use the Reddit API
    console.log(`Fetching from Reddit with query: ${query || 'none'}`);
    
    // Mock data with articles at different orbital distances
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
        mass: 120000,
        position: { x: 10 * Math.cos(0), y: 0.1, z: 10 * Math.sin(0) }, // Close orbit (5 units)
        read: false
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
        mass: 150000,
        position: { x: 20 * Math.cos(2), y: -0.2, z: 20 * Math.sin(2) }, // Medium orbit (10 units)
        read: false
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
        mass: 180000,
        position: { x: 30 * Math.cos(4), y: 0.3, z: 30 * Math.sin(4) }, // Far orbit (30 units)
        read: false
      }
    ];
  }

  /**
   * Fetch articles from Twitter
   * @param query Optional search query
   * @returns Promise with array of articles
   */
  async fetchFromTwitter(query?: string): Promise<Article[]> {
    // This is a placeholder implementation
    // In a real implementation, this would use the Twitter API
    console.log(`Fetching from Twitter with query: ${query || 'none'}`);
    
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
        mass: 100000,
        position: { x: 10 * Math.cos(1), y: 0.1, z: 10 * Math.sin(1) }, // Close orbit (5 units)
        read: false
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
        mass: 130000,
        position: { x: 20 * Math.cos(3), y: -0.15, z: 20 * Math.sin(3) }, // Medium orbit (10 units)
        read: false
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
        mass: 160000,
        position: { x: 30 * Math.cos(5), y: 0.25, z: 30 * Math.sin(5) }, // Far orbit (30 units)
        read: false
      }
    ];
  }

  /**
   * Fetch articles from Washington Post
   * @param query Optional search query
   * @returns Promise with array of articles
   */
  async fetchFromWashingtonPost(query?: string): Promise<Article[]> {
    // This is a placeholder implementation
    // In a real implementation, this would use the Washington Post API
    console.log(`Fetching from Washington Post with query: ${query || 'none'}`);
    
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
        mass: 150000,
        position: { x: 10 * Math.cos(0.5), y: -0.1, z: 10 * Math.sin(0.5) }, // Close orbit (5 units)
        read: false
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
        mass: 140000,
        position: { x: 20 * Math.cos(2.5), y: 0.12, z: 20 * Math.sin(2.5) }, // Medium orbit (10 units)
        read: false
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
        mass: 170000,
        position: { x: 30 * Math.cos(5.5), y: -0.2, z: 30 * Math.sin(5.5) }, // Far orbit (30 units)
        read: false
      }
    ];
  }

  /**
   * Calculate the initial position of an article based on its location and the user's location
   * @param articleLocation The location the article is about
   * @param userZipCode The user's zip code
   * @returns Position object with coordinates in AU
   */
  calculatePosition(articleLocation: string, userZipCode: string): Position {
    // This is a placeholder implementation
    // In a real implementation, this would use geocoding to determine distances
    
    // Determine orbital distance tier based on content or source
    // We'll use a simple random selection for now, but this could be based on
    // article relevance, recency, or other factors
    const distanceTiers = [10, 20, 30]; // Close, medium, and far orbits
    const tierIndex = Math.floor(Math.random() * 3); // 0, 1, or 2
    const baseDistance = distanceTiers[tierIndex];
    
    // Add a small random variation to the base distance (±10%)
    const distance = baseDistance * (0.9 + Math.random() * 0.2);
    
    // Random angle around the sun
    const angle = Math.random() * Math.PI * 2;
    
    // Create more 3D positions with greater y-axis variation
    // Use a spherical distribution rather than a flat disc
    // This will create a true 3D orbital system
    
    // Calculate elevation angle (angle from the x-z plane)
    // Use a distribution that favors angles closer to the plane but allows for significant variation
    const elevationAngle = (Math.random() - 0.5) * Math.PI * 0.6; // -30 to +30 degrees from plane
    
    // Calculate y position using the elevation angle
    const yPosition = distance * Math.sin(elevationAngle);
    
    // Calculate x and z with the cosine of the elevation angle to maintain the proper distance
    const horizontalDistance = distance * Math.cos(Math.abs(elevationAngle));
    
    return {
      x: horizontalDistance * Math.cos(angle),
      y: yPosition,
      z: horizontalDistance * Math.sin(angle)
    };
  }

  /**
   * Fetch articles from all configured sources
   * @param userZipCode The user's zip code for location relevance
   * @param query Optional search query
   * @returns Promise with array of articles from all sources
   */
  async fetchAllArticles(userZipCode: string, query?: string): Promise<Article[]> {
    try {
      // Fetch from all sources in parallel
      const [redditArticles, twitterArticles, wapoArticles] = await Promise.all([
        this.fetchFromReddit(query),
        this.fetchFromTwitter(query),
        this.fetchFromWashingtonPost(query)
      ]);
      
      // Combine all articles
      return [...redditArticles, ...twitterArticles, ...wapoArticles];
    } catch (error) {
      console.error('Error fetching articles:', error);
      throw new Error('Failed to fetch articles from sources');
    }
  }
}
