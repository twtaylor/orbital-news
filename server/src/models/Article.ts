/**
 * Article model utility functions
 */

// Import orbital tier constants and types
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
