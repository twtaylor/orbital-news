/**
 * Article model representing a news article in the solar system
 */

export interface Position {
  x: number; // X coordinate in AU
  y: number; // Y coordinate in AU
  z: number; // Z coordinate in AU
}

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
  position: Position; // Position in the solar system (in AU)
  read: boolean;
}

// Calculate article mass based on source credibility and length
export const calculateArticleMass = (
  sourceCredibility: number, // 0-1 scale
  contentLength: number
): number => {
  // Simple formula: credibility multiplier * length
  // This can be refined based on actual requirements
  return sourceCredibility * (contentLength / 10);
};

// Calculate initial position based on relevance to user location
export const calculateInitialPosition = (
  distanceFromUser: number, // In km
  userZipCode: string
): Position => {
  // This is a placeholder implementation
  // In a real implementation, this would use more sophisticated logic
  // to determine the position based on the user's location and the article's relevance
  
  // Convert distance to AU (1 AU = ~150 million km)
  // This is just for visualization purposes, not actual astronomical accuracy
  const distanceInAU = Math.min(Math.max(distanceFromUser / 1000000, 0.5), 10);
  
  // Generate a position on a roughly circular orbit at the calculated distance
  const angle = Math.random() * Math.PI * 2;
  
  return {
    x: distanceInAU * Math.cos(angle),
    y: 0, // Keeping articles roughly on the ecliptic plane
    z: distanceInAU * Math.sin(angle)
  };
};
