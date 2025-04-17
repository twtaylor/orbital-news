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
    city: 'San Francisco',
    state: 'California',
    country: 'United States',
    zipCode: '94103',
    lat: 37.7749,
    lng: -122.4194
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
        city: 'London',
        country: 'United Kingdom'
      };
      expect(getLocationName(partialLocation)).toBe('London, United Kingdom');
    });
    
    it('should handle empty structured data', () => {
      const emptyLocation: ArticleLocation = {};
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
    
    it('should return undefined if zip code is not in structured data', () => {
      const noZipLocation: ArticleLocation = {
        city: 'Paris',
        country: 'France'
      };
      expect(getZipCode(noZipLocation)).toBeUndefined();
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
        city: 'Berlin',
        country: 'Germany'
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
      const emptyLocation: ArticleLocation = {};
      expect(hasStructuredData(emptyLocation)).toBe(true);
    });
  });
});
