import nlp from 'compromise';
import fetch from 'node-fetch';
import { Article, TierType } from '../types/models/article.type';
import { 
  Location, 
  LocationExtractionResult,
  LocationExtractionOptions 
} from '../types/services/location.type';
import { GeocodingService } from './geocodingService';
import { Coordinates } from '../types/services/geocoding.type';

/**
 * Service for extracting location information from article content
 * and determining article tiers based on geographic distance
 */
export class LocationService {
  // Common location words to exclude (lowercase)
  private excludedTerms = new Set([
    'here', 'there', 'everywhere', 'nowhere', 'somewhere',
    'home', 'house', 'building', 'office', 'headquarters',
    'online', 'internet', 'web', 'website', 'platform',
    'world', 'earth', 'globe', 'universe', 'space'
  ]);

  // Common country names for quick lookup
  private countries = new Set([
    'united states', 'usa', 'u.s.', 'u.s.a.', 'america',
    'canada', 'mexico', 'uk', 'united kingdom', 'england',
    'france', 'germany', 'italy', 'spain', 'china',
    'japan', 'india', 'australia', 'russia', 'brazil'
    // Add more as needed
  ]);
  
  // US locations for prioritization
  private usLocations = new Set([
    'united states', 'usa', 'u.s.', 'u.s.a.', 'america',
    'alabama', 'alaska', 'arizona', 'arkansas', 'california',
    'colorado', 'connecticut', 'delaware', 'florida', 'georgia',
    'hawaii', 'idaho', 'illinois', 'indiana', 'iowa',
    'kansas', 'kentucky', 'louisiana', 'maine', 'maryland',
    'massachusetts', 'michigan', 'minnesota', 'mississippi', 'missouri',
    'montana', 'nebraska', 'nevada', 'new hampshire', 'new jersey',
    'new mexico', 'new york', 'north carolina', 'north dakota', 'ohio',
    'oklahoma', 'oregon', 'pennsylvania', 'rhode island', 'south carolina',
    'south dakota', 'tennessee', 'texas', 'utah', 'vermont',
    'virginia', 'washington', 'west virginia', 'wisconsin', 'wyoming',
    'washington dc', 'washington d.c.', 'd.c.', 'district of columbia',
    'new york city', 'nyc', 'los angeles', 'la', 'chicago', 'houston',
    'phoenix', 'philadelphia', 'san antonio', 'san diego', 'dallas',
    'san jose', 'austin', 'jacksonville', 'fort worth', 'columbus',
    'san francisco', 'charlotte', 'indianapolis', 'seattle', 'denver',
    'boston', 'portland', 'las vegas', 'miami', 'atlanta'
  ]);
  
  // Geocoding service for location coordinates and distance calculation
  private geocodingService: GeocodingService;
  
  /**
   * Initialize the LocationService
   * @param userLocation Optional user location coordinates
   * @param userZipCode Optional user ZIP code (takes precedence over coordinates)
   */
  constructor(userLocation?: Coordinates, userZipCode?: string) {
    // Initialize geocoding service with default settings
    this.geocodingService = new GeocodingService();
    
    // Set user location if provided
    if (userLocation) {
      this.geocodingService.setUserLocation(userLocation);
    }
    
    // Set user location by ZIP code if provided (takes precedence)
    if (userZipCode) {
      this.geocodingService.setUserLocationByZipCode(userZipCode)
        .catch(error => console.error('Error setting user location by ZIP code:', error));
    }
  }

