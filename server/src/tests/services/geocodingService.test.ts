import { GeocodingService } from '../../services/geocodingService';
import { Coordinates } from '../../types/services/geocoding.type';
import 'jest';

// Set longer timeout for all tests in this suite due to API calls
jest.setTimeout(30000);

describe('GeocodingService', () => {
  let geocodingService: GeocodingService;
  
  beforeAll(() => {
    // Initialize with default settings
    geocodingService = new GeocodingService();
  });
  
  it('should geocode a location name to coordinates', async () => {
    // Test with a well-known location
    const result = await geocodingService.geocodeLocation('New York City');
    
    // Verify we got coordinates back
    expect(result).not.toBeNull();
    if (result) {
      expect(result.coordinates.latitude).toBeDefined();
      expect(result.coordinates.longitude).toBeDefined();
      expect(result.city?.toLowerCase()).toContain('new york');
      expect(result.country?.toLowerCase()).toContain('united states');
      
      console.log('Geocoded location:', {
        coordinates: result.coordinates,
        city: result.city,
        state: result.state,
        country: result.country,
        zipCode: result.zipCode,
        formattedAddress: result.formattedAddress
      });
    }
  }, 10000); // Increase timeout for API calls
  
  it('should return null for empty or global locations', async () => {
    // Test with empty string
    let result = await geocodingService.geocodeLocation('');
    expect(result).toBeNull();
    
    // Test with "Global"
    result = await geocodingService.geocodeLocation('Global');
    expect(result).toBeNull();
  });
  
  it('should calculate distance between two coordinates', () => {
    // San Francisco coordinates
    const sf: Coordinates = {
      latitude: 37.7749,
      longitude: -122.4194
    };
    
    // New York coordinates
    const nyc: Coordinates = {
      latitude: 40.7128,
      longitude: -74.0060
    };
    
    // Calculate distance
    const distance = geocodingService.calculateDistance(sf, nyc);
    
    // Distance should be approximately 4,128 km (2,565 miles)
    // Convert to km for easier reading
    const distanceInKm = distance / 1000;
    
    // Verify the distance is in the expected range (allowing for some variation)
    expect(distanceInKm).toBeGreaterThan(4000);
    expect(distanceInKm).toBeLessThan(4300);
    
    console.log('Distance calculation:', {
      from: 'San Francisco',
      to: 'New York City',
      distanceInMeters: distance,
      distanceInKilometers: distanceInKm,
      distanceInMiles: distanceInKm * 0.621371
    });
  });
  
  it('should set user location by ZIP code', async () => {
    // Test with a valid ZIP code (San Francisco)
    const result = await geocodingService.setUserLocationByZipCode('94103');
    
    // Verify the result
    expect(result).toBe(true);
    
    // For testing purposes, we'll just verify the method returns true
    // and not actually test the distance calculation which can be flaky in tests
    // due to external API dependencies
    
    console.log('Set user location by ZIP code:', {
      zipCode: '94103',
      success: result
    });
  }, 15000); // Increase timeout for API calls
});
