/**
 * Types for location extraction service
 */

/**
 * Represents a geographical location extracted from text
 */
export interface Location {
  /** Full name of the location as extracted from text */
  name: string;
  
  /** Country name if identified */
  country?: string;
  
  /** Region, state, or province if identified */
  region?: string;
  
  /** City name if identified */
  city?: string;
  
  /** Confidence score between 0-1 */
  confidence: number;
  
  /** Latitude if available */
  latitude?: number;
  
  /** Longitude if available */
  longitude?: number;
  
  /** Zip code if available */
  zipCode?: string;
  
  /** How many times this location was mentioned */
  mentions?: number;
}

/**
 * Result of location extraction process
 */
export interface LocationExtractionResult {
  /** Primary location with highest confidence */
  primaryLocation?: Location;
  
  /** All locations found in the text */
  allLocations: Location[];
  
  /** Raw text that was analyzed */
  analyzedText: string;
  
  /** Length of text analyzed */
  textLength: number;
  
  /** Processing time in milliseconds */
  processingTimeMs?: number;
  
  /** Distance calculation result */
  distanceResult?: {
    distanceInMeters: number;
    distanceInKilometers: number;
    distanceInMiles: number;
  };
  
  /** Tier based on distance from user location */
  tier?: string;
}

/**
 * Options for location extraction
 */
export interface LocationExtractionOptions {
  /** Minimum confidence threshold (0-1) */
  minConfidence?: number;
  
  /** Maximum number of locations to return */
  maxLocations?: number;
  
  /** Whether to include geolocation data */
  includeGeoData?: boolean;
  
  /** Whether to fetch the full article content */
  fetchFullContent?: boolean;
}
