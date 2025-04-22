import { USLocationService } from '../../services/usLocationService';
import * as fs from 'fs';

// Mock the fs module
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
}));

describe('USLocationService', () => {
  let usLocationService: USLocationService;
  const mockLocationData = {
    states: [
      {
        name: 'California',
        code: 'CA',
        latitude: 36.7783,
        longitude: -119.4179,
        capital: 'Sacramento'
      },
      {
        name: 'New York',
        code: 'NY',
        latitude: 40.7128,
        longitude: -74.0060,
        capital: 'Albany'
      }
    ],
    cities: [
      {
        name: 'Los Angeles',
        state: 'California',
        stateCode: 'CA',
        latitude: 34.0522,
        longitude: -118.2437,
        population: 3979576,
        zipCodes: ['90001', '90002', '90003']
      },
      {
        name: 'San Francisco',
        state: 'California',
        stateCode: 'CA',
        latitude: 37.7749,
        longitude: -122.4194,
        population: 873965,
        zipCodes: ['94102', '94103', '94104']
      },
      {
        name: 'New York City',
        state: 'New York',
        stateCode: 'NY',
        latitude: 40.7128,
        longitude: -74.0060,
        population: 8336817,
        zipCodes: ['10001', '10002', '10003']
      }
    ],
    aliases: {
      'LA': 'Los Angeles',
      'SF': 'San Francisco',
      'NYC': 'New York City',
      bigApple: 'New York City'
    }
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock the fs.readFileSync to return our test data
    (fs.readFileSync as jest.Mock).mockImplementation(() => {
      return JSON.stringify(mockLocationData);
    });
    
    // Create a new instance of the service
    usLocationService = new USLocationService();
  });

  describe('validateLocation', () => {
    it('should validate a state name', () => {
      const result = usLocationService.validateLocation('California');
      expect(result).not.toBeNull();
      expect(result?.name).toBe('California');
      expect(result?.code).toBe('CA');
    });

    it('should validate a city name', () => {
      const result = usLocationService.validateLocation('Los Angeles');
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Los Angeles');
      expect(result?.state).toBe('California');
    });

    it('should validate a city with state', () => {
      const result = usLocationService.validateLocation('Los Angeles, California');
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Los Angeles');
      expect(result?.state).toBe('California');
    });

    it('should validate a city with state code', () => {
      const result = usLocationService.validateLocation('Los Angeles, CA');
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Los Angeles');
      expect(result?.stateCode).toBe('CA');
    });

    it('should validate using aliases', () => {
      const result = usLocationService.validateLocation('LA');
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Los Angeles');
      
      const result2 = usLocationService.validateLocation('bigApple');
      expect(result2).not.toBeNull();
      expect(result2?.name).toBe('New York City');
    });

    it('should be case insensitive', () => {
      const result = usLocationService.validateLocation('los angeles');
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Los Angeles');
    });

    it('should handle whitespace', () => {
      const result = usLocationService.validateLocation('  Los Angeles  ');
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Los Angeles');
    });

    it('should return null for unknown locations', () => {
      const result = usLocationService.validateLocation('Unknown City');
      expect(result).toBeNull();
    });

    it('should return null for empty input', () => {
      const result = usLocationService.validateLocation('');
      expect(result).toBeNull();
    });
  });

  describe('getLocationByZip', () => {
    it('should find a location by ZIP code', () => {
      const result = usLocationService.getLocationByZip('90001');
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Los Angeles');
    });

    it('should return null for unknown ZIP code', () => {
      const result = usLocationService.getLocationByZip('00000');
      expect(result).toBeNull();
    });
  });

  describe('convertToLocation', () => {
    it('should convert a location name to a standardized Location object', () => {
      const result = usLocationService.convertToLocation('Los Angeles');
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Los Angeles, California');
      expect(result?.latitude).toBe(34.0522);
      expect(result?.longitude).toBe(-118.2437);
      expect(result?.city).toBe('Los Angeles');
      expect(result?.region).toBe('California');
      expect(result?.country).toBe('United States');
      expect(result?.isUSLocation).toBe(true);
    });

    it('should return null for unknown locations', () => {
      const result = usLocationService.convertToLocation('Unknown City');
      expect(result).toBeNull();
    });
  });

  describe('isUSLocation', () => {
    it('should return true for US locations', () => {
      expect(usLocationService.isUSLocation('California')).toBe(true);
      expect(usLocationService.isUSLocation('Los Angeles')).toBe(true);
      expect(usLocationService.isUSLocation('NYC')).toBe(true);
    });

    it('should return false for non-US locations', () => {
      expect(usLocationService.isUSLocation('Paris')).toBe(false);
      expect(usLocationService.isUSLocation('London')).toBe(false);
    });
  });

  describe('getAllStates', () => {
    it('should return all states', () => {
      const states = usLocationService.getAllStates();
      expect(states.length).toBe(2);
      expect(states[0].name).toBe('California');
      expect(states[1].name).toBe('New York');
    });
  });

  describe('getCitiesInState', () => {
    it('should return cities in a state by name', () => {
      const cities = usLocationService.getCitiesInState('California');
      // We should have Los Angeles and San Francisco
      expect(cities.some(city => city.name === 'Los Angeles')).toBe(true);
      expect(cities.some(city => city.name === 'San Francisco')).toBe(true);
    });

    it('should return cities in a state by code', () => {
      const cities = usLocationService.getCitiesInState('CA');
      // We should have Los Angeles and San Francisco
      expect(cities.some(city => city.name === 'Los Angeles')).toBe(true);
      expect(cities.some(city => city.name === 'San Francisco')).toBe(true);
    });

    it('should return empty array for unknown state', () => {
      const cities = usLocationService.getCitiesInState('Unknown');
      expect(cities.length).toBe(0);
    });
  });
});
