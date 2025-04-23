import { Article, ArticleLocation } from '../types/models/article.type';
import { LocationService } from '../services/locationService';
import { GeocodingService } from '../services/geocodingService';
import { LocationExtractionResult } from '../types/services/location.type';

/**
 * Utility functions for handling location data
 */

/**
 * Extract location name from either string or structured location object
 * @param location Location as string or ArticleLocation object
 * @returns Location name as string
 */
export function getLocationName(location: string | ArticleLocation): string {
  if (typeof location === 'string') {
    return location;
  }
  
  // Return the location field directly
  return location.location || 'Unknown';
}

/**
 * Extract zip code from location if available
 * @param location Location as string or ArticleLocation object
 * @returns Zip code or undefined if not available
 */
export function getZipCode(location: string | ArticleLocation): string | undefined {
  if (typeof location === 'string') {
    return undefined;
  }
  
  return location.zipCode;
}

/**
 * Extract coordinates from location if available
 * @param location Location as string or ArticleLocation object
 * @returns Coordinates as {lat, lng} or undefined if not available
 */
export function getCoordinates(location: string | ArticleLocation): {lat: number, lng: number} | undefined {
  if (typeof location === 'string') {
    return undefined;
  }
  
  // Check for coordinates in the new format (latitude/longitude)
  // Only return coordinates if they are non-zero
  if (location.latitude !== undefined && location.longitude !== undefined && 
      location.latitude !== 0 && location.longitude !== 0) {
    return {
      lat: location.latitude,
      lng: location.longitude
    };
  }
  
  return undefined;
}

/**
 * Check if location has structured data
 * @param location Location as string or ArticleLocation object
 * @returns True if location is a structured object
 */
export function hasStructuredData(location: string | ArticleLocation): boolean {
  return typeof location === 'object';
}

/**
 * Geocode an article's location data, ensuring it has structured location information
 * with coordinates and zip code
 * 
 * @param article The article to process
 * @param locationService Instance of LocationService
 * @param geocodingService Instance of GeocodingService
 * @param options Options for location extraction
 * @returns The article with properly geocoded location
 */
