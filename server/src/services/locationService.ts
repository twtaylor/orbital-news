import nlp from 'compromise';
import fetch from 'node-fetch';
import { Article } from '../types/models/article.type';
import { 
  Location, 
  LocationExtractionResult,
  LocationExtractionOptions 
} from '../types/services/location.type';
import { GeocodingService } from './geocodingService';
import { Coordinates } from '../types/services/geocoding.type';
import { USLocationService } from './usLocationService';

/**
 * Service for extracting location information from article content
 * and determining article tiers based on geographic distance
 */
export class LocationService {
  // US Location service for improved location validation
  private _usLocationService: USLocationService;
  
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
    this._usLocationService = new USLocationService();
    
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
    const locations = this.extractLocationsFromText(textToAnalyze, article.title);

    // Filter by confidence and limit number
    const filteredLocations = locations
      .filter(loc => loc.confidence >= minConfidence)
      .slice(0, maxLocations);
    
    // Find primary location with enhanced prioritization
    let primaryLocation: Location | undefined;
    
    if (filteredLocations.length > 0) {
      // First priority: US cities mentioned in the title
      if (article.title) {
        const titleLower = article.title.toLowerCase();
        primaryLocation = filteredLocations.find(loc => 
          loc.isUSLocation && 
          loc.name && 
          titleLower.includes(loc.name.toLowerCase()) &&
          !this.countries.has(loc.name.toLowerCase())
        );
      }
      
      // Second priority: US cities (even if not in title)
      if (!primaryLocation) {
        primaryLocation = filteredLocations.find(loc => 
          loc.isUSLocation && 
          loc.city && 
          loc.city.length > 0 && 
          !this.countries.has(loc.city.toLowerCase())
        );
      }
      
      // Third priority: Any location mentioned in the title that's not a country
      if (!primaryLocation && article.title) {
        const titleLower = article.title.toLowerCase();
        primaryLocation = filteredLocations.find(loc => 
          loc.name && 
          titleLower.includes(loc.name.toLowerCase()) &&
          !this.countries.has(loc.name.toLowerCase())
        );
      }
      
      // Fourth priority: Any city
      if (!primaryLocation) {
        primaryLocation = filteredLocations.find(loc => 
          loc.city && 
          loc.city.length > 0 && 
          !this.countries.has(loc.city.toLowerCase())
        );
      }
      
      // Final fallback: highest confidence location
      if (!primaryLocation) {
        primaryLocation = filteredLocations[0];
      }
    }
    
    // Add geo data if requested
    if (includeGeoData && filteredLocations.length > 0 && primaryLocation) {
      // If we already have coordinates from US location service, use those
      if (!primaryLocation.latitude || !primaryLocation.longitude) {
        try {
          // Try to geocode the primary location
          const geocodedLocation = await this.geocodingService.geocodeLocation(primaryLocation.name || '');
          
          if (geocodedLocation) {
            // Add geocoded data to the primary location
            primaryLocation.latitude = geocodedLocation.coordinates.latitude;
            primaryLocation.longitude = geocodedLocation.coordinates.longitude;
            primaryLocation.zipCode = geocodedLocation.zipCode;
            primaryLocation.city = geocodedLocation.city || primaryLocation.city;
            primaryLocation.country = geocodedLocation.country || primaryLocation.country;
            primaryLocation.region = geocodedLocation.state || primaryLocation.region;
          } else if (primaryLocation.isUSLocation) {
            // Fallback for US locations - use approximate coordinates
            const usState = this._usLocationService.validateLocation(primaryLocation.name);
            if (usState) {
              primaryLocation.latitude = usState.latitude;
              primaryLocation.longitude = usState.longitude;
              primaryLocation.zipCode = usState.zipCodes ? usState.zipCodes[0] : '00000';
            } else {
              // Generic US coordinates (center of US)
              primaryLocation.latitude = 39.8283;
              primaryLocation.longitude = -98.5795;
              primaryLocation.zipCode = '00000';
            }
          }
        } catch (error) {
          console.warn('Error geocoding primary location:', error);
        }
      }
    }
    
    // Calculate distance and determine tier if we have a primary location
    let distanceResult = undefined;
    let tier = undefined;
    
