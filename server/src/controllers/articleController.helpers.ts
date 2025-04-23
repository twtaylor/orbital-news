/**
 * Helper functions for article controller
 */

import { Article, ArticleWithTier, TierType } from '../types/models/article.type';
import { GeocodingService } from '../services/geocodingService';

/**
 * Add tier information to an article for API responses
 * This calculates the tier dynamically based on the article's location and user's location
 * @param article The article to add tier to
 * @returns The article with tier information
 */
export async function addTierToArticle(article: Article, geocodingService: GeocodingService): Promise<ArticleWithTier> {
  // Create a copy of the article with tier information
  const articleWithTier = { ...article } as ArticleWithTier;
  
  // Default tier is unknown
  articleWithTier.tier = 'unknown';
  
  try {
    // If the article has a location object, calculate the distance
    if (article.location && typeof article.location === 'object') {
      // Use the latitude and longitude directly
      try {
        const coordinates = {
          latitude: article.location.latitude,
          longitude: article.location.longitude
        };
        
        const distanceResult = await geocodingService.calculateDistance(
          geocodingService.getUserLocation(),
          coordinates
        );
        
        if (distanceResult) {
          // Convert to kilometers and miles
          const distanceInKm = distanceResult / 1000;
          const distanceInMiles = distanceInKm * 0.621371;
          
          // Add distance information to the article
          articleWithTier.distance = {
            meters: distanceResult,
            kilometers: distanceInKm,
            miles: distanceInMiles
          };
          
          // Determine the tier based on the distance in kilometers
          articleWithTier.tier = geocodingService.determineTierFromDistance(distanceInKm);
        }
      } catch (error) {
        console.warn(`Failed to calculate distance for article ${article.id}:`, error);
      }
    } else if (article.location && typeof article.location === 'string') {
      // If location is a string, geocode it to get coordinates
      try {
        const geocodedLocation = await geocodingService.geocodeLocation(article.location);
          
        if (geocodedLocation && geocodedLocation.coordinates) {
          // Calculate distance using the coordinates
          const distanceResult = await geocodingService.calculateDistance(
            geocodingService.getUserLocation(),
            geocodedLocation.coordinates
          );
          
          if (distanceResult) {
            // Convert to kilometers and miles
            const distanceInKm = distanceResult / 1000;
            const distanceInMiles = distanceInKm * 0.621371;
            
            // Add distance information to the article
            articleWithTier.distance = {
              meters: distanceResult,
              kilometers: distanceInKm,
              miles: distanceInMiles
            };
            
            // Determine the tier based on the distance
            articleWithTier.tier = geocodingService.determineTierFromDistance(distanceInKm);
          }
        }
      } catch (error) {
        console.warn(`Failed to calculate distance using location name for article ${article.id}:`, error);
      }
    }
 
    // If we can't calculate the tier, set it to medium
    if (articleWithTier.tier === 'unknown' || !articleWithTier.tier) {
      articleWithTier.tier = 'medium';
    }
    
    return articleWithTier;
  } catch (error) {
    console.error(`Error adding tier to article ${article.id}:`, error);
    return articleWithTier; // Return with unknown tier on error
  }
}

/**
 * Calculate tier based on article mass
 * @param mass Article mass
 * @returns Tier type
 */
export function calculateTierFromMass(mass: number): TierType {
  if (mass >= 100) {
    return 'close';
  } else if (mass >= 50) {
    return 'medium';
  } else {
    return 'far';
  }
}

/**
 * Group articles by their tier
 * @param articles Array of articles with tier information
 * @returns Object with articles grouped by tier
 */
export function groupArticlesByTier0(articles: ArticleWithTier[]) {
  return {
    close: articles.filter(article => article.tier === 'close'),
    medium: articles.filter(article => article.tier === 'medium'),
    far: articles.filter(article => article.tier === 'far'),
    unknown: articles.filter(article => article.tier === 'unknown')
  };
}
