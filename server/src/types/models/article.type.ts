/**
 * Types for article models
 */

/**
 * Valid orbital tier types for articles
 */
export type TierType = 'close' | 'medium' | 'far' | 'unknown';

/**
 * Coordinates interface for geographic coordinates
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Distance information for articles
 */
export interface Distance {
  meters: number;
  kilometers: number;
  miles: number;
}

/**
 * Location interface for structured location data
 */
export interface ArticleLocation {
  // Primary location name from NLP extraction
  location: string;
  // Mandatory coordinates
  latitude: number;
  longitude: number;
  // Optional fields
  zipCode?: string;
}

/**
 * Article model representing a news article in the solar system
 */
export interface Article {
  id: string;
  title: string;
  content?: string; // Made optional
  source: string;
  sourceUrl?: string;
  author?: string;
  publishedAt: string;
  location: string | ArticleLocation; // Geographic location (string or structured object)
  tags?: string[];
  mass: number; // Based on source credibility and article length
  // tier removed - will be calculated dynamically, not stored
}

/**
 * Extended Article interface that includes tier for API responses
 * This is used for API responses but not for database storage
 */
export interface ArticleWithTier extends Article {
  tier: TierType; // Orbital tier (close, medium, far, unknown) - calculated dynamically
  distance?: Distance; // Distance information if available
}
