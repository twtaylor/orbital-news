import nlp from 'compromise';
import fetch from 'node-fetch';
import { Article } from '../types/models/article.type';
import { 
  Location, 
  LocationExtractionResult,
  LocationExtractionOptions 
} from '../types/services/location.type';

/**
 * Service for extracting location information from article content
 */
export class LocationService {
  // Common location words to exclude (lowercase)
  private excludedTerms = new Set([
    'here', 'there', 'everywhere', 'nowhere', 'somewhere',
    'home', 'house', 'building', 'office', 'headquarters',
    'online', 'internet', 'web', 'website', 'platform',
    'world', 'earth', 'globe', 'universe', 'space'
  ]);

  // Common country names for quick lookup
  private countries = new Set([
    'united states', 'usa', 'u.s.', 'u.s.a.', 'america',
    'canada', 'mexico', 'uk', 'united kingdom', 'england',
    'france', 'germany', 'italy', 'spain', 'china',
    'japan', 'india', 'australia', 'russia', 'brazil'
    // Add more as needed
  ]);

  /**
   * Extract location information from an article
   * 
   * @param article The article to analyze
   * @param options Options for location extraction
   * @returns Location extraction result
   */
  async extractLocations(
    article: Article, 
    options: LocationExtractionOptions = {}
  ): Promise<LocationExtractionResult> {
    const startTime = Date.now();
    
    // Set default options
    const {
      minConfidence = 0.3,
      maxLocations = 5,
      includeGeoData = false,
      fetchFullContent = true
    } = options;
    
    let textToAnalyze = article.content || article.title;
    
    // Fetch full content if needed and not already available
    if (fetchFullContent && !article.content && article.sourceUrl) {
      try {
        const fetchedContent = await this.fetchArticleContent(article.sourceUrl);
        if (fetchedContent) {
          textToAnalyze = fetchedContent;
        }
      } catch (error) {
        console.warn(`Failed to fetch content for article ${article.id}: ${error}`);
      }
    }
    
    // Extract locations from text
    const locations = this.extractLocationsFromText(textToAnalyze);
    
    // Filter by confidence and limit number
    const filteredLocations = locations
      .filter(loc => loc.confidence >= minConfidence)
      .slice(0, maxLocations);
    
    // Find primary location (highest confidence)
    const primaryLocation = filteredLocations.length > 0 
      ? filteredLocations[0] 
      : undefined;
    
    // Add geo data if requested
    if (includeGeoData && filteredLocations.length > 0) {
      // This would call a geocoding service
      // Left as a placeholder for future implementation
    }
    
    return {
      primaryLocation,
      allLocations: filteredLocations,
      analyzedText: textToAnalyze,
      textLength: textToAnalyze.length,
      processingTimeMs: Date.now() - startTime
    };
  }
  
  /**
   * Extract locations from text using compromise.js
   * 
   * @param text Text to analyze
   * @returns Array of locations with confidence scores
   */
  private extractLocationsFromText(text: string): Location[] {
    // Skip empty text
    if (!text || text.trim().length === 0) {
      return [];
    }
    
    // Parse text with compromise
    const doc = nlp(text);
    
    // Extract places
    const places = doc.places();
    const locationMentions = new Map<string, number>();
    
    // Count mentions of each location
    places.forEach(place => {
      const name = place.text().toLowerCase();
      
      // Skip excluded terms
      if (this.excludedTerms.has(name)) {
        return;
      }
      
      // Count mentions
      const count = locationMentions.get(name) || 0;
      locationMentions.set(name, count + 1);
    });
    
    // Convert to Location objects with confidence scores
    const locations: Location[] = [];
    const totalMentions = Array.from(locationMentions.values()).reduce((sum, count) => sum + count, 0);
    
    for (const [name, mentions] of locationMentions.entries()) {
      // Calculate confidence based on:
      // 1. Number of mentions relative to total
      // 2. Whether it's a known country
      // 3. Length of the name (longer names tend to be more specific)
      const mentionScore = totalMentions > 0 ? mentions / totalMentions : 0;
      const countryBonus = this.countries.has(name) ? 0.1 : 0;
      const lengthScore = Math.min(name.length / 20, 0.2); // Max 0.2 for length
      
      const confidence = Math.min(
        mentionScore * 0.7 + countryBonus + lengthScore,
        1.0
      );
      
      locations.push({
        name: this.capitalizeLocation(name),
        confidence: parseFloat(confidence.toFixed(2)),
        mentions
      });
    }
    
    // Sort by confidence (descending)
    return locations.sort((a, b) => b.confidence - a.confidence);
  }
  
  /**
   * Fetch article content from a URL
   * 
   * @param url URL to fetch content from
   * @returns Article content as text
   */
  private async fetchArticleContent(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch content: ${response.status} ${response.statusText}`);
      }
      
      const html = await response.text();
      
      // Very basic HTML content extraction
      // In a production environment, use a proper HTML parser
      return this.extractTextFromHtml(html);
    } catch (error) {
      console.error(`Error fetching article content: ${error}`);
      return '';
    }
  }
  
  /**
   * Extract text content from HTML
   * This is a very basic implementation
   * 
   * @param html HTML content
   * @returns Plain text content
   */
  private extractTextFromHtml(html: string): string {
    // Remove scripts and style tags
    let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
    text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
    
    // Replace common block elements with newlines
    text = text.replace(/<\/?(?:div|p|br|h[1-6]|ul|ol|li|blockquote|section|article)[^>]*>/gi, '\n');
    
    // Remove all remaining HTML tags
    text = text.replace(/<[^>]*>/g, ' ');
    
    // Decode HTML entities
    text = text.replace(/&nbsp;/g, ' ')
               .replace(/&amp;/g, '&')
               .replace(/&lt;/g, '<')
               .replace(/&gt;/g, '>')
               .replace(/&quot;/g, '"');
    
    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
  }
  
  /**
   * Properly capitalize a location name
   * 
   * @param name Location name to capitalize
   * @returns Capitalized location name
   */
  private capitalizeLocation(name: string): string {
    return name.split(' ')
      .map(word => {
        // Don't capitalize articles, conjunctions, prepositions unless first word
        const lowerCaseWords = ['of', 'the', 'and', 'in', 'on', 'at', 'by', 'for', 'with'];
        if (lowerCaseWords.includes(word) && name.indexOf(word) !== 0) {
          return word;
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  }
}
