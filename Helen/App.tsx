import React, { useState } from 'react';
import './App.css';
import IridiumVisualization from './IridiumVisualization';

function App() {
  const [isRelayMode, setIsRelayMode] = useState<boolean>(false);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Iridium Constellation Simulator</h1>
        <div className="content-container">
          <div className="left-panel">
            <form>
              <div className="orbit-selection">
                <h2>Iridium Constellation Parameters</h2>
                <div className="input-fields">
                  <div className="input-group">
                    <label>Altitude: 780 km</label>
                    <div className="input-hint">Standard Iridium altitude</div>
                  </div>
                  <div className="input-group">
                    <label>Inclination: 86.4°</label>
                    <div className="input-hint">Near-polar orbit for global coverage</div>
                  </div>
                  <div className="input-group">
                    <label>Satellites: 66 (6 planes × 11 satellites)</label>
                    <div className="input-hint">Full Iridium NEXT constellation</div>
                  </div>
                  <div className="input-group">
                    <label>Coverage Radius: 2700 km</label>
                    <div className="input-hint">Per satellite coverage area</div>
                  </div>
                </div>
              </div>

              <div className="orbit-selection">
                <h2>Visualization Mode</h2>
                <div className="radio-group">
                  <label>
                    <input
                      type="radio"
                      name="visualizationMode"
                      checked={!isRelayMode}
                      onChange={() => setIsRelayMode(false)}
                    />
                    Standard View
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="visualizationMode"
                      checked={isRelayMode}
                      onChange={() => setIsRelayMode(true)}
                    />
                    Relay Mode (Inter-satellite Links)
                  </label>
                </div>
              </div>
            </form>

            <div className="visualization-container">
              <IridiumVisualization
                altitude={780}
                inclination={86.4}
                isRelayMode={isRelayMode}
              />
            </div>
          </div>

          <div className="right-panel">
            <h2>Real-time Satellite Coverage</h2>
            <div className="visualization-container">
              <IridiumVisualization
                altitude={780}
                inclination={86.4}
                isRelayMode={false}
              />
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}

export default App;
