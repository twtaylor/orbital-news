import { LocationService } from '../../services/locationService';
import { GeocodingService } from '../../services/geocodingService';
import { Article } from '../../types/models/article.type';
import 'jest';

// Set longer timeout for all tests in this suite due to API calls
jest.setTimeout(30000);

describe('LocationService Edge Cases', () => {
  let locationService: LocationService;

  beforeAll(() => {
    locationService = new LocationService();
  });

  describe('Broad Location Handling', () => {
    it('should handle very broad locations like countries', async () => {
      const article: Article = {
        id: 'test-broad-location',
        title: 'Economic Impact of Trade Policies in America',
        content: `
          America's economy has been significantly affected by recent trade policies.
          The United States has seen changes in manufacturing and agricultural sectors.
          Across America, businesses are adapting to new international trade agreements.
        `,
        source: 'test',
        sourceUrl: 'https://example.com/america-economy',
        mass: 150000,
        publishedAt: new Date().toISOString(),
        location: '',
        tags: ['economy', 'trade']
      };

      const result = await locationService.extractLocations(article, {
        fetchFullContent: false,
        includeGeoData: true
      });

      // Verify results
      expect(result.allLocations.length).toBeGreaterThan(0);
      expect(result.primaryLocation).toBeDefined();
      
      // Check if America/United States was detected
      const hasAmerica = result.allLocations.some(loc => 
        loc.name.toLowerCase().includes('america') || 
        loc.name.toLowerCase().includes('united states')
      );
      expect(hasAmerica).toBe(true);
      
      // Check if the primary location has coordinates
      if (result.primaryLocation) {
        console.log('Primary location for broad test:', result.primaryLocation);
        // Even broad locations should have some coordinates, even if they're approximate
        expect(result.primaryLocation.latitude).toBeDefined();
        expect(result.primaryLocation.longitude).toBeDefined();
      }
    });
  });

  describe('Ambiguous Location Names', () => {
    it('should handle ambiguous location names like "Washington"', async () => {
      const article: Article = {
        id: 'test-ambiguous-location',
        title: 'Political Developments in Washington',
        content: `
          Recent political developments in Washington have caught national attention.
          The governor announced new initiatives for the state's economy.
          Meanwhile, in Washington DC, Congress is debating new legislation.
        `,
        source: 'test',
        sourceUrl: 'https://example.com/washington-politics',
        mass: 150000,
        publishedAt: new Date().toISOString(),
        location: '',
        tags: ['politics', 'government']
      };

      const result = await locationService.extractLocations(article, {
        fetchFullContent: false,
        includeGeoData: true
      });

      // Verify results
      expect(result.allLocations.length).toBeGreaterThan(0);
      expect(result.primaryLocation).toBeDefined();
      
      // Check if Washington was detected
      const hasWashington = result.allLocations.some(loc => 
        loc.name.toLowerCase().includes('washington')
      );
      expect(hasWashington).toBe(true);
      
      // Log the disambiguation result
      if (result.primaryLocation) {
        console.log('Primary location for ambiguous test:', result.primaryLocation);
        // For ambiguous locations, we should have some coordinates
        expect(result.primaryLocation.latitude).toBeDefined();
        expect(result.primaryLocation.longitude).toBeDefined();
      }
    });

    it('should handle another ambiguous location "Georgia"', async () => {
      const article: Article = {
        id: 'test-georgia-ambiguous',
        title: 'Economic Development in Georgia',
        content: `
          Georgia has seen significant economic development in recent years.
          The state's technology sector is growing rapidly.
          Atlanta continues to be a hub for business in the Southeast.
        `,
        source: 'test',
        sourceUrl: 'https://example.com/georgia-economy',
        mass: 150000,
        publishedAt: new Date().toISOString(),
        location: '',
        tags: ['economy', 'business']
      };

      const result = await locationService.extractLocations(article, {
        fetchFullContent: false,
        includeGeoData: true
      });

      // Verify results
      expect(result.allLocations.length).toBeGreaterThan(0);
      
      // Check if Georgia was detected
      const hasGeorgia = result.allLocations.some(loc => 
        loc.name.toLowerCase().includes('georgia')
      );
      expect(hasGeorgia).toBe(true);
      
      // Check if Atlanta was detected (helps with disambiguation)
      const hasAtlanta = result.allLocations.some(loc => 
        loc.name.toLowerCase().includes('atlanta')
      );
      
      // Log the disambiguation result
      if (result.primaryLocation) {
        console.log('Primary location for Georgia test:', result.primaryLocation);
        // For Georgia with Atlanta mentioned, it should prioritize the US state
        if (hasAtlanta) {
          expect(result.primaryLocation.country?.toLowerCase()).toContain('united states');
        }
      }
    });
  });

  describe('Confidence Threshold Impact', () => {
    it('should return different results with different confidence thresholds', async () => {
      const article: Article = {
        id: 'test-confidence-threshold',
        title: 'Global Climate Conference',
        content: `
          The Global Climate Conference began today in Paris, France.
          Representatives from the United States, China, and India presented their plans.
          European Union officials emphasized the need for cooperation.
          The conference will continue for two weeks at the Paris Convention Center.
        `,
        source: 'test',
        sourceUrl: 'https://example.com/climate-conference',
        mass: 150000,
        publishedAt: new Date().toISOString(),
        location: '',
        tags: ['climate', 'international']
      };

      // Test with low confidence threshold
      const lowThresholdResult = await locationService.extractLocations(article, {
        fetchFullContent: false,
        minConfidence: 0.2
      });

      // Test with high confidence threshold
      const highThresholdResult = await locationService.extractLocations(article, {
        fetchFullContent: false,
        minConfidence: 0.6
      });

      // Verify results
      expect(lowThresholdResult.allLocations.length).toBeGreaterThanOrEqual(highThresholdResult.allLocations.length);
      
      console.log('Low threshold locations:', lowThresholdResult.allLocations.length);
      console.log('High threshold locations:', highThresholdResult.allLocations.length);
      
      // The primary location should be the same regardless of threshold
      // (assuming the highest confidence location exceeds both thresholds)
      if (highThresholdResult.primaryLocation && lowThresholdResult.primaryLocation) {
        expect(highThresholdResult.primaryLocation.name).toBe(lowThresholdResult.primaryLocation.name);
      }
    });
  });

  describe('Geocoding Fallback', () => {
    it('should handle geocoding failures gracefully', async () => {
      // Create a mock article with a fictional location
      const article: Article = {
        id: 'test-geocoding-fallback',
        title: 'Events in Fictional City',
        content: `
          Recent developments in Neverland have sparked interest.
          The mayor of Atlantis announced new underwater initiatives.
          Meanwhile, in El Dorado, gold prices continue to rise.
        `,
        source: 'test',
        sourceUrl: 'https://example.com/fictional-places',
        mass: 150000,
        publishedAt: new Date().toISOString(),
        location: '',
        tags: ['fiction', 'events']
      };

      const result = await locationService.extractLocations(article, {
        fetchFullContent: false,
        includeGeoData: true
      });

      // Verify results
      expect(result.allLocations.length).toBeGreaterThan(0);
      
      // Even with fictional places, we should get a result
      // The system should not crash when geocoding fails
      expect(result).toBeDefined();
      
      console.log('Geocoding fallback test results:', result.primaryLocation);
    });
  });

  describe('Location Prioritization', () => {
    it('should prioritize specific locations over general ones', async () => {
      const article: Article = {
        id: 'test-location-priority',
        title: 'Local Event in Boston Draws National Attention',
        content: `
          A local event in Boston has drawn attention from across the United States.
          The mayor of Boston spoke at the event yesterday.
          Visitors from New York and Washington DC attended the celebration.
          The event highlighted Boston's importance in American history.
        `,
        source: 'test',
        sourceUrl: 'https://example.com/boston-event',
        mass: 150000,
        publishedAt: new Date().toISOString(),
        location: '',
        tags: ['events', 'local']
      };

      const result = await locationService.extractLocations(article, {
        fetchFullContent: false,
        includeGeoData: true
      });

      // Verify results
      expect(result.allLocations.length).toBeGreaterThan(0);
      expect(result.primaryLocation).toBeDefined();
      
      // Boston should be prioritized over United States
      if (result.primaryLocation) {
        expect(result.primaryLocation.name.toLowerCase()).toContain('boston');
        
        // Boston should have coordinates
        expect(result.primaryLocation.latitude).toBeDefined();
        expect(result.primaryLocation.longitude).toBeDefined();
      }
      
      // Check the ordering of locations
      const bostonIndex = result.allLocations.findIndex(loc => 
        loc.name.toLowerCase().includes('boston')
      );
      
      const usIndex = result.allLocations.findIndex(loc => 
        loc.name.toLowerCase().includes('united states') || 
        loc.name.toLowerCase() === 'america'
      );
      
      // If both are found, Boston should come before United States
      if (bostonIndex !== -1 && usIndex !== -1) {
        expect(bostonIndex).toBeLessThan(usIndex);
      }
    });

    it('should prioritize locations in the title', async () => {
      const article: Article = {
        id: 'test-title-priority',
        title: 'Chicago Hosts International Conference',
        content: `
          An international conference began today with representatives from many countries.
          The United States, Canada, and Mexico discussed trade agreements.
          European delegates emphasized climate initiatives.
          The conference will continue throughout the week.
        `,
        source: 'test',
        sourceUrl: 'https://example.com/chicago-conference',
        mass: 150000,
        publishedAt: new Date().toISOString(),
        location: '',
        tags: ['conference', 'international']
      };

      // Enable debug logging for this test
      const originalConsoleLog = console.log;
      console.log = (...args) => originalConsoleLog(...args);

      const result = await locationService.extractLocations(article, {
        fetchFullContent: false,
        includeGeoData: true
      });

      // Debug output
      console.log('All extracted locations:');
      result.allLocations.forEach(loc => {
        console.log(`- ${loc.name} (confidence: ${loc.confidence}, isUSLocation: ${loc.isUSLocation || false})`);
      });
      console.log('Primary location:', result.primaryLocation ? result.primaryLocation.name : 'none');

      // Verify results
      expect(result.allLocations.length).toBeGreaterThan(0);
      expect(result.primaryLocation).toBeDefined();
      
      // Chicago should be prioritized as it's in the title
      if (result.primaryLocation) {
        expect(result.primaryLocation.name.toLowerCase()).toContain('chicago');
      }

      // Restore console.log
      console.log = originalConsoleLog;
    });
  });
});