  /**
   * Extract location information from an article and determine its tier based on distance
   * 
   * @param article The article to analyze
   * @param options Options for location extraction
   * @returns Location extraction result with distance-based tier
   */
  async extractLocations(
    article: Article, 
    options: LocationExtractionOptions = {}
  ): Promise<LocationExtractionResult> {
    const startTime = Date.now();
    
    // Set default options
    const {
      minConfidence = 0.3,
      maxLocations = 5,
      includeGeoData = false,
      fetchFullContent = true
    } = options;
    
    // Use article content if available, otherwise just use the title
    let textToAnalyze = article.content || article.title;
    
    // Fetch full content if needed and not already available
    if (fetchFullContent && article.sourceUrl) {
      try {
        const fetchedContent = await this.fetchArticleContent(article.sourceUrl);
        if (fetchedContent) {
          textToAnalyze = fetchedContent;
        }
      } catch (error) {
        console.warn(`Failed to fetch content for article ${article.id}: ${error}`);
      }
    }
    
    // Extract locations from text
    const locations = this.extractLocationsFromText(textToAnalyze);

    // Filter by confidence and limit number
    const filteredLocations = locations
      .filter(loc => loc.confidence >= minConfidence)
      .slice(0, maxLocations);
    
    // Find primary location (highest confidence)
    const primaryLocation = filteredLocations.length > 0 
      ? filteredLocations[0] 
      : undefined;
    
    // Add geo data if requested
    if (includeGeoData && filteredLocations.length > 0) {
      // Geocode the primary location to get coordinates and zip code
      try {
        const geocodedLocation = await this.geocodingService.geocodeLocation(primaryLocation?.name || '');
        
        if (geocodedLocation && primaryLocation) {
          // Add geocoded data to the primary location
          primaryLocation.latitude = geocodedLocation.coordinates.latitude;
          primaryLocation.longitude = geocodedLocation.coordinates.longitude;
          primaryLocation.zipCode = geocodedLocation.zipCode;
          primaryLocation.city = geocodedLocation.city || primaryLocation.city;
          primaryLocation.country = geocodedLocation.country || primaryLocation.country;
          primaryLocation.region = geocodedLocation.state || primaryLocation.region;
        }
      } catch (error) {
        console.warn('Error geocoding primary location:', error);
      }
    }
    
    // Calculate distance and determine tier if we have a primary location
    let distanceResult = undefined;
    let tier = undefined;
    
    if (primaryLocation && primaryLocation.name) {
      try {
        // Use the geocoding service to calculate distance from user location
        const geoResult = await this.geocodingService.calculateDistanceFromUser(primaryLocation.name);
        
        if (geoResult) {
          distanceResult = {
            distanceInMeters: geoResult.distanceInMeters,
            distanceInKilometers: geoResult.distanceInKilometers,
            distanceInMiles: geoResult.distanceInMiles
          };
          
          tier = geoResult.tier;
          // No special logging
        }
      } catch (error) {
        console.error('Error calculating distance for location:', error);
      }
    }
    
    return {
      primaryLocation,
      allLocations: filteredLocations,
      analyzedText: textToAnalyze,
      textLength: textToAnalyze.length,
      processingTimeMs: Date.now() - startTime,
      distanceResult,
      tier
    };
  }
  
  /**
   * Extract locations from text using compromise.js
   * 
   * @param text Text to analyze
   * @returns Array of locations with confidence scores
   */
  private extractLocationsFromText(text: string): Location[] {
    // Skip empty text
    if (!text || text.trim().length === 0) {
      return [];
    }
    
    // Parse text with compromise
    const doc = nlp(text);
    
    // Extract places
    const places = doc.places();
    const locationMentions = new Map<string, number>();

    // No special logging
    
    // Count mentions of each location
    places.forEach(place => {
      const name = place.text().toLowerCase();
      
      // Skip excluded terms
      if (this.excludedTerms.has(name)) {
        return;
      }
      
      // Count mentions
      const count = locationMentions.get(name) || 0;
      locationMentions.set(name, count + 1);
    });
    
    // Convert to Location objects with confidence scores
    const locations: Location[] = [];
    const totalMentions = Array.from(locationMentions.values()).reduce((sum, count) => sum + count, 0);
    
    for (const [name, mentions] of locationMentions.entries()) {
      // Calculate confidence based on:
      // 1. Number of mentions relative to total
      // 2. Whether it's a known country
      // 3. Length of the name (longer names tend to be more specific)
      // 4. US location bonus (prioritize US locations)
      const mentionScore = totalMentions > 0 ? mentions / totalMentions : 0;
      const countryBonus = this.countries.has(name) ? 0.1 : 0;
      const lengthScore = Math.min(name.length / 20, 0.2); // Max 0.2 for length
      const usLocationBonus = this.usLocations.has(name) ? 0.3 : 0; // Significant bonus for US locations
      
      const confidence = Math.min(
        mentionScore * 0.7 + countryBonus + lengthScore + usLocationBonus,
        1.0
      );
      
      locations.push({
        name: this.capitalizeLocation(name),
        confidence: parseFloat(confidence.toFixed(2)),
        mentions,
        isUSLocation: this.usLocations.has(name)
      });
    }
    
    // Sort by US location first, then by confidence (descending)
    return locations.sort((a, b) => {
      // First prioritize US locations
      if (a.isUSLocation && !b.isUSLocation) return -1;
      if (!a.isUSLocation && b.isUSLocation) return 1;
      
      // Then sort by confidence
      return b.confidence - a.confidence;
    });
  }
  
