/**
 * Types for article models
 */

/**
 * Valid orbital tier types for articles
 */
export type TierType = 'close' | 'medium' | 'far';

/**
 * Location interface for structured location data
 */
export interface ArticleLocation {
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  lat?: number;
  lng?: number;
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
  tier: TierType; // Orbital tier (close, medium, far)
}
