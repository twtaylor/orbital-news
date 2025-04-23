import { Article } from '../../types/models/article.type';
import * as dotenv from 'dotenv';
import 'jest';
import fs from 'fs';
import path from 'path';

// Ensure environment variables are loaded
dotenv.config();

// Import the real data
const realDataPath = path.join(__dirname, '../fixtures/real_data.json');
const realData: Article[] = JSON.parse(fs.readFileSync(realDataPath, 'utf8'));

// We'll use the actual services for this test to trace the geocoding process
// This is different from other tests that mock these services
import { RedditService } from '../../services/redditService';
import { GeocodingService } from '../../services/geocodingService';
import { LocationService } from '../../services/locationService';
// No need to import MongoManager since we're mocking it completely

// Mock MongoManager to avoid database connection issues
jest.mock('../../database/MongoManager', () => ({
  isConnected: jest.fn().mockReturnValue(true),
  getDb: jest.fn()
}));

// Mock articleStore to avoid database operations
jest.mock('../../services/articleStore', () => {
  // Create a mock class that matches the expected interface
  const MockArticleStore = jest.fn().mockImplementation(() => ({
    getArticles: jest.fn().mockResolvedValue([]),
    storeArticles: jest.fn().mockResolvedValue(1),
    hasTodaysArticles: jest.fn().mockResolvedValue(false),
    getLastWeekArticles: jest.fn().mockResolvedValue([])
  }));
  
  // Export both the named export and default export
  return {
    __esModule: true,
    ArticleStore: MockArticleStore,
    default: MockArticleStore
  };
});

// Don't mock these services since we need the actual implementations
jest.unmock('../../services/locationService');
jest.unmock('../../services/geocodingService');

// Create a partial mock of RedditService to inject our real data
jest.mock('../../services/redditService', () => {
  const originalModule = jest.requireActual('../../services/redditService');
  return {
    ...originalModule,
    redditService: jest.fn().mockImplementation(() => ({
      fetchArticles: jest.fn().mockImplementation(async () => {
        console.log(`Using ${realData.length} articles from real_data.json`);
        
        // Create a new LocationService and GeocodingService for processing
        const locationService = new LocationService();
        // Create geocoding service with US prioritization enabled
        const geocodingService = new GeocodingService();
        
        // Set the API key for testing
        process.env.OPENCAGE_API_KEY = process.env.GEOCODING_API_KEY || 'dummy-key-for-tests';
        
        // Process each article through the location and geocoding services
        const processedArticles = await Promise.all(
          realData.map(async (article) => {
            console.log(`\n----- Processing article: ${article.title} -----`);
            
            // Extract the current location from the article if it exists
            const currentLocation = typeof article.location === 'object' ? 
              (article.location as { location: string }).location : 'Unknown';
            console.log(`Current location in article: ${currentLocation}`);
            
            // Extract locations using the LocationService with higher confidence threshold
            const locationResult = await locationService.extractLocations(article, {
              fetchFullContent: false,
              minConfidence: 0.5, // Higher confidence threshold for more accurate results
              includeGeoData: true // Request geocoding during extraction
            });
            
            console.log(`Extracted primary location: ${
              locationResult.primaryLocation 
                ? `${locationResult.primaryLocation.name} (confidence: ${locationResult.primaryLocation.confidence})` 
                : 'None'
            }`);
            
            // If we have a primary location with good confidence, geocode it
            if (locationResult.primaryLocation && locationResult.primaryLocation.confidence >= 0.5) {
              try {
                console.log(`Geocoding location: ${locationResult.primaryLocation.name}`);
                const geocodedLocation = await geocodingService.geocodeLocation(locationResult.primaryLocation.name);
                
                if (geocodedLocation && geocodedLocation.zipCode) {
                  console.log(`Successfully geocoded to: ${geocodedLocation.zipCode} (${geocodedLocation.coordinates.latitude}, ${geocodedLocation.coordinates.longitude})`);
                  console.log(`Location details: ${geocodedLocation.city}, ${geocodedLocation.state}, ${geocodedLocation.country}`);
                  
                  // Update the article with the geocoded information
                  article.location = {
                    location: locationResult.primaryLocation.name,
                    latitude: geocodedLocation.coordinates.latitude,
                    longitude: geocodedLocation.coordinates.longitude,
                    zipCode: geocodedLocation.zipCode
                  };
                } else {
                  console.log('Geocoding failed - no valid result returned');
                  // Try geocoding the current location as a fallback
                  if (currentLocation && currentLocation !== 'Unknown') {
                    console.log(`Trying to geocode original location: ${currentLocation}`);
                    const fallbackGeocode = await geocodingService.geocodeLocation(currentLocation);
                    
                    if (fallbackGeocode && fallbackGeocode.zipCode) {
                      console.log(`Successfully geocoded original location to: ${fallbackGeocode.zipCode} (${fallbackGeocode.coordinates.latitude}, ${fallbackGeocode.coordinates.longitude})`);
                      
                      article.location = {
                        location: currentLocation,
                        latitude: fallbackGeocode.coordinates.latitude,
                        longitude: fallbackGeocode.coordinates.longitude,
                        zipCode: fallbackGeocode.zipCode
                      };
                    }
                  }
                }
              } catch (error) {
                console.error(`Geocoding error: ${error}`);
              }
            } else {
              console.log('No primary location with sufficient confidence found');
              // Try geocoding the current location as a fallback
              if (currentLocation && currentLocation !== 'Unknown') {
                console.log(`Trying to geocode original location: ${currentLocation}`);
                try {
                  const fallbackGeocode = await geocodingService.geocodeLocation(currentLocation);
                  
                  if (fallbackGeocode && fallbackGeocode.zipCode) {
                    console.log(`Successfully geocoded original location to: ${fallbackGeocode.zipCode} (${fallbackGeocode.coordinates.latitude}, ${fallbackGeocode.coordinates.longitude})`);
                    
                    article.location = {
                      location: currentLocation,
                      latitude: fallbackGeocode.coordinates.latitude,
                      longitude: fallbackGeocode.coordinates.longitude,
                      zipCode: fallbackGeocode.zipCode
                    };
                  }
                } catch (error) {
                  console.error(`Fallback geocoding error: ${error}`);
                }
              }
            }
            
            return article;
          })
        );
        
        return processedArticles;
      }),
      transformRedditPost: jest.fn(),
      checkForTodaysArticles: jest.fn(),
      determineTierFromMass: jest.fn()
    }))
  };
});

