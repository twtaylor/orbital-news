/**
 * GeocodingService
 * 
 * This service provides geocoding functionality to convert location names to coordinates
 * and calculate distances between locations.
 */

import NodeGeocoder from 'node-geocoder';
import * as geolib from 'geolib';
import * as dotenv from 'dotenv';
import { 
  Coordinates,
  GeocodedLocation, 
  DistanceResult, 
  GeocodingOptions,
  TierThresholds
} from '../types/services/geocoding.type';
import { TierType } from '../types/models/article.type';

// Load environment variables
dotenv.config();

export class GeocodingService {
  private geocoder!: NodeGeocoder.Geocoder; // Using the definite assignment assertion
  private tierThresholds: TierThresholds;
  private defaultUserLocation: Coordinates;
  private defaultUserZipCode: string = '00000'; // Default ZIP code
  private isUSPrioritizationEnabled: boolean = true; // Flag to enable/disable US location prioritization

  /**
   * Initialize the GeocodingService
   * @param options Geocoding options
   * @param tierThresholds Distance thresholds for tiers in kilometers
   * @param defaultUserLocation Default user location if not specified
   */
  constructor(
    options: GeocodingOptions = {}, 
    tierThresholds: TierThresholds = { close: 240, medium: 1600 }, // 0-150 miles, 151-1000 miles, >1000 miles
    defaultUserLocation: Coordinates = { latitude: 35.4676, longitude: -97.5164 } // Oklahoma City (central US)
  ) {
    // Set up the tierThresholds and defaultUserLocation
    this.tierThresholds = tierThresholds;
    this.defaultUserLocation = defaultUserLocation;
    
    // Check if we're in a test environment
    const isTestEnvironment = process.env.NODE_ENV === 'test';
    
    if (isTestEnvironment) {
      // In test environment, use a mock geocoder
      this.setupMockGeocoder();
      return;
    }
    
    // In non-test environments, use real geocoder with API key
    
    // Get provider and API key from environment variables
    const provider = process.env.GEOCODING_PROVIDER || options.provider;
    const apiKey = process.env.GEOCODING_API_KEY || options.apiKey;
    
    // Validate that we have the required geocoding configuration
    if (!provider || !apiKey) {
      const missingVars = [];
      if (!provider) missingVars.push('GEOCODING_PROVIDER');
      if (!apiKey) missingVars.push('GEOCODING_API_KEY');
      
      const errorMessage = `Missing required geocoding configuration: ${missingVars.join(', ')}. Please set these in your .env file or environment variables.`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
    
    // Configure the geocoder with the provider and API key
    const geocoderOptions: NodeGeocoder.Options = {
      provider,
      httpAdapter: options.httpAdapter || 'https',
      apiKey,
      formatter: null,
    } as unknown as NodeGeocoder.Options;

    this.geocoder = NodeGeocoder(geocoderOptions);
    console.log(`Geocoding service initialized with provider: ${provider}`);
  }
  
  /**
   * Set up a mock geocoder for testing
   * This avoids making real API calls during tests
   */
  private setupMockGeocoder(): void {
    // Create a mock geocoder that returns predictable results
    this.geocoder = {
      geocode: async (query: string) => {
        // Return mock data based on the query
        if (query.toLowerCase().includes('new york')) {
          return [{
            latitude: 40.7128,
            longitude: -74.0060,
            country: 'United States',
            state: 'New York',
            city: 'New York City',
            zipcode: '10001',
            formattedAddress: 'New York City, NY, USA'
          }];
        } else if (query.toLowerCase().includes('san francisco')) {
          return [{
            latitude: 37.7749,
            longitude: -122.4194,
            country: 'United States',
            state: 'California',
            city: 'San Francisco',
            zipcode: '94103',
            formattedAddress: 'San Francisco, CA, USA'
          }];
        } else if (query.toLowerCase().includes('london')) {
          return [{
            latitude: 51.5074,
            longitude: -0.1278,
            country: 'United Kingdom',
            state: 'England',
            city: 'London',
            zipcode: 'SW1A 1AA',
            formattedAddress: 'London, UK'
          }];
        }
        
        // Default mock response for any other query
        return [{
          latitude: 35.4676,
          longitude: -97.5164,
          country: 'United States',
          state: 'Oklahoma',
          city: 'Oklahoma City',
          zipcode: '73102',
          formattedAddress: 'Oklahoma City, OK, USA'
        }];
      },
      reverse: async () => {
        // Mock reverse geocoding (not used in most tests)
        return [{
          latitude: 35.4676,
          longitude: -97.5164,
          country: 'United States',
          state: 'Oklahoma',
          city: 'Oklahoma City',
          zipcode: '73102',
          formattedAddress: 'Oklahoma City, OK, USA'
        }];
      }
    } as unknown as NodeGeocoder.Geocoder;
    
    console.log('Geocoding service initialized with mock geocoder for testing');
  }

  /**
   * Geocode a location name to coordinates and address details
   * @param locationName The name of the location to geocode
   * @returns Promise with geocoded location details
   */
  async geocodeLocation(locationName: string): Promise<GeocodedLocation | null> {
    try {
      if (!locationName || locationName.trim() === '' || locationName.toLowerCase() === 'global') {
        return null;
      }

      // No special logging
      const results = await this.geocoder.geocode(locationName);

      if (results && results.length > 0) {
        // If US prioritization is enabled, check if there are any US locations in the results
        if (this.isUSPrioritizationEnabled && results.length > 1) {
          // Look for US locations in the results
          const usResults = results.filter(result => 
            result.country === 'United States' || 
            result.country === 'USA' || 
            result.country === 'US'
          );
          
          // If we found US locations, use the first one
          if (usResults.length > 0) {
            console.debug(`Prioritizing US location for: ${locationName}`);
            const result = usResults[0];
            
            return {
              coordinates: {
                latitude: result.latitude || 0,
                longitude: result.longitude || 0
              },
              zipCode: result.zipcode,
              city: result.city,
              state: result.state,
              country: result.country,
              formattedAddress: result.formattedAddress,
              isUSLocation: true
            };
          }
        }
        
        // If no US locations were found or US prioritization is disabled, use the first result
        const result = results[0];
        const isUSLocation = 
          result.country === 'United States' || 
          result.country === 'USA' || 
          result.country === 'US';
        
        return {
          coordinates: {
            latitude: result.latitude || 0,
            longitude: result.longitude || 0
          },
          zipCode: result.zipcode,
          city: result.city,
          state: result.state,
          country: result.country,
          formattedAddress: result.formattedAddress,
          isUSLocation: isUSLocation
        };
      }
      
      return null;
    } catch (error) {
      // console.error('Error geocoding location:', error);
      return null;
    }
  }

  /**
   * Calculate the distance between two sets of coordinates
   * @param from Starting coordinates
   * @param to Ending coordinates
   * @returns Distance in meters
   */
  calculateDistance(from: Coordinates, to: Coordinates): number {
    return geolib.getDistance(
      { latitude: from.latitude, longitude: from.longitude },
      { latitude: to.latitude, longitude: to.longitude }
    );
  }

  /**
   * Calculate the distance between a location and the user's location
   * @param locationName The name of the location
   * @param userLocation Optional user location, defaults to San Francisco
   * @returns Promise with distance result
   */
  async calculateDistanceFromUser(
    locationName: string, 
    userLocation: Coordinates = this.defaultUserLocation
  ): Promise<DistanceResult | null> {
    try {
      const geocodedLocation = await this.geocodeLocation(locationName);
      
      if (!geocodedLocation) {
        return null;
      }

      const distanceInMeters = this.calculateDistance(
        userLocation,
        geocodedLocation.coordinates
      );

      const distanceInKilometers = distanceInMeters / 1000;
      const distanceInMiles = distanceInKilometers * 0.621371;

      // Determine tier based on distance
      const tier = this.determineTierFromDistance(distanceInKilometers);

      return {
        distanceInMeters,
        distanceInKilometers,
        distanceInMiles,
        tier
      };
    } catch (error) {
      // console.error('Error calculating distance:', error);
      return null;
    }
  }

  /**
   * Determine the tier based on distance in kilometers
   * @param distanceInKm Distance in kilometers
   * @returns Tier type (close, medium, far)
   */
  determineTierFromDistance(distanceInKm: number): TierType {
    if (distanceInKm <= this.tierThresholds.close) {
      return 'close';
    } else if (distanceInKm <= this.tierThresholds.medium) {
      return 'medium';
    } else {
      return 'far';
    }
  }

  /**
   * Set the user's location
   * @param coordinates User's coordinates or ZIP code
   * @returns Promise that resolves when the location is set
   */
  async setUserLocation(coordinates: Coordinates | string): Promise<boolean> {
    if (typeof coordinates === 'string') {
      // If a string is provided, assume it's a ZIP code
      return this.setUserLocationByZipCode(coordinates);
    } else {
      // If coordinates are provided, set them directly
      this.defaultUserLocation = coordinates;
      return true;
    }
  }
  
  /**
   * Get the user's current location
   * @returns The user's current location coordinates
   */
  getUserLocation(): Coordinates {
    return this.defaultUserLocation;
  }

  /**
   * Get the default user ZIP code
   * @returns The default user ZIP code
   */
  getDefaultUserZipCode(): string {
    return this.defaultUserZipCode;
  }
  
  /**
   * Calculate distance between two ZIP codes
   * @param fromZipCode Starting ZIP code
   * @param toZipCode Ending ZIP code
   * @returns Promise with distance result
   */
  async calculateDistanceBetweenZipCodes(
    fromZipCode: string,
    toZipCode: string
  ): Promise<DistanceResult | null> {
    try {
      // Geocode both ZIP codes to get coordinates
      const fromLocation = await this.geocodeLocation(fromZipCode);
      const toLocation = await this.geocodeLocation(toZipCode);
      
      if (!fromLocation || !toLocation) {
        return null;
      }
      
      const distanceInMeters = this.calculateDistance(
        fromLocation.coordinates,
        toLocation.coordinates
      );
      
      const distanceInKilometers = distanceInMeters / 1000;
      const distanceInMiles = distanceInKilometers * 0.621371;
      
      // Determine tier based on distance
      const tier = this.determineTierFromDistance(distanceInKilometers);
      
      return {
        distanceInMeters,
        distanceInKilometers,
        distanceInMiles,
        tier,
        fromLocation,
        toLocation
      };
    } catch (error) {
      console.error('Error calculating distance between ZIP codes:', error);
      return null;
    }
  }
  
  /**
   * Set the user's location by ZIP code
   * @param zipCode ZIP code to set as user location
   * @returns Promise that resolves when the location is set
   */
  async setUserLocationByZipCode(zipCode: string): Promise<boolean> {
    try {
      const results = await this.geocoder.geocode(zipCode);
      
      if (results && results.length > 0) {
        const result = results[0];
        
        if (result.latitude && result.longitude) {
          this.defaultUserLocation = {
            latitude: result.latitude,
            longitude: result.longitude
          };
          
          this.defaultUserZipCode = zipCode;
          console.log(`User location set to ${result.formattedAddress} by ZIP code ${zipCode}`);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error setting user location by ZIP code:', error);
      return false;
    }
  }
  
  /**
   * Enable or disable US location prioritization
   * @param enabled Whether to enable US location prioritization
   */
  setUSPrioritization(enabled: boolean): void {
    this.isUSPrioritizationEnabled = enabled;
    console.log(`US location prioritization ${enabled ? 'enabled' : 'disabled'}`);
  }
}
