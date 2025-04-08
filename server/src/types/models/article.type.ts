/**
 * Types for article models
 */

/**
 * Valid orbital tier types for articles
 */
export type TierType = 'close' | 'medium' | 'far';

/**
 * Article model representing a news article in the solar system
 */
export interface Article {
  id: string;
  title: string;
  content: string;
  source: string;
  sourceUrl?: string;
  author?: string;
  publishedAt: string;
  location: string; // Geographic location the article relates to
  tags?: string[];
  mass: number; // Based on source credibility and article length
  tier: TierType; // Orbital tier (close, medium, far)
  read: boolean;
}
