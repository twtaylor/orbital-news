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

// Determine tier based on article properties
export const determineTier = (
  source: string,
  publishedAt: string,
  contentLength: number
): TierType => {
  // This is a placeholder implementation
  // In a real implementation, this would use more sophisticated logic
  // based on the article's source, publication date, and content length
  
  // Determine tier based on publication date (newer = closer)
  const pubDate = new Date(publishedAt);
  const now = new Date();
  const daysDifference = (now.getTime() - pubDate.getTime()) / (1000 * 3600 * 24);
  
  // Determine tier based on recency
  if (daysDifference < 1) { // Less than 1 day old
    return 'close';
  } else if (daysDifference < 3) { // 1-3 days old
    return 'medium';
  } else { // More than 3 days old
    return 'far';
  }
};
