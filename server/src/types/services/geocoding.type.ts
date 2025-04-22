/**
 * Types for the geocoding service
 */

import { TierType } from '../models/article.type';

/**
 * Coordinates interface
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Geocoded location with coordinates and address details
 */
export interface GeocodedLocation {
  coordinates: Coordinates;
  zipCode?: string;
  city?: string;
  state?: string;
  country?: string;
  formattedAddress?: string;
  isUSLocation?: boolean;
}

/**
 * Distance calculation result
 */
export interface DistanceResult {
  distanceInMeters: number;
  distanceInKilometers: number;
  distanceInMiles: number;
  tier: TierType;
  fromLocation?: GeocodedLocation; // Optional source location details
  toLocation?: GeocodedLocation;   // Optional destination location details
}

/**
 * Geocoding options
 */
export interface GeocodingOptions {
  provider?: string;
  httpAdapter?: string;
  apiKey?: string;
}

/**
 * Tier distance thresholds in kilometers
 */
export interface TierThresholds {
  close: number;  // Distance in km for close tier
  medium: number; // Distance in km for medium tier
}
