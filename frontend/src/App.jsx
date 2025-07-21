import React, { useState } from 'react';
import './App.css';

function App() {
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!city.trim()) return;

    setLoading(true);
    setError('');
    setRecommendations('');

    try {
      const response = await fetch('http://localhost:5000/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city }),
      });

      const data = await response.json();
      console.log('API Response:', data); // for debugging

      if (response.ok && data.recommendations) {
        setRecommendations(data.recommendations);
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch (err) {
      setError('Server error. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <h1>Tourist Guide</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Enter city name"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Fetching...' : 'Get Recommendations'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {recommendations && (
        <div className="results">
          <h2>Top 8 Places in {city}</h2>
          <ol>
            {recommendations
              .split('\n')
              .filter(line => line.trim() !== '')
              .map((line, index) => {
                const [place, ...desc] = line.split(':');
                return (
                  <li key={index}>
                    <strong>{place.replace(/^\*\*\s*|\*\*$/g, '').trim()}:</strong>{' '}
                    {desc.join(':').trim()}
                  </li>
                );
              })}
          </ol>
        </div>
      )}
    </div>
  );
}

export default App;