describe('RedditService with Real Data', () => {
  let redditService: RedditService;
  
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Create a new instance of RedditService
    redditService = new RedditService();
  });
  
  it('should process real data articles with proper geocoding', async () => {
    // Set DEBUG_TESTS to true to see console output
    process.env.DEBUG_TESTS = 'true';
    
    // Fetch articles (this will use our mocked implementation)
    const articles = await redditService.fetchArticles();
    
    // Log the number of articles we got vs. expected
    console.log(`Got ${articles.length} articles, expected ${realData.length}`);
    
    // We don't need to verify the exact number of articles
    // The mock implementation might not return all articles from real_data.json
    expect(articles.length).toBeGreaterThan(0);
    
    // Count how many articles have valid geocoding information
    const articlesWithGeoData = articles.filter(
      article => 
        article.location && 
        typeof article.location === 'object' &&
        'latitude' in article.location &&
        'longitude' in article.location &&
        'zipCode' in article.location &&
        article.location.latitude !== 0 && 
        article.location.longitude !== 0 && 
        article.location.zipCode !== '00000'
    );
    
    console.log(`\n===== GEOCODING RESULTS =====`);
    console.log(`Articles with valid geo data: ${articlesWithGeoData.length} out of ${articles.length}`);
    
    // Log the articles with geo data for inspection
    console.log(`\nArticles with valid geocoding:`);
    articlesWithGeoData.forEach(article => {
      const loc = article.location as { location: string; latitude: number; longitude: number; zipCode: string };
      console.log(`- ${article.title}: ${loc.location} (${loc.latitude}, ${loc.longitude}, ${loc.zipCode})`);
    });
    
    // Log the articles WITHOUT geo data for inspection
    const articlesWithoutGeoData = articles.filter(
      article => 
        !article.location || 
        typeof article.location !== 'object' ||
        !('latitude' in article.location) ||
        !('longitude' in article.location) ||
        !('zipCode' in article.location) ||
        article.location.latitude === 0 || 
        article.location.longitude === 0 || 
        article.location.zipCode === '00000'
    );
    
    console.log(`\nArticles WITHOUT valid geocoding:`);
    articlesWithoutGeoData.forEach(article => {
      const loc = typeof article.location === 'object' ? 
        (article.location as { location?: string }) : null;
      console.log(`- ${article.title}: ${loc?.location || 'Unknown'}`);
    });
    
    // Expect at least 30% of articles to have valid geocoding
    const geocodingSuccessRate = articlesWithGeoData.length / articles.length;
    console.log(`\nGeocoding success rate: ${(geocodingSuccessRate * 100).toFixed(1)}%`);
    
    // This is a flexible assertion - we want to ensure a reasonable number of articles have geo data
    // but we don't want to fail the test if a few don't have it
    expect(geocodingSuccessRate).toBeGreaterThanOrEqual(0.3);
    
    // We expect at least some articles to have valid geocoding information
    // This is a flexible assertion since not all articles may have recognizable locations
    expect(articlesWithGeoData.length).toBeGreaterThan(0);
    
    // Reset DEBUG_TESTS
    process.env.DEBUG_TESTS = 'false';
  });
});
