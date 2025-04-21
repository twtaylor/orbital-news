/**
 * Article model utility functions
 */

// Import orbital tier constants and types
import { OrbitalTier } from '../shared/constants';
import { Article, TierType } from '../types/models/article.type';

// Re-export types for backward compatibility
export { Article, TierType };

// Calculate article mass based on source credibility and length
export const calculateArticleMass = (
  sourceCredibility: number, // 0-1 scale
  contentLength: number
): number => {
  // Simple formula: credibility multiplier * length
  // This can be refined based on actual requirements
  return sourceCredibility * (contentLength / 10);
};

// DEPRECATED: This function is no longer used as tier calculation is now handled
// dynamically in the articleController based on distance and other factors.
// Keeping this function signature for backward compatibility with any existing code.
/**
 * @deprecated Use dynamic tier calculation in articleController instead
 */
export const determineTier = (
  source: string,
  publishedAt: string,
  contentLength: number
): TierType => {
  console.warn('determineTier is deprecated. Tiers are now calculated dynamically in the articleController.');
  // Default to medium tier
  return 'medium';
};
