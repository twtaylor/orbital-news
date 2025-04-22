import { 
  getLocationName, 
  getZipCode, 
  getCoordinates, 
  hasStructuredData 
} from '../../utils/locationUtils';
import { ArticleLocation } from '../../types/models/article.type';

describe('Location Utils', () => {
  // Test data
  const stringLocation = 'New York City';
  const structuredLocation: ArticleLocation = {
    location: 'San Francisco, California, United States',
    zipCode: '94103',
    latitude: 37.7749,
    longitude: -122.4194
  };
  
  describe('getLocationName', () => {
    it('should return the string location directly', () => {
      expect(getLocationName(stringLocation)).toBe('New York City');
    });
    
    it('should build a formatted location name from structured data', () => {
      expect(getLocationName(structuredLocation)).toBe('San Francisco, California, United States');
    });
    
    it('should handle partial structured data', () => {
      const partialLocation: ArticleLocation = {
        location: 'London, United Kingdom',
        latitude: 51.5074,
        longitude: -0.1278,
        zipCode: 'SW1A 1AA'
      };
      expect(getLocationName(partialLocation)).toBe('London, United Kingdom');
    });
    
    it('should handle empty structured data', () => {
      const emptyLocation: ArticleLocation = {
        location: 'Unknown',
        latitude: 0,
        longitude: 0,
        zipCode: '00000'
      };
      expect(getLocationName(emptyLocation)).toBe('Unknown');
    });
  });
  
  describe('getZipCode', () => {
    it('should return undefined for string locations', () => {
      expect(getZipCode(stringLocation)).toBeUndefined();
    });
    
    it('should return the zip code from structured data', () => {
      expect(getZipCode(structuredLocation)).toBe('94103');
    });
    
    it('should return the zip code from structured data even when it was previously optional', () => {
      const zipLocation: ArticleLocation = {
        location: 'Paris, France',
        latitude: 48.8566,
        longitude: 2.3522,
        zipCode: '75001'
      };
      expect(getZipCode(zipLocation)).toBe('75001');
    });
  });
  
  describe('getCoordinates', () => {
    it('should return undefined for string locations', () => {
      expect(getCoordinates(stringLocation)).toBeUndefined();
    });
    
    it('should return coordinates from structured data', () => {
      expect(getCoordinates(structuredLocation)).toEqual({
        lat: 37.7749,
        lng: -122.4194
      });
    });
    
    it('should return undefined if coordinates are not in structured data', () => {
      const noCoordinatesLocation: ArticleLocation = {
        location: 'Tokyo, Japan',
        latitude: 0, // Adding zero coordinates for testing the 'no coordinates' case
        longitude: 0, // Adding zero coordinates for testing the 'no coordinates' case
        zipCode: '100-0001'
      };
      expect(getCoordinates(noCoordinatesLocation)).toBeUndefined();
    });
  });
  
  describe('hasStructuredData', () => {
    it('should return false for string locations', () => {
      expect(hasStructuredData(stringLocation)).toBe(false);
    });
    
    it('should return true for structured locations', () => {
      expect(hasStructuredData(structuredLocation)).toBe(true);
    });
    
    it('should return true for empty structured locations', () => {
      const emptyLocation: ArticleLocation = {
        location: 'Unknown',
        latitude: 0,
        longitude: 0,
        zipCode: '00000'
      };
      expect(hasStructuredData(emptyLocation)).toBe(true);
    });
  });
});
