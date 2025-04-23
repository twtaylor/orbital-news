/**
 * GeocodingService
 * 
 * This service provides geocoding functionality to convert location names to coordinates
 * and calculate distances between locations.
 */

import * as opencage from 'opencage-api-client';
import * as geolib from 'geolib';
import { 
  Coordinates,
  GeocodedLocation, 
  DistanceResult, 
  GeocodingOptions,
  TierThresholds
} from '../types/services/geocoding.type';
import { TierType } from '../types/models/article.type';

export class GeocodingService {
  private apiKey: string;
  private tierThresholds: TierThresholds;
  private defaultUserLocation: Coordinates;
  private defaultUserZipCode: string = '00000'; // Default ZIP code
  private _userCoordinates: Coordinates | null = null;
  private _userZipCode: string | null = null;

  /**
   * Initialize the GeocodingService
   * @param options Geocoding options
   * @param tierThresholds Distance thresholds for tiers in kilometers
   * @param defaultUserLocation Default user location if not specified
   */
  constructor(
    options: GeocodingOptions = {}, 
    tierThresholds: TierThresholds = { close: 50, medium: 500 }, // 0-50 km (close), 50-500 km (medium), >500 km (far)
    defaultUserLocation: Coordinates = { latitude: 35.4676, longitude: -97.5164 } // Oklahoma City (central US)
  ) {
    // Initialize API key
    this.apiKey = options.apiKey || process.env.OPENCAGE_API_KEY || '';
    this.tierThresholds = tierThresholds;
    this.defaultUserLocation = defaultUserLocation;
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

      // Use OpenCage API to geocode the location
      const response = await opencage.geocode({
        q: locationName,
        key: this.apiKey,
        no_annotations: 1,
        limit: 1
      });

      if (response && response.results && response.results.length > 0) {
        const result = response.results[0];
        const components = result.components;
        
        return {
          coordinates: {
            latitude: result.geometry.lat || 0,
            longitude: result.geometry.lng || 0
          },
          zipCode: components.postcode || '',
          city: components.city || components.town || components.village || '',
          state: components.state || '',
          country: components.country || '',
          formattedAddress: result.formatted || ''
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error geocoding location with OpenCage:', error);
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
      this._userCoordinates = coordinates;
      this.defaultUserLocation = coordinates;
      console.log(`User location set to coordinates: ${JSON.stringify(coordinates)}`);
      return true;
    }
  }
  
  /**
   * Get the user's current location
   * @returns The user's current location coordinates
   */
  getUserLocation(): Coordinates {
    return this._userCoordinates || this.defaultUserLocation;
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
      // Geocode both ZIP codes to get coordinates using OpenCage
      const fromResponse = await opencage.geocode({
        q: fromZipCode,
        key: this.apiKey,
        limit: 1,
        countrycode: 'us'
      });
      
      const toResponse = await opencage.geocode({
        q: toZipCode,
        key: this.apiKey,
        limit: 1,
        countrycode: 'us'
      });
      
      if (!fromResponse?.results?.length || !toResponse?.results?.length) {
        return null;
      }
      
      const fromResult = fromResponse.results[0];
      const toResult = toResponse.results[0];
      
      const fromComponents = fromResult.components;
      const toComponents = toResult.components;
      
      const fromLocation: GeocodedLocation = {
        coordinates: {
          latitude: fromResult.geometry.lat,
          longitude: fromResult.geometry.lng
        },
        zipCode: fromComponents.postcode || '',
        city: fromComponents.city || fromComponents.town || fromComponents.village || '',
        state: fromComponents.state || '',
        country: fromComponents.country || '',
        formattedAddress: fromResult.formatted || ''
      };
      
      const toLocation: GeocodedLocation = {
        coordinates: {
          latitude: toResult.geometry.lat,
          longitude: toResult.geometry.lng
        },
        zipCode: toComponents.postcode || '',
        city: toComponents.city || toComponents.town || toComponents.village || '',
        state: toComponents.state || '',
        country: toComponents.country || '',
        formattedAddress: toResult.formatted || ''
      };
      
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
   * @param zipCode User's ZIP code
   * @returns Promise that resolves when the location is set
   */
  async setUserLocationByZipCode(zipCode: string): Promise<boolean> {
    try {
      this._userZipCode = zipCode;
      
      // Use OpenCage API to geocode the ZIP code
      const response = await opencage.geocode({
        q: zipCode,
        key: this.apiKey,
        limit: 1,
        countrycode: 'us' // Prioritize US results
      });
      
      if (response && response.results && response.results.length > 0) {
        const result = response.results[0];
        
        if (result.geometry && result.geometry.lat && result.geometry.lng) {
          const coordinates = {
            latitude: result.geometry.lat,
            longitude: result.geometry.lng
          };
          
          // Update user coordinates
          this._userCoordinates = coordinates;
          this.defaultUserLocation = coordinates;
          this.defaultUserZipCode = zipCode;
          
          console.log(`User location set to ${result.formatted} by ZIP code ${zipCode}`);
          console.log(`User coordinates: ${JSON.stringify(coordinates)}`);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error setting user location by ZIP code:', error);
      return false;
    }
  }
}
