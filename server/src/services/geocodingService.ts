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
  private _apiKey: string = '';
  private _userCoordinates?: Coordinates;
  private _userZipCode?: string;
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

      // Normalize the location name to handle special cases
      const normalizedLocationName = this.normalizeLocationName(locationName);
      console.debug(`Geocoding location: ${locationName} (normalized to: ${normalizedLocationName})`);

      // Check if this is a US state that we can handle directly
      const stateResult = this.handleUSState(normalizedLocationName);
      if (stateResult) {
        console.debug(`Found direct match for US state: ${normalizedLocationName}`);
        return stateResult;
      }

      // Perform the geocoding with the normalized location name
      const results = await this.geocoder.geocode(normalizedLocationName);

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
            console.debug(`Prioritizing US location for: ${normalizedLocationName}`);
            const result = usResults[0];
            
            return {
              coordinates: {
                latitude: result.latitude || 0,
                longitude: result.longitude || 0
              },
              zipCode: result.zipcode || this.getDefaultZipCodeForState(result.state),
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
          zipCode: result.zipcode || (isUSLocation ? this.getDefaultZipCodeForState(result.state) : '00000'),
          city: result.city,
          state: result.state,
          country: result.country,
          formattedAddress: result.formattedAddress,
          isUSLocation: isUSLocation
        };
      }
      
      // If we couldn't geocode the location, try one more time with a more generic query
      // This helps with cases like "Florida" where we want to ensure we get the state
      if (normalizedLocationName !== locationName) {
        console.debug(`Trying again with original location name: ${locationName}`);
        const fallbackResults = await this.geocoder.geocode(locationName);
        
        if (fallbackResults && fallbackResults.length > 0) {
          const result = fallbackResults[0];
          const isUSLocation = 
            result.country === 'United States' || 
            result.country === 'USA' || 
            result.country === 'US';
          
          return {
            coordinates: {
              latitude: result.latitude || 0,
              longitude: result.longitude || 0
            },
            zipCode: result.zipcode || (isUSLocation ? this.getDefaultZipCodeForState(result.state) : '00000'),
            city: result.city,
            state: result.state,
            country: result.country,
            formattedAddress: result.formattedAddress,
            isUSLocation: isUSLocation
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error geocoding location:', error);
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
   * Get the user's coordinates
   * @returns User coordinates or undefined if not set
   */
  getUserCoordinates(): Coordinates | undefined {
    return this._userCoordinates;
  }

  /**
   * Set the user's coordinates
   * @param coordinates User coordinates
   */
  setUserCoordinates(coordinates: Coordinates): void {
    this._userCoordinates = coordinates;
  }

  /**
   * Get the default user ZIP code
   * @returns The default user ZIP code
   */
  getDefaultUserZipCode(): string {
    return this.defaultUserZipCode;
  }

  /**
   * Set the default user ZIP code
   * @param zipCode ZIP code
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

  /**
   * Normalize a location name to handle special cases
   * @param locationName The location name to normalize
   * @returns Normalized location name
   */
  private normalizeLocationName(locationName: string): string {
    if (!locationName) return locationName;
    
    let normalized = locationName.trim();
    
    // Handle Washington DC variations
    if (normalized.match(/washington\s*,?\s*d\.?c\.?/i) ||
        normalized.match(/washington\s*,?\s*district\s*of\s*columbia/i)) {
      return 'Washington DC, USA';
    }
    
    // Handle abbreviated state names
    if (normalized === 'La' || normalized === 'LA') {
      // Check if this is likely Louisiana or Los Angeles
      return 'Louisiana, USA'; // Default to the state
    }
    
    // Handle state names without USA
    const usStates = [
      'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 
      'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 
      'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 
      'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 
      'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 
      'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 
      'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 
      'Wisconsin', 'Wyoming'
    ];
    
    // If the location is just a state name, add USA to improve geocoding
    if (usStates.some(state => state.toLowerCase() === normalized.toLowerCase())) {
      return `${normalized}, USA`;
    }
    
    return normalized;
  }

  /**
   * Handle US state geocoding directly without API calls
   * @param locationName The normalized location name
   * @returns GeocodedLocation for the state or null if not a state
   */
  private handleUSState(locationName: string): GeocodedLocation | null {
    // Map of state names to their coordinates and default ZIP codes
    const stateData: { [key: string]: { lat: number, lng: number, zipCode: string } } = {
      'alabama, usa': { lat: 32.806671, lng: -86.791130, zipCode: '36104' }, // Montgomery
      'alaska, usa': { lat: 61.370716, lng: -152.404419, zipCode: '99801' }, // Juneau
      'arizona, usa': { lat: 33.729759, lng: -111.431221, zipCode: '85001' }, // Phoenix
      'arkansas, usa': { lat: 34.969704, lng: -92.373123, zipCode: '72201' }, // Little Rock
      'california, usa': { lat: 36.116203, lng: -119.681564, zipCode: '94203' }, // Sacramento
      'colorado, usa': { lat: 39.059811, lng: -105.311104, zipCode: '80202' }, // Denver
      'connecticut, usa': { lat: 41.597782, lng: -72.755371, zipCode: '06103' }, // Hartford
      'delaware, usa': { lat: 39.318523, lng: -75.507141, zipCode: '19901' }, // Dover
      'florida, usa': { lat: 27.766279, lng: -81.686783, zipCode: '32301' }, // Tallahassee
      'georgia, usa': { lat: 33.040619, lng: -83.643074, zipCode: '30301' }, // Atlanta
      'hawaii, usa': { lat: 21.094318, lng: -157.498337, zipCode: '96813' }, // Honolulu
      'idaho, usa': { lat: 44.240459, lng: -114.478828, zipCode: '83702' }, // Boise
      'illinois, usa': { lat: 40.349457, lng: -88.986137, zipCode: '62701' }, // Springfield
      'indiana, usa': { lat: 39.849426, lng: -86.258278, zipCode: '46204' }, // Indianapolis
      'iowa, usa': { lat: 42.011539, lng: -93.210526, zipCode: '50309' }, // Des Moines
      'kansas, usa': { lat: 38.526600, lng: -96.726486, zipCode: '66603' }, // Topeka
      'kentucky, usa': { lat: 37.668140, lng: -84.670067, zipCode: '40601' }, // Frankfort
      'louisiana, usa': { lat: 31.169546, lng: -91.867805, zipCode: '70802' }, // Baton Rouge
      'maine, usa': { lat: 44.693947, lng: -69.381927, zipCode: '04330' }, // Augusta
      'maryland, usa': { lat: 39.063946, lng: -76.802101, zipCode: '21401' }, // Annapolis
      'massachusetts, usa': { lat: 42.230171, lng: -71.530106, zipCode: '02201' }, // Boston
      'michigan, usa': { lat: 43.326618, lng: -84.536095, zipCode: '48933' }, // Lansing
      'minnesota, usa': { lat: 45.694454, lng: -93.900192, zipCode: '55101' }, // St. Paul
      'mississippi, usa': { lat: 32.741646, lng: -89.678696, zipCode: '39201' }, // Jackson
      'missouri, usa': { lat: 38.456085, lng: -92.288368, zipCode: '65101' }, // Jefferson City
      'montana, usa': { lat: 46.921925, lng: -110.454353, zipCode: '59601' }, // Helena
      'nebraska, usa': { lat: 41.125370, lng: -98.268082, zipCode: '68502' }, // Lincoln
      'nevada, usa': { lat: 38.313515, lng: -117.055374, zipCode: '89701' }, // Carson City
      'new hampshire, usa': { lat: 43.452492, lng: -71.563896, zipCode: '03301' }, // Concord
      'new jersey, usa': { lat: 40.298904, lng: -74.521011, zipCode: '08608' }, // Trenton
      'new mexico, usa': { lat: 34.840515, lng: -106.248482, zipCode: '87501' }, // Santa Fe
      'new york, usa': { lat: 42.165726, lng: -74.948051, zipCode: '12207' }, // Albany
      'north carolina, usa': { lat: 35.630066, lng: -79.806419, zipCode: '27601' }, // Raleigh
      'north dakota, usa': { lat: 47.528912, lng: -99.784012, zipCode: '58501' }, // Bismarck
      'ohio, usa': { lat: 40.388783, lng: -82.764915, zipCode: '43215' }, // Columbus
      'oklahoma, usa': { lat: 35.565342, lng: -96.928917, zipCode: '73102' }, // Oklahoma City
      'oregon, usa': { lat: 44.572021, lng: -122.070938, zipCode: '97301' }, // Salem
      'pennsylvania, usa': { lat: 40.590752, lng: -77.209755, zipCode: '17101' }, // Harrisburg
      'rhode island, usa': { lat: 41.680893, lng: -71.511780, zipCode: '02903' }, // Providence
      'south carolina, usa': { lat: 33.856892, lng: -80.945007, zipCode: '29201' }, // Columbia
      'south dakota, usa': { lat: 44.299782, lng: -99.438828, zipCode: '57501' }, // Pierre
      'tennessee, usa': { lat: 35.747845, lng: -86.692345, zipCode: '37201' }, // Nashville
      'texas, usa': { lat: 31.054487, lng: -97.563461, zipCode: '73301' }, // Austin
      'utah, usa': { lat: 40.150032, lng: -111.862434, zipCode: '84101' }, // Salt Lake City
      'vermont, usa': { lat: 44.045876, lng: -72.710686, zipCode: '05602' }, // Montpelier
      'virginia, usa': { lat: 37.769337, lng: -78.169968, zipCode: '23218' }, // Richmond
      'washington, usa': { lat: 47.400902, lng: -121.490494, zipCode: '98501' }, // Olympia
      'west virginia, usa': { lat: 38.491226, lng: -80.954453, zipCode: '25301' }, // Charleston
      'wisconsin, usa': { lat: 44.268543, lng: -89.616508, zipCode: '53703' }, // Madison
      'wyoming, usa': { lat: 42.755966, lng: -107.302490, zipCode: '82001' }, // Cheyenne
      'washington dc, usa': { lat: 38.907192, lng: -77.036871, zipCode: '20001' } // Washington DC
    };
    
    const key = locationName.toLowerCase();
    if (stateData[key]) {
      const data = stateData[key];
      return {
        coordinates: {
          latitude: data.lat,
          longitude: data.lng
        },
        zipCode: data.zipCode,
        city: '',  // We don't have city data in our direct mapping
        state: key.split(',')[0].split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        country: 'United States',
        formattedAddress: locationName,
        isUSLocation: true
      };
    }
    
    return null;
  }

  /**
   * Get a default ZIP code for a US state
   * @param state The state name
   * @returns Default ZIP code for the state or '00000' if not found
   */
  private getDefaultZipCodeForState(state: string | undefined): string {
    if (!state) return '00000';
    
    const stateZipCodes: { [key: string]: string } = {
      'Alabama': '36104',
      'Alaska': '99801',
      'Arizona': '85001',
      'Arkansas': '72201',
      'California': '94203',
      'Colorado': '80202',
      'Connecticut': '06103',
      'Delaware': '19901',
      'Florida': '32301',
      'Georgia': '30301',
      'Hawaii': '96813',
      'Idaho': '83702',
      'Illinois': '62701',
      'Indiana': '46204',
      'Iowa': '50309',
      'Kansas': '66603',
      'Kentucky': '40601',
      'Louisiana': '70802',
      'Maine': '04330',
      'Maryland': '21401',
      'Massachusetts': '02201',
      'Michigan': '48933',
      'Minnesota': '55101',
      'Mississippi': '39201',
      'Missouri': '65101',
      'Montana': '59601',
      'Nebraska': '68502',
      'Nevada': '89701',
      'New Hampshire': '03301',
      'New Jersey': '08608',
      'New Mexico': '87501',
      'New York': '12207',
      'North Carolina': '27601',
      'North Dakota': '58501',
      'Ohio': '43215',
      'Oklahoma': '73102',
      'Oregon': '97301',
      'Pennsylvania': '17101',
      'Rhode Island': '02903',
      'South Carolina': '29201',
      'South Dakota': '57501',
      'Tennessee': '37201',
      'Texas': '73301',
      'Utah': '84101',
      'Vermont': '05602',
      'Virginia': '23218',
      'Washington': '98501',
      'West Virginia': '25301',
      'Wisconsin': '53703',
      'Wyoming': '82001',
      'District of Columbia': '20001'
    };
    
    return stateZipCodes[state] || '00000';
  }
}
