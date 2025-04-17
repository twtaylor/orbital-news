import { useRef, useState, useEffect, useCallback } from 'react';
import './App.css';
import { OrbitalSystem } from './utils/OrbitalSystem';
import { Article, Location } from './types/Article';

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const orbitalSystemRef = useRef<OrbitalSystem | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [hoveredArticle, setHoveredArticle] = useState<Article | null>(null);
  const [articleHistory, setArticleHistory] = useState<Article[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [zipCode, setZipCode] = useState('20001'); // Default to DC
  const [isPaused, setIsPaused] = useState(false);
  const [showFullContent, setShowFullContent] = useState(false);
  
  // Handle article hover with useCallback
  const handleArticleHover = useCallback((article: Article | null) => {
    setHoveredArticle(article);
    
    // If hovering over an article, slow down that specific planet
    if (orbitalSystemRef.current && article) {
      orbitalSystemRef.current.setHoveredArticleId(article.id);
    } else if (orbitalSystemRef.current) {
      orbitalSystemRef.current.setHoveredArticleId(null);
    }
  }, []);
  
  // Handle article selection with useCallback to prevent recreation on every render
  const handleArticleSelect = useCallback((article: Article) => {
    // Always pause the simulation when an article is selected
    if (orbitalSystemRef.current) {
      orbitalSystemRef.current.togglePause(true); // Force pause
      setIsPaused(true);
    }
    
    // Set the selected article
    setSelectedArticle(article);
    
    // Add to article history if not already present
    setArticleHistory(prev => {
      if (!prev.some(a => a.id === article.id)) {
        return [article, ...prev];
      }
      return prev;
    });
    
    // Open the menu panel
    setIsMenuOpen(true);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 'h' key to pause/resume the simulation
      if (event.key === 'h' || event.key === 'H') {
        // Only toggle pause, don't reset camera
        if (orbitalSystemRef.current) {
          const newPauseState = orbitalSystemRef.current.togglePause();
          setIsPaused(newPauseState);
        }
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Initialize the orbital system
  useEffect(() => {
    if (containerRef.current) {
      // Create a mock article for demonstration purposes
      // This can be removed once real article selection is implemented
      const mockArticle: Article = {
        id: 'mock-article',
        title: 'Welcome to Local Group News',
        content: 'This is a demonstration of the Local Group News visualization. The planets represent news articles from around the world.',
        source: 'Local Group News',
        publishedAt: new Date().toISOString(),
        sourceUrl: '',
        tier: 'close',
        mass: 100000,
        location: 'Global',
        read: false
      };
      
      // Set the mock article for demonstration
      setSelectedArticle(mockArticle);
      setArticleHistory([mockArticle]);
      
      orbitalSystemRef.current = new OrbitalSystem(
        containerRef.current, 
        handleArticleSelect,
        handleArticleHover
      );
      
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
  }, [zipCode, handleArticleSelect, handleArticleHover]);

  // Note: Article selection is currently handled internally by the OrbitalSystem

  // Handle refresh
  const handleRefresh = () => {
    if (orbitalSystemRef.current) {
      orbitalSystemRef.current.loadArticles(zipCode);
    }
  };

  // Handle pause/play
  const handlePauseToggle = () => {
    if (orbitalSystemRef.current) {
      const newPauseState = orbitalSystemRef.current.togglePause();
      setIsPaused(newPauseState);
    }
  };

  return (
    <div className="app">
      {/* Orbital visualization container */}
      <div ref={containerRef} className="orbital-container"></div>

      {/* Hovered article HUD display */}
      {hoveredArticle && (
        <div className="article-hud">
          <div className="article-hud-title">{hoveredArticle.title}</div>
          <div className="article-hud-source">{hoveredArticle.source}</div>
        </div>
      )}

      {/* Menu toggle button */}
      <button 
        className="menu-toggle" 
        onClick={() => {
          const newMenuState = !isMenuOpen;
          setIsMenuOpen(newMenuState);
          
          // Resume simulation when menu is closed
          if (!newMenuState && isPaused && orbitalSystemRef.current) {
            const newPauseState = orbitalSystemRef.current.togglePause();
            setIsPaused(newPauseState);
          }
        }}
      >
        {isMenuOpen ? '×' : '☰'}
      </button>

      {/* Pause/Play button */}
      <button 
        className="pause-button" 
        onClick={handlePauseToggle}
        title={isPaused ? "Resume motion" : "Pause motion"}
      >
        {isPaused ? '▶' : '⏸'}
      </button>

      {/* Menu panel */}
      <div className={`menu-panel ${isMenuOpen ? 'open' : ''}`}>
        <h1>Local Group News</h1>
        
        <div className="search-section">
          <h2>Location</h2>
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
          
          <button onClick={handleRefresh}>Load Articles</button>
        </div>
        
        <div className="article-history">
          <h2>Article History</h2>
          <div className="article-list">
            {articleHistory.map((article) => (
              <div 
                key={article.id} 
                className={`article-item ${selectedArticle?.id === article.id ? 'selected' : ''}`}
                onClick={() => setSelectedArticle(article)}
              >
                <div className="article-title">{article.title}</div>
                <div className="article-source">{article.source}</div>
              </div>
            ))}
          </div>
        </div>

        {selectedArticle && (
          <div className="article-details">
            <h2>{selectedArticle.title}</h2>
            <p className="article-meta">
              Source: {selectedArticle.source}
              {selectedArticle.author && ` | By: ${selectedArticle.author}`}
              <br />
              Published: {new Date(selectedArticle.publishedAt).toLocaleDateString()}
              {selectedArticle.location && (
                <>
                  <br />
                  Location: {
                    typeof selectedArticle.location === 'object' 
                      ? `${(selectedArticle.location as Location).city || ''}, ${(selectedArticle.location as Location).state || ''} ${(selectedArticle.location as Location).country || ''}`.trim() 
                      : String(selectedArticle.location)
                  }
                </>
              )}
            </p>
            <div className="article-content">
              {!selectedArticle.content ? 'No content available' : (
                showFullContent || selectedArticle.content.length <= 300 
                ? selectedArticle.content 
                : (
                  <>
                    {selectedArticle.content.substring(0, 300)}...
                    <button 
                      className="read-more-button" 
                      onClick={() => setShowFullContent(true)}
                    >
                      Read More
                    </button>
                  </>
                )
              )}
            </div>
            <div className="article-actions">
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
              {showFullContent && selectedArticle.content && selectedArticle.content.length > 300 && (
                <button 
                  className="collapse-button" 
                  onClick={() => setShowFullContent(false)}
                >
                  Collapse
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
