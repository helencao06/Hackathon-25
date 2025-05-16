import React, { useState } from 'react';
import './App.css';

function App() {
  const [orbitType, setOrbitType] = useState<'sun-sync' | 'non-polar' | null>(null);
  const [altitude, setAltitude] = useState<string>('');
  const [solarTime, setSolarTime] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission here
    console.log({
      orbitType,
      altitude,
      solarTime: orbitType === 'sun-sync' ? solarTime : undefined
    });
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Orbit Calculator</h1>
        <form onSubmit={handleSubmit}>
          <div className="orbit-selection">
            <h2>Select Orbit Type:</h2>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  name="orbitType"
                  value="sun-sync"
                  checked={orbitType === 'sun-sync'}
                  onChange={(e) => setOrbitType('sun-sync')}
                />
                Sun-synchronous orbit
              </label>
              <label>
                <input
                  type="radio"
                  name="orbitType"
                  value="non-polar"
                  checked={orbitType === 'non-polar'}
                  onChange={(e) => setOrbitType('non-polar')}
                />
                Non-polar orbit
              </label>
            </div>
          </div>

          <div className="input-fields">
            <div className="input-group">
              <label htmlFor="altitude">Altitude (km):</label>
              <input
                type="number"
                id="altitude"
                value={altitude}
                onChange={(e) => setAltitude(e.target.value)}
                required
                min="0"
                step="0.1"
              />
            </div>

            {orbitType === 'sun-sync' && (
              <div className="input-group">
                <label htmlFor="solarTime">Local Solar Time (hours):</label>
                <input
                  type="number"
                  id="solarTime"
                  value={solarTime}
                  onChange={(e) => setSolarTime(e.target.value)}
                  required
                  min="0"
                  max="24"
                  step="0.1"
                />
              </div>
            )}
          </div>

          <button type="submit">Calculate</button>
        </form>
      </header>
    </div>
  );
}

export default App;
