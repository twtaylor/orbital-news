import { addTierToArticle, calculateTierFromMass, groupArticlesByTier0 } from '../../controllers/articleController.helpers';
import { GeocodingService } from '../../services/geocodingService';
import { Article, ArticleWithTier } from '../../types/models/article.type';

// Mock the GeocodingService
jest.mock('../../services/geocodingService');

describe('Article Controller Helpers', () => {
  let mockGeocodingService: jest.Mocked<GeocodingService>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockGeocodingService = new GeocodingService() as jest.Mocked<GeocodingService>;
  });
  
  describe('addTierToArticle', () => {
    it('should add tier information to an article with object location containing coordinates', async () => {
      // Setup
      const article: Article = {
        id: 'test-article',
        title: 'Test Article',
        content: 'Test content',
        source: 'test',
        sourceUrl: 'https://test.com',
        author: 'Test Author',
        publishedAt: new Date().toISOString(),
        location: {
          location: 'Test Location',
          latitude: 40.7128,
          longitude: -74.0060,
          zipCode: '10001'
        },
        tags: ['test'],
        mass: 100
      };
      
      mockGeocodingService.getUserLocation.mockReturnValue({
        latitude: 40.7128,
        longitude: -74.0060
      });
      
      mockGeocodingService.calculateDistance.mockReturnValue(5000); // 5km
      mockGeocodingService.determineTierFromDistance.mockReturnValue('close');
      
      // Execute
      const result = await addTierToArticle(article, mockGeocodingService);
      
      // Verify
      expect(result.tier).toBe('close');
      expect(result.distance).toBeDefined();
      expect(result.distance?.meters).toBe(5000);
      expect(result.distance?.kilometers).toBe(5);
      expect(mockGeocodingService.calculateDistance).toHaveBeenCalled();
      expect(mockGeocodingService.determineTierFromDistance).toHaveBeenCalledWith(5);
    });
    
    it('should add tier information to an article with string location', async () => {
      // Setup
      const article: Article = {
        id: 'test-article',
        title: 'Test Article',
        content: 'Test content',
        source: 'test',
        sourceUrl: 'https://test.com',
        author: 'Test Author',
        publishedAt: new Date().toISOString(),
        location: 'New York, NY',
        tags: ['test'],
        mass: 100
      };
      
      mockGeocodingService.getUserLocation.mockReturnValue({
        latitude: 40.7128,
        longitude: -74.0060
      });
      
      mockGeocodingService.geocodeLocation.mockResolvedValue({
        coordinates: {
          latitude: 40.7128,
          longitude: -74.0060
        },
        zipCode: '10001',
        city: 'New York',
        state: 'NY',
        country: 'USA'
      });
      
      mockGeocodingService.calculateDistance.mockReturnValue(10000); // 10km
      mockGeocodingService.determineTierFromDistance.mockReturnValue('medium');
      
      // Execute
      const result = await addTierToArticle(article, mockGeocodingService);
      
      // Verify
      expect(result.tier).toBe('medium');
      expect(result.distance).toBeDefined();
      expect(result.distance?.meters).toBe(10000);
      expect(result.distance?.kilometers).toBe(10);
      expect(mockGeocodingService.geocodeLocation).toHaveBeenCalledWith('New York, NY');
      expect(mockGeocodingService.calculateDistance).toHaveBeenCalled();
      expect(mockGeocodingService.determineTierFromDistance).toHaveBeenCalledWith(10);
    });
    
    it('should handle geocoding errors and set tier to medium', async () => {
      // Setup
      const article: Article = {
        id: 'test-article',
        title: 'Test Article',
        content: 'Test content',
        source: 'test',
        sourceUrl: 'https://test.com',
        author: 'Test Author',
        publishedAt: new Date().toISOString(),
        location: 'Invalid Location',
        tags: ['test'],
        mass: 100
      };
      
      mockGeocodingService.getUserLocation.mockReturnValue({
        latitude: 40.7128,
        longitude: -74.0060
      });
      
      mockGeocodingService.geocodeLocation.mockRejectedValue(new Error('Geocoding failed'));
      
      // Execute
      const result = await addTierToArticle(article, mockGeocodingService);
      
      // Verify
      expect(result.tier).toBe('medium');
      expect(result.distance).toBeUndefined();
      expect(mockGeocodingService.geocodeLocation).toHaveBeenCalledWith('Invalid Location');
    });
    
    it('should handle calculation errors and set tier to medium', async () => {
      // Setup
      const article: Article = {
        id: 'test-article',
        title: 'Test Article',
        content: 'Test content',
        source: 'test',
        sourceUrl: 'https://test.com',
        author: 'Test Author',
        publishedAt: new Date().toISOString(),
        location: {
          location: 'Test Location',
          latitude: 40.7128,
          longitude: -74.0060,
          zipCode: '10001'
        },
        tags: ['test'],
        mass: 100
      };
      
      mockGeocodingService.getUserLocation.mockReturnValue({
        latitude: 40.7128,
        longitude: -74.0060
      });
      
      mockGeocodingService.calculateDistance.mockImplementation(() => { throw new Error('Calculation failed'); });
      
      // Execute
      const result = await addTierToArticle(article, mockGeocodingService);
      
      // Verify
      expect(result.tier).toBe('medium');
      expect(result.distance).toBeUndefined();
      expect(mockGeocodingService.calculateDistance).toHaveBeenCalled();
    });
    
    it('should handle null distance result and set tier to medium', async () => {
      // Setup
      const article: Article = {
        id: 'test-article',
        title: 'Test Article',
        content: 'Test content',
        source: 'test',
        sourceUrl: 'https://test.com',
        author: 'Test Author',
        publishedAt: new Date().toISOString(),
        location: {
          location: 'Test Location',
          latitude: 40.7128,
          longitude: -74.0060,
          zipCode: '10001'
        },
        tags: ['test'],
        mass: 100
      };
      
      mockGeocodingService.getUserLocation.mockReturnValue({
        latitude: 40.7128,
        longitude: -74.0060
      });
      
      mockGeocodingService.calculateDistance.mockReturnValue(0);
      
      // Execute
      const result = await addTierToArticle(article, mockGeocodingService);
      
      // Verify
      expect(result.tier).toBe('medium');
      expect(result.distance).toBeUndefined();
      expect(mockGeocodingService.calculateDistance).toHaveBeenCalled();
    });
  });
  
  describe('calculateTierFromMass', () => {
    it('should return close tier for mass >= 100', () => {
      expect(calculateTierFromMass(100)).toBe('close');
      expect(calculateTierFromMass(150)).toBe('close');
    });
    
    it('should return medium tier for mass >= 50 and < 100', () => {
      expect(calculateTierFromMass(50)).toBe('medium');
      expect(calculateTierFromMass(75)).toBe('medium');
      expect(calculateTierFromMass(99)).toBe('medium');
    });
    
    it('should return far tier for mass < 50', () => {
      expect(calculateTierFromMass(0)).toBe('far');
      expect(calculateTierFromMass(25)).toBe('far');
      expect(calculateTierFromMass(49)).toBe('far');
    });
  });
  
  describe('groupArticlesByTier0', () => {
    it('should group articles by their tier', () => {
      // Setup
      const articles: ArticleWithTier[] = [
        { id: 'article1', tier: 'close' } as ArticleWithTier,
        { id: 'article2', tier: 'medium' } as ArticleWithTier,
        { id: 'article3', tier: 'far' } as ArticleWithTier,
        { id: 'article4', tier: 'unknown' } as ArticleWithTier,
        { id: 'article5', tier: 'close' } as ArticleWithTier,
        { id: 'article6', tier: 'medium' } as ArticleWithTier
      ];
      
      // Execute
      const result = groupArticlesByTier0(articles);
      
      // Verify
      expect(result.close.length).toBe(2);
      expect(result.medium.length).toBe(2);
      expect(result.far.length).toBe(1);
      expect(result.unknown.length).toBe(1);
      expect(result.close[0].id).toBe('article1');
      expect(result.close[1].id).toBe('article5');
      expect(result.medium[0].id).toBe('article2');
      expect(result.medium[1].id).toBe('article6');
      expect(result.far[0].id).toBe('article3');
      expect(result.unknown[0].id).toBe('article4');
    });
    
    it('should handle empty arrays', () => {
      // Execute
      const result = groupArticlesByTier0([]);
      
      // Verify
      expect(result.close.length).toBe(0);
      expect(result.medium.length).toBe(0);
      expect(result.far.length).toBe(0);
      expect(result.unknown.length).toBe(0);
    });
  });
});