  /**
   * Fetch article content from a URL
   * 
   * @param url URL to fetch content from
   * @returns Article content as text
   */
  private async fetchArticleContent(url: string): Promise<string> {
    // Skip known paywalled or problematic sites
    const paywallDomains = [
      'nytimes.com', 'washingtonpost.com', 'wsj.com', 'ft.com',
      'bloomberg.com', 'economist.com', 'reuters.com', 'newyorker.com',
      'latimes.com', 'thetimes.co.uk', 'telegraph.co.uk'
    ];
    
    // Check if URL is from a known paywalled site
    if (paywallDomains.some(domain => url.includes(domain))) {
      console.log(`Skipping content fetch for paywalled site: ${url}`);
      return ''; // Return empty string for paywalled sites
    }
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        },
        timeout: 5000 // 5 second timeout
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch content: ${response.status} ${response.statusText}`);
      }
      
      const html = await response.text();
      
      // Very basic HTML content extraction
      // In a production environment, use a proper HTML parser
      return this.extractTextFromHtml(html);
    } catch (error) {
      console.warn(`Error fetching article content for URL ${url}: ${error}`);
      return ''; // Return empty string on error
    }
  }
  
  /**
   * Extract text content from HTML
   * This is a very basic implementation
   * 
   * @param html HTML content
   * @returns Plain text content
   */
  private extractTextFromHtml(html: string): string {
    // Remove scripts and style tags
    let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
    text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
    
    // Replace common block elements with newlines
    text = text.replace(/<\/?(?:div|p|br|h[1-6]|ul|ol|li|blockquote|section|article)[^>]*>/gi, '\n');
    
    // Remove all remaining HTML tags
    text = text.replace(/<[^>]*>/g, ' ');
    
    // Decode HTML entities
    text = text.replace(/&nbsp;/g, ' ')
               .replace(/&amp;/g, '&')
               .replace(/&lt;/g, '<')
               .replace(/&gt;/g, '>')
               .replace(/&quot;/g, '"');
    
    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
  }
  
  /**
   * Properly capitalize a location name
   * 
   * @param name Location name to capitalize
   * @returns Capitalized location name
   */
  private capitalizeLocation(name: string): string {
    return name.split(' ')
      .map(word => {
        // Don't capitalize articles, conjunctions, prepositions unless first word
        const lowerCaseWords = ['of', 'the', 'and', 'in', 'on', 'at', 'by', 'for', 'with'];
        if (lowerCaseWords.includes(word) && name.indexOf(word) !== 0) {
          return word;
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  }

  /**
   * Set the user's ZIP code for location relevance calculations
   * @param zipCode User's ZIP code
   * @returns Promise that resolves when the location is set
   */
  async setUserZipCode(zipCode: string): Promise<boolean> {
    try {
      const result = await this.geocodingService.setUserLocationByZipCode(zipCode);
      if (result) {
        console.log(`Set user location to ZIP code ${zipCode} for distance calculations`);
      } else {
        console.warn(`Failed to set user location to ZIP code ${zipCode}`);
      }
      return result;
    } catch (error) {
      console.error('Error setting user ZIP code:', error);
      return false;
    }
  }
  
  /**
   * Set the user's coordinates for location relevance calculations
   * @param coordinates User's coordinates
   */
  setUserCoordinates(coordinates: Coordinates): void {
    this.geocodingService.setUserLocation(coordinates);
    console.log(`Set user coordinates to ${coordinates.latitude}, ${coordinates.longitude} for distance calculations`);
  }
}
