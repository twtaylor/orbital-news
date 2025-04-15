import { useEffect, useRef, useState } from 'react';
import { OrbitalSystem } from './utils/OrbitalSystem';
import { Article } from './types/Article';
import './App.css';

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const orbitalSystemRef = useRef<OrbitalSystem | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [zipCode, setZipCode] = useState('20001'); // Default to DC
  const [searchQuery, setSearchQuery] = useState('');

  // Initialize the orbital system
  useEffect(() => {
    if (containerRef.current && !orbitalSystemRef.current) {
      // Create a mock article for demonstration purposes
      // This can be removed once real article selection is implemented
      const mockArticle: Article = {
        id: 'mock-article',
        title: 'Welcome to Orbital News',
        content: 'This is a demonstration of the Orbital News visualization. The planets represent news articles from around the world.',
        source: 'Orbital News',
        publishedAt: new Date().toISOString(),
        sourceUrl: '',
        tier: 'close',
        mass: 100000,
        location: 'Global',
        read: false
      };
      
      // Set the mock article for demonstration
      setSelectedArticle(mockArticle);
      
      orbitalSystemRef.current = new OrbitalSystem(containerRef.current);
      
      // Load initial articles
      orbitalSystemRef.current.loadArticles(zipCode);
    }

    // Cleanup
    return () => {
      if (orbitalSystemRef.current) {
        orbitalSystemRef.current.dispose();
        orbitalSystemRef.current = null;
      }
    };
  }, [zipCode]);

  // Note: Article selection is currently handled internally by the OrbitalSystem

  // Handle search
  const handleSearch = () => {
    if (orbitalSystemRef.current) {
      orbitalSystemRef.current.loadArticles(zipCode, searchQuery);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    if (orbitalSystemRef.current) {
      orbitalSystemRef.current.loadArticles(zipCode, searchQuery);
    }
  };

  return (
    <div className="app">
      {/* Orbital visualization container */}
      <div ref={containerRef} className="orbital-container"></div>

      {/* Menu toggle button */}
      <button 
        className="menu-toggle" 
        onClick={() => setIsMenuOpen(!isMenuOpen)}
      >
        {isMenuOpen ? '×' : '☰'}
      </button>

      {/* Menu panel */}
      <div className={`menu-panel ${isMenuOpen ? 'open' : ''}`}>
        <h1>Orbital News</h1>
        
        <div className="search-section">
          <h2>Search</h2>
          <div className="input-group">
            <label htmlFor="zipCode">Zip Code:</label>
            <input 
              id="zipCode"
              type="text" 
              value={zipCode} 
              onChange={(e) => setZipCode(e.target.value)}
              placeholder="Enter zip code"
            />
          </div>
          
          <div className="input-group">
            <label htmlFor="searchQuery">Search:</label>
            <input 
              id="searchQuery"
              type="text" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter search terms"
            />
          </div>
          
          <button onClick={handleSearch}>Search</button>
          <button onClick={handleRefresh}>Refresh</button>
        </div>

        {selectedArticle && (
          <div className="article-details">
            <h2>{selectedArticle.title}</h2>
            <p className="article-meta">
              Source: {selectedArticle.source}
              {selectedArticle.author && ` | By: ${selectedArticle.author}`}
              <br />
              Published: {new Date(selectedArticle.publishedAt).toLocaleDateString()}
            </p>
            <div className="article-content">
              {selectedArticle.content}
            </div>
            {selectedArticle.sourceUrl && (
              <a 
                href={selectedArticle.sourceUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="source-link"
              >
                Read Original
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
