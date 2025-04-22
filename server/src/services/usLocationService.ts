import * as fs from 'fs';
import * as path from 'path';
import { Location } from '../types/services/location.type';

/**
 * Interface for US location data
 */
export interface IUSLocationData {
  name: string;
  state?: string;
  stateCode?: string;
  code?: string; // For states
  latitude: number;
  longitude: number;
  population?: number;
  zipCodes?: string[];
  capital?: string;
}

/**
 * Service for validating and normalizing US location names
 */
export class USLocationService {
  private _states: Map<string, IUSLocationData> = new Map();
  private _cities: Map<string, IUSLocationData> = new Map();
  private _statesByCode: Map<string, string> = new Map();
  private _statesByName: Map<string, string> = new Map();
  private _aliases: Map<string, string> = new Map();
  
  constructor() {
    this._loadLocations();
  }
  
  /**
   * Load location data from JSON file
   */
  private _loadLocations(): void {
    try {
      // Load the JSON file
      const dataPath = path.join(__dirname, '../data/usLocations.json');
      const rawData = fs.readFileSync(dataPath, 'utf8');
      const locationData = JSON.parse(rawData);
      
      // Process states
      if (locationData.states && Array.isArray(locationData.states)) {
        locationData.states.forEach((state: IUSLocationData) => {
          // Add state properties to match our interface
          state.stateCode = state.code;
          state.state = state.name;
          
          this._states.set(state.name.toLowerCase(), state);
          if (state.code) {
            this._statesByCode.set(state.code, state.name);
            this._statesByName.set(state.name.toLowerCase(), state.code);
          }
        });
      }
      
      // Process cities
      if (locationData.cities && Array.isArray(locationData.cities)) {
        locationData.cities.forEach((city: IUSLocationData) => {
          if (city.state) {
            this._cities.set(city.name.toLowerCase() + ', ' + city.state.toLowerCase(), city);
          }
          // Also add city name alone for easier lookup
          this._cities.set(city.name.toLowerCase(), city);
        });
      }
      
      // Process aliases
      if (locationData.aliases) {
        Object.entries(locationData.aliases).forEach(([alias, cityName]) => {
          this._aliases.set(alias.toLowerCase(), String(cityName).toLowerCase());
        });
      }
      
      console.log(`Loaded ${this._states.size} states and ${this._cities.size} cities`);
    } catch (error) {
      console.error('Error loading US location data:', error);
    }
  }
  
  /**
   * Validate and normalize a US location name
   * @param locationName The location name to validate
   * @returns Normalized location data or null if not found
   */
  validateLocation(locationName: string): IUSLocationData | null {
    if (!locationName) return null;
    
    // Normalize the input
    const normalizedName = locationName.toLowerCase().trim();
    
    // Check for aliases first
    if (this._aliases.has(normalizedName)) {
      const realName = this._aliases.get(normalizedName);
      if (realName) {
        return this.validateLocation(realName);
      }
    }
    
    // Also try with different casing for aliases (for tests with 'Big Apple' vs 'bigApple')
    const aliasKeys = Array.from(this._aliases.keys());
    const matchingAlias = aliasKeys.find(key => key.toLowerCase() === normalizedName.toLowerCase());
    if (matchingAlias) {
      const realName = this._aliases.get(matchingAlias);
      if (realName) {
        return this.validateLocation(realName);
      }
    }
    
    // Direct match for city with state
    if (this._cities.has(normalizedName)) {
      return this._cities.get(normalizedName) || null;
    }
    
    // Direct match for state
    if (this._states.has(normalizedName)) {
      return this._states.get(normalizedName) || null;
    }
    
    // Try to parse "City, State" format
    const parts = normalizedName.split(',').map(p => p.trim());
    if (parts.length === 2) {
      const cityName = parts[0];
      const statePart = parts[1];
      
      // Check if state part is a valid state
      // Try to get state code by name, or use the input if it's a 2-letter code
      let stateCode = this._statesByName.get(statePart);
      
      // If we didn't find it by name, check if it's already a state code
      if (!stateCode && statePart.length === 2) {
        const upperStatePart = statePart.toUpperCase();
        // Check if this code exists in our statesByCode map
        if (this._statesByCode.has(upperStatePart)) {
          stateCode = upperStatePart;
        }
      }
      
      if (stateCode) {
        // Try to find the city in that state
        const cityWithState = cityName + ', ' + this._statesByCode.get(stateCode)?.toLowerCase();
        if (this._cities.has(cityWithState)) {
          return this._cities.get(cityWithState) || null;
        }
        
        // Try just the city name and verify the state matches
        if (this._cities.has(cityName)) {
          const city = this._cities.get(cityName);
          if (city && city.stateCode === stateCode) {
            return city;
          }
        }
      }
    }
    
    // Partial match for city names (without state)
    for (const [key, city] of this._cities.entries()) {
      // Only match against the city name part, not the full key which might include state
      const cityNameOnly = key.split(',')[0];
      if (cityNameOnly === normalizedName) {
        return city;
      }
    }
    
    // No match found
    return null;
  }
  
  /**
   * Get a location by ZIP code
   * @param zipCode The ZIP code to look up
   * @returns Location data or null if not found
   */
  getLocationByZip(zipCode: string): IUSLocationData | null {
    for (const city of this._cities.values()) {
      if (city.zipCodes && city.zipCodes.includes(zipCode)) {
        return city;
      }
    }
    return null;
  }
  
  /**
   * Convert a location name to a standardized Location object
   * @param locationName The location name to convert
   * @returns Standardized Location object or null if not found
   */
  convertToLocation(locationName: string): Location | null {
    const validatedLocation = this.validateLocation(locationName);
    
    if (!validatedLocation) return null;
    
    // Create a standardized Location object
    return {
      name: this._formatLocationName(validatedLocation),
      confidence: 0.9, // High confidence for validated locations
      latitude: validatedLocation.latitude,
      longitude: validatedLocation.longitude,
      zipCode: validatedLocation.zipCodes ? validatedLocation.zipCodes[0] : '00000',
      city: validatedLocation.name,
      region: validatedLocation.state,
      country: 'United States',
      isUSLocation: true
    };
  }
  
  /**
   * Format a location name nicely
   * @param location The location data
   * @returns Formatted location name
   */
  private _formatLocationName(location: IUSLocationData): string {
    if (!location.state || location.name === location.state) {
      // This is a state or has no state info
      return location.name;
    }
    
    // This is a city
    return `${location.name}, ${location.state}`;
  }
  
  /**
   * Check if a location name is likely a US location
   * @param locationName The location name to check
   * @returns True if the location is likely in the US
   */
  isUSLocation(locationName: string): boolean {
    return this.validateLocation(locationName) !== null;
  }
  
  /**
   * Get all states
   * @returns Array of state data
   */
  getAllStates(): IUSLocationData[] {
    return Array.from(this._states.values());
  }
  
  /**
   * Get all cities in a state
   * @param stateNameOrCode State name or code
   * @returns Array of cities in the state
   */
  getCitiesInState(stateNameOrCode: string): IUSLocationData[] {
    const stateCode = this._statesByName.get(stateNameOrCode.toLowerCase()) || 
                     (stateNameOrCode.length === 2 ? stateNameOrCode.toUpperCase() : null);
    
    if (!stateCode) return [];
    
    return Array.from(this._cities.values())
      .filter(city => city.stateCode === stateCode);
  }
}

// Export a singleton instance
export const usLocationService = new USLocationService();
export default usLocationService;
