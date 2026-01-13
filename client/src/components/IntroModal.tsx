import { useState } from 'react';

interface IntroModalProps {
  onDismiss: (dontShowAgain: boolean) => void;
}

export function IntroModal({ onDismiss }: IntroModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleDismiss = () => {
    onDismiss(dontShowAgain);
  };

  return (
    <div className="intro-modal-overlay" onClick={handleDismiss}>
      <div className="intro-modal" onClick={(e) => e.stopPropagation()}>
        <h1>Welcome to Local Group News</h1>
        
        <section className="intro-section">
          <h2>About This Project</h2>
          <p>
            Local Group News reimagines how you consume news by visualizing articles as planets 
            orbiting in a solar system. Articles closer to the center are more relevant to your 
            location, while distant planets represent global or less locally-relevant stories.
          </p>
          <p>
            This demo aggregates content from <strong>Reddit</strong> and <strong>NewsAPI</strong>, 
            organizing articles based on geographic relevance to your zip code. The result is a 
            personalized news universe where what matters most to you orbits closest.
          </p>
        </section>

        <section className="intro-section">
          <h2>Navigation Controls</h2>
          
          <div className="controls-grid">
            <div className="control-group">
              <h3>Mouse</h3>
              <ul>
                <li><span className="control-key">Click + Drag</span> Rotate view</li>
                <li><span className="control-key">Scroll Wheel</span> Zoom in/out</li>
                <li><span className="control-key">Click Planet</span> Select article</li>
              </ul>
            </div>

            <div className="control-group">
              <h3>Touchpad</h3>
              <ul>
                <li><span className="control-key">Two-finger Drag</span> Rotate view</li>
                <li><span className="control-key">Pinch</span> Zoom in/out</li>
                <li><span className="control-key">Tap Planet</span> Select article</li>
              </ul>
            </div>

            <div className="control-group">
              <h3>Touch (Mobile)</h3>
              <ul>
                <li><span className="control-key">Drag</span> Rotate view</li>
                <li><span className="control-key">Pinch</span> Zoom in/out</li>
                <li><span className="control-key">Tap Planet</span> Select article</li>
              </ul>
            </div>

            <div className="control-group">
              <h3>Keyboard</h3>
              <ul>
                <li><span className="control-key">H</span> Pause/Resume motion</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="intro-section intro-tips">
          <h2>Tips</h2>
          <ul>
            <li>Hover over a planet to see the article headline</li>
            <li>Use the menu (top-right) to change your zip code and browse article history</li>
            <li>Pause the simulation to easily select planets</li>
          </ul>
        </section>

        <div className="intro-footer">
          <label className="intro-checkbox-label">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
            />
            <span>Don't show this again</span>
          </label>
          
          <button className="intro-button" onClick={handleDismiss}>
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
