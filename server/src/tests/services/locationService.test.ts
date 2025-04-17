import { LocationService } from '../../services/locationService';
import { Article } from '../../types/models/article.type';
import 'jest';

// Set longer timeout for all tests in this suite due to API calls
jest.setTimeout(30000);

describe('LocationService', () => {
  let locationService: LocationService;

  beforeAll(() => {
    locationService = new LocationService();
  });

  it('should extract locations from article content', async () => {
    // Create a test article with location mentions
    const article: Article = {
      id: 'test-location-1',
      title: 'Major Flooding in New York City Causes Evacuation',
      content: `
        New York City officials declared a state of emergency on Tuesday as heavy rainfall 
        caused significant flooding across all five boroughs. The flooding was particularly 
        severe in parts of Brooklyn and Queens. Mayor Adams urged residents to stay home 
        if possible.
        
        "This is one of the worst flooding events we've seen in New York City in decades," 
        said the mayor at a press conference at City Hall.
        
        Meanwhile, New Jersey and Connecticut also reported flooding in several counties. 
        The National Weather Service has issued flood warnings for much of the Northeast 
        United States through Thursday.
      `,
      source: 'test',
      sourceUrl: 'https://example.com/nyc-flooding',
      tier: 'medium',
      mass: 150000,
      publishedAt: new Date().toISOString(),
      location: '', // This will be determined by our service
      
      tags: ['weather', 'emergency']
    };

    // Extract locations without fetching content (using provided content)
    const result = await locationService.extractLocations(article, {
      fetchFullContent: false
    });

    // Verify results
    expect(result.allLocations.length).toBeGreaterThan(0);
    expect(result.primaryLocation).toBeDefined();
    
    // Check if New York City was detected
    const nycFound = result.allLocations.some(
      loc => loc.name.toLowerCase().includes('new york')
    );
    expect(nycFound).toBe(true);
    
    // Log results for inspection
    console.log('Extracted locations:', {
      primary: result.primaryLocation,
      all: result.allLocations.map(l => ({ name: l.name, confidence: l.confidence }))
    });
  });

  it('should extract locations from just the title if no content', async () => {
    // Create a test article with only a title
    const article: Article = {
      id: 'test-location-2',
      title: 'Paris Climate Agreement: China and India Commit to New Goals',
      content: '',
      source: 'test',
      sourceUrl: 'https://example.com/climate-agreement',
      tier: 'far',
      mass: 80000,
      publishedAt: new Date().toISOString(),
      location: '', // This will be determined by our service
      
      tags: ['climate', 'international']
    };

    // Extract locations without fetching content
    const result = await locationService.extractLocations(article, {
      fetchFullContent: false
    });

    // Verify results
    expect(result.allLocations.length).toBeGreaterThan(0);
    
    // Log results for inspection
    console.log('Locations from title only:', {
      primary: result.primaryLocation,
      all: result.allLocations.map(l => ({ name: l.name, confidence: l.confidence }))
    });
  });

  it('should handle articles with no location mentions', async () => {
    // Create a test article with no clear location mentions
    const article: Article = {
      id: 'test-location-3',
      title: 'Scientists Discover New Protein Structure',
      content: `
        Researchers have identified a novel protein structure that could 
        revolutionize drug development. The discovery, published in the 
        Journal of Molecular Biology, reveals how certain proteins fold 
        in ways previously thought impossible.
        
        "This changes our fundamental understanding of protein dynamics," 
        said lead researcher Dr. Emily Chen.
      `,
      source: 'test',
      sourceUrl: 'https://example.com/protein-discovery',
      tier: 'close',
      mass: 220000,
      publishedAt: new Date().toISOString(),
      location: '', // This will be determined by our service
      
      tags: ['science', 'research']
    };

    // Extract locations
    const result = await locationService.extractLocations(article, {
      fetchFullContent: false
    });

    // Verify results - should have few or no locations with high confidence
    if (result.allLocations.length > 0) {
      expect(result.allLocations[0].confidence).toBeLessThan(0.5);
    }
    
    // Log results for inspection
    console.log('Article with no locations:', {
      locationCount: result.allLocations.length,
      locations: result.allLocations.map(l => ({ name: l.name, confidence: l.confidence }))
    });
  });
});
