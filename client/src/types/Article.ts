/**
 * Tier type representing the orbital distance from the sun
 */
export type TierType = 'close' | 'medium' | 'far';

/**
 * Position interface representing coordinates in 3D space
 */
export interface Position {
  x: number; // X coordinate in AU
  y: number; // Y coordinate in AU
  z: number; // Z coordinate in AU
}

/**
 * Location interface representing geographic coordinates and location information
 */
export interface Location {
  lat?: number;
  lng?: number;
  city?: string;
  state?: string;
  country?: string;
}

/**
 * Article interface representing a news article in the solar system
 */
export interface Article {
  id: string;
  title: string;
  content?: string; // Made optional to match server changes
  source: string;
  sourceUrl?: string;
  author?: string;
  publishedAt: string;
  location: string | Location; // Geographic location the article relates to (can be string or Location object)
  tags?: string[];
  mass: number; // Based on source credibility and article length
  tier: TierType; // Orbital tier (close, medium, far)
  read: boolean;
}

/**
 * API response interface for article data
 */
export interface ArticleResponse {
  status: string;
  results?: number;
  data: {
    articles?: Article[];
    article?: Article;
  };
}
