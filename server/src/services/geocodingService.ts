/**
 * GeocodingService
 * 
 * This service provides geocoding functionality to convert location names to coordinates
 * and calculate distances between locations.
 */

import NodeGeocoder from 'node-geocoder';
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
  private geocoder: NodeGeocoder.Geocoder;
  private tierThresholds: TierThresholds;
  private defaultUserLocation: Coordinates;
  private defaultUserZipCode: string = '00000'; // Default ZIP code

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
    // Default to OpenStreetMap if no provider specified (doesn't require API key)
    const geocoderOptions: NodeGeocoder.Options = {
      provider: 'openstreetmap',
      httpAdapter: options.httpAdapter || 'https',
      apiKey: options.apiKey,
      formatter: null,
      fetch: (url: string, opts: any) =>
        fetch(url, {
          ...opts,
          headers: {
            'User-Agent': 'MyGeocodingApp <me@twtaylor.org>',   
          },
        }),
    } as unknown as NodeGeocoder.Options;

    this.geocoder = NodeGeocoder(geocoderOptions);
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

      // No special logging
      const results = await this.geocoder.geocode(locationName);

      if (results && results.length > 0) {
        const result = results[0];
        
        return {
          coordinates: {
            latitude: result.latitude || 0,
            longitude: result.longitude || 0
          },
          zipCode: result.zipcode,
          city: result.city,
          state: result.state,
          country: result.country,
          formattedAddress: result.formattedAddress
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
   * @param zipCode User's ZIP code
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
