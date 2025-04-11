import { LocationService } from '../../services/locationService';
import { GeocodingService } from '../../services/geocodingService';
import { Article } from '../../types/models/article.type';
import * as dotenv from 'dotenv';
import 'jest';

// Ensure environment variables are loaded
dotenv.config();

/**
 * Test for location-based tier determination
 * This test verifies that articles with location mentions are correctly assigned tiers
 * based on their geographic distance from the user's location (Oklahoma City)
 */
describe('Location-based Tier Tests', () => {
  let locationService: LocationService;
  let geocodingService: GeocodingService;

  beforeAll(() => {
    locationService = new LocationService();
    geocodingService = new GeocodingService();
  });

  test('should correctly determine tier for Florida article', async () => {
    // Create a test article with Florida in the title
    const floridaArticle: Article = {
      id: 'test-florida',
      title: 'Florida teacher loses job for calling student by wrong name',
      content: 'A teacher in Florida was fired after repeatedly calling a student by the wrong name despite corrections.',
      source: 'reddit',
      sourceUrl: 'https://reddit.com/r/news/test-florida',
      author: 'test_user',
      publishedAt: new Date().toISOString(),
      location: '',
      mass: 120000,
      tier: 'medium', // Initial tier based on mass
      read: false
    };

    // Step 1: Test direct location extraction from the article
    const extractedLocation = await locationService.extractLocations(floridaArticle, {
      fetchFullContent: false,
      minConfidence: 0.4
    });

    console.log('Extracted location result:', {
      primaryLocation: extractedLocation.primaryLocation ? {
        name: extractedLocation.primaryLocation.name,
        confidence: extractedLocation.primaryLocation.confidence
      } : null,
      allLocations: extractedLocation.allLocations.map(loc => ({ name: loc.name, confidence: loc.confidence })),
      tier: extractedLocation.tier
    });

    // Verify that Florida was extracted from the article
    expect(extractedLocation.primaryLocation).toBeDefined();
    if (extractedLocation.primaryLocation) {
      expect(extractedLocation.primaryLocation.name.toLowerCase()).toContain('florida');
    }

    // Step 2: Test direct distance calculation for Florida
    const distanceResult = await geocodingService.calculateDistanceFromUser('Florida');
    
    console.log('Distance calculation result:', {
      location: 'Florida',
      distance: distanceResult ? {
        miles: Math.round(distanceResult.distanceInMiles),
        kilometers: Math.round(distanceResult.distanceInKilometers)
      } : 'Failed to calculate distance',
      tier: distanceResult?.tier
    });

    // Verify that Florida is correctly identified as a far distance from Oklahoma City
    expect(distanceResult).toBeDefined();
    if (distanceResult) {
      expect(distanceResult.tier).toBe('far');
      
      // Florida is more than 1000 miles from Oklahoma City
      expect(distanceResult.distanceInMiles).toBeGreaterThan(1000);
      console.log(`Exact distance from Oklahoma City to Florida: ${distanceResult.distanceInMiles.toFixed(2)} miles`);
    }

    // Step 3: Test that the LocationService correctly determines the tier based on the extracted location
    // This tests the complete flow from article → location extraction → geocoding → tier determination
    const fullResult = await locationService.extractLocations(floridaArticle, {
      fetchFullContent: false,
      minConfidence: 0.3,
      includeGeoData: true // Make sure to include geo data for tier determination
    });
    
    console.log('Full extraction result with tier:', {
      location: fullResult.primaryLocation?.name,
      tier: fullResult.tier,
      distanceResult: fullResult.distanceResult ? {
        miles: Math.round(fullResult.distanceResult.distanceInMiles),
        kilometers: Math.round(fullResult.distanceResult.distanceInKilometers)
      } : null
    });
    
    // Verify that the location-based tier was determined correctly
    expect(fullResult.tier).toBe('far'); // Florida is far (>1000 miles) from Oklahoma City
  });
});
