import { Article, ArticleLocation } from '../types/models/article.type';

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
  return typeof location !== 'string';
}