export async function geocodeArticleLocation(
  article: Article,
  locationService: LocationService,
  geocodingService: GeocodingService,
  options: {
    fetchFullContent?: boolean;
    minConfidence?: number;
    isTestEnvironment?: boolean | string;
    defaultZipCode?: string;
  } = {}
): Promise<Article> {
  // Set default options
  const {
    fetchFullContent = false,
    minConfidence = 0.3,
    isTestEnvironment = false,
    defaultZipCode = '00000'
  } = options;
  
  // Ensure fetchFullContent is a boolean
  const shouldFetchFullContent = fetchFullContent === true || (typeof fetchFullContent === 'string' && fetchFullContent === 'true');
  // Ensure isTestEnvironment is a boolean
  const isTestEnv = isTestEnvironment === true || (typeof isTestEnvironment === 'string' && isTestEnvironment === 'true');
  
  try {
    // Extract location from article title and content
    const locationResult = await locationService.extractLocations(article, {
      fetchFullContent: shouldFetchFullContent,
      minConfidence
    });
    
    // If we found a primary location with good confidence
    if (locationResult.primaryLocation && locationResult.primaryLocation.confidence >= minConfidence) {
      if (!isTestEnv) {
        console.debug(`Article ${article.id}: Extracted primary location: ${locationResult.primaryLocation.name}`);
      }
      
      // Check if we have detailed location data (from geocoding)
      if (locationResult.primaryLocation.latitude && locationResult.primaryLocation.longitude) {
        if (!isTestEnv) {
          console.debug(`Article ${article.id}: Using geocoded data from LocationService: ${locationResult.primaryLocation.name} (${locationResult.primaryLocation.latitude}, ${locationResult.primaryLocation.longitude}, ${locationResult.primaryLocation.zipCode})`);
        }
        
        // Create structured location object with required zipCode
        const structuredLocation: ArticleLocation = {
          location: locationResult.primaryLocation.name || 'Unknown',
          latitude: locationResult.primaryLocation.latitude,
          longitude: locationResult.primaryLocation.longitude,
          zipCode: locationResult.primaryLocation.zipCode || defaultZipCode
        };
        
        // Set the structured location
        article.location = structuredLocation;
      } else {
        // For simple string locations, we need to create a structured object with zipCode
        // Try to geocode the location name to get a zipCode
        try {
          if (!isTestEnv) {
            console.debug(`Article ${article.id}: Attempting to geocode location: ${locationResult.primaryLocation.name}`);
          }
          const geocodedLocation = await geocodingService.geocodeLocation(locationResult.primaryLocation.name);
          
          if (geocodedLocation && geocodedLocation.zipCode) {
            if (!isTestEnv) {
              console.debug(`Article ${article.id}: Successfully geocoded to: ${geocodedLocation.zipCode} (${geocodedLocation.coordinates.latitude}, ${geocodedLocation.coordinates.longitude})`);
            }
            
            article.location = {
              location: locationResult.primaryLocation.name || 'Unknown',
              latitude: geocodedLocation.coordinates.latitude,
              longitude: geocodedLocation.coordinates.longitude,
              zipCode: geocodedLocation.zipCode
            };
          } else {
            // If geocoding fails, use the default zipCode
            if (!isTestEnv) {
              console.debug(`Article ${article.id}: Geocoding failed - no valid result returned`);
            }
            article.location = {
              location: locationResult.primaryLocation.name || 'Unknown',
              latitude: 0,
              longitude: 0,
              zipCode: defaultZipCode
            };
          }
        } catch (error) {
          // If geocoding fails, use the default zipCode
          if (!isTestEnv) {
            console.error(`Article ${article.id}: Geocoding error:`, error);
          }
          article.location = {
            location: locationResult.primaryLocation.name || 'Unknown',
            latitude: 0,
            longitude: 0,
            zipCode: defaultZipCode
          };
        }
      }
    } else {
      // If no primary location with good confidence was found, check if the article's location
      // is a US state or major city that we can geocode directly
      const currentLocation = typeof article.location === 'object' ? 
        (article.location as ArticleLocation).location : 
        (typeof article.location === 'string' ? article.location : 'Unknown');
      
      if (currentLocation && currentLocation !== 'Unknown') {
        try {
          if (!isTestEnv) {
            console.debug(`Article ${article.id}: No primary location found, trying to geocode original location: ${currentLocation}`);
          }
          const fallbackGeocode = await geocodingService.geocodeLocation(currentLocation);
          
          if (fallbackGeocode && fallbackGeocode.coordinates.latitude && fallbackGeocode.coordinates.longitude) {
            if (!isTestEnv) {
              console.debug(`Article ${article.id}: Successfully geocoded original location to: ${fallbackGeocode.zipCode || defaultZipCode} (${fallbackGeocode.coordinates.latitude}, ${fallbackGeocode.coordinates.longitude})`);
            }
            
            article.location = {
              location: currentLocation,
              latitude: fallbackGeocode.coordinates.latitude,
              longitude: fallbackGeocode.coordinates.longitude,
              zipCode: fallbackGeocode.zipCode || defaultZipCode
            };
          }
        } catch (error) {
          if (!isTestEnv) {
            console.error(`Article ${article.id}: Fallback geocoding error:`, error);
          }
        }
      }
    }
    
    // If we didn't get a good location from the title/content and the article is from a news source,
    // try to fetch full content only if not already done and only for non-paywalled sites
    if ((!locationResult.primaryLocation || locationResult.primaryLocation.confidence < minConfidence) && 
        article.sourceUrl && !fetchFullContent) {
      
      // Check if the URL is likely to be paywalled
      const isLikelyPaywalled = isPaywalledSite(article.sourceUrl);
      
      if (!isLikelyPaywalled) {
        // Try again with full content fetch for non-paywalled URLs that might have more location info
        if (!isTestEnv) {
          console.debug(`Article ${article.id}: Attempting to fetch full content from ${article.sourceUrl}`);
        }
        
        const fullContentResult = await locationService.extractLocations(article, {
          fetchFullContent: true,  // Now try with full content
          minConfidence
        });
        
        if (fullContentResult.primaryLocation && 
            fullContentResult.primaryLocation.confidence >= minConfidence && 
            (!locationResult.primaryLocation || 
             fullContentResult.primaryLocation.confidence > locationResult.primaryLocation.confidence)) {
          
          // For full content results, ensure we have a structured location with zipCode
          try {
            const geocodedLocation = await geocodingService.geocodeLocation(fullContentResult.primaryLocation.name);
            if (geocodedLocation && geocodedLocation.zipCode) {
              article.location = {
                location: fullContentResult.primaryLocation.name || 'Unknown',
                latitude: geocodedLocation.coordinates.latitude,
                longitude: geocodedLocation.coordinates.longitude,
                zipCode: geocodedLocation.zipCode
              };
            } else {
              // If geocoding fails, use the default zipCode
              article.location = {
                location: fullContentResult.primaryLocation.name || 'Unknown',
                latitude: 0,
                longitude: 0,
                zipCode: defaultZipCode
              };
            }
          } catch (error) {
            // If geocoding fails, use the default zipCode
            article.location = {
              location: fullContentResult.primaryLocation.name || 'Unknown',
              latitude: 0,
              longitude: 0,
              zipCode: defaultZipCode
            };
          }
        }
      } else if (!isTestEnvironment) {
        console.debug(`Skipping content fetch for paywalled site: ${article.sourceUrl}`);
      }
    }
  } catch (error) {
    if (!isTestEnvironment) {
      console.warn(`Failed to extract location for article ${article.id}: ${error}`);
    }
    // Ensure location is always a structured object with zipCode
    if (typeof article.location === 'string') {
      article.location = {
        location: article.location,
        latitude: 0,
        longitude: 0,
        zipCode: defaultZipCode
      };
    }
  }
  
  // Final check to ensure location is always a structured object with zipCode
  if (typeof article.location === 'string') {
    article.location = {
      location: article.location,
      latitude: 0, // Default coordinates since we couldn't extract any
      longitude: 0, // Default coordinates since we couldn't extract any
      zipCode: defaultZipCode
    };
  }
  
  return article;
}

/**
 * Check if a URL is likely to be from a paywalled site
 * @param url URL to check
 * @returns True if the URL is likely from a paywalled site
 */
function isPaywalledSite(url: string): boolean {
  const paywalledDomains = [
    'nytimes.com',
    'wsj.com',
    'washingtonpost.com',
    'economist.com',
    'ft.com',
    'bloomberg.com',
    'newyorker.com',
    'thetimes.co.uk',
    'telegraph.co.uk',
    'latimes.com',
    'bostonglobe.com'
  ];
  
  return paywalledDomains.some(domain => url.includes(domain));
}