    if (primaryLocation && primaryLocation.latitude && primaryLocation.longitude) {
      const userCoordinates = this.geocodingService.getUserLocation();
      
      if (userCoordinates) {
        // Calculate distance to user location
        distanceResult = this.calculateDistance(
          { latitude: primaryLocation.latitude, longitude: primaryLocation.longitude },
          userCoordinates
        );
        
        // Determine tier based on distance
        tier = this.determineTier(distanceResult.distanceInMiles);
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
   * Calculate distance between two coordinates
   * @param from Starting coordinates
   * @param to Ending coordinates
   * @returns Distance in miles
   */
  calculateDistance(from: Coordinates, to: Coordinates): { distanceInMeters: number; distanceInKilometers: number; distanceInMiles: number } {
    // Haversine formula to calculate distance between two points on Earth
    const R = 3958.8; // Earth's radius in miles
    const dLat = this._toRadians(to.latitude - from.latitude);
    const dLon = this._toRadians(to.longitude - from.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this._toRadians(from.latitude)) * Math.cos(this._toRadians(to.latitude)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceInMiles = R * c;
    const distanceInKilometers = distanceInMiles * 1.60934;
    const distanceInMeters = distanceInKilometers * 1000;
    
    return { 
      distanceInMeters,
      distanceInKilometers,
      distanceInMiles
    };
  }
  
  /**
   * Convert degrees to radians
   * @param degrees Angle in degrees
   * @returns Angle in radians
   */
  private _toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
  
  /**
   * Determine tier based on distance
   * @param distance Distance in miles
   * @returns Tier (local, regional, national)
   */
  determineTier(distance: number): string {
    if (distance < 50) {
      return 'local';
    } else if (distance < 500) {
      return 'regional';
    } else {
      return 'national';
    }
  }
  
  /**
   * Extract locations from text using compromise.js
   * 
   * @param text Text to analyze
   * @param title Optional title for prioritization
   * @returns Array of locations with confidence scores
   */
  private extractLocationsFromText(text: string, title?: string): Location[] {
    // Skip empty text
    if (!text || text.trim().length === 0) {
      return [];
    }
    
    // Parse text with compromise
    const doc = nlp(text);
    
    // Extract places
    const places = doc.places();
    const locationMentions = new Map<string, number>();

    // If we have a title, extract locations from it separately and give them more weight
    if (title) {
      const titleDoc = nlp(title);
      const titlePlaces = titleDoc.places();
      
      // Process places from the title
      titlePlaces.forEach(place => {
        const name = place.text().toLowerCase();
        if (!this.excludedTerms.has(name)) {
          // Add extra weight to title mentions (equivalent to multiple body mentions)
          const count = locationMentions.get(name) || 0;
          locationMentions.set(name, count + 3); // Title locations get 3x the weight
        }
      });
      
      // Additional check for known US cities in the title that might not be recognized by compromise
      const titleLower = title.toLowerCase();
      // Check for known US cities in the title
      this.usLocations.forEach((_, cityName) => {
        if (titleLower.includes(cityName.toLowerCase()) && !this.excludedTerms.has(cityName.toLowerCase())) {
          // Add with high weight if found in title
          const count = locationMentions.get(cityName.toLowerCase()) || 0;
          locationMentions.set(cityName.toLowerCase(), count + 5); // Known US cities in title get 5x weight
        }
      });
    }
    
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
      // Try to validate with US location service first
      const validatedLocation = this._usLocationService.convertToLocation(name);
      
      if (validatedLocation) {
        // Use the validated location with enhanced confidence
        validatedLocation.mentions = mentions;
        validatedLocation.confidence = Math.min(validatedLocation.confidence + (mentions / totalMentions * 0.3), 1.0);
        locations.push(validatedLocation);
      } else {
        // Fall back to original logic for non-US locations
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
    }
    
    // Enhanced sorting with more sophisticated prioritization
    return locations.sort((a, b) => {
      // First, prioritize US cities over other locations
      const aIsUSCity = a.isUSLocation && a.city && !this.countries.has((a.name || '').toLowerCase());
      const bIsUSCity = b.isUSLocation && b.city && !this.countries.has((b.name || '').toLowerCase());
      
      if (aIsUSCity && !bIsUSCity) return -1;
      if (!aIsUSCity && bIsUSCity) return 1;
      
      // Second, prioritize any US location over non-US locations
      if (a.isUSLocation && !b.isUSLocation) return -1;
      if (!a.isUSLocation && b.isUSLocation) return 1;
      
      // Third, prioritize cities over countries
      const aIsCountry = this.countries.has((a.name || '').toLowerCase());
      const bIsCountry = this.countries.has((b.name || '').toLowerCase());
      
      if (!aIsCountry && bIsCountry) return -1;
      if (aIsCountry && !bIsCountry) return 1;
      
      // Finally, sort by confidence
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
