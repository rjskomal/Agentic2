import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [selectedCity, setSelectedCity] = useState('');
  const [cityData, setCityData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleExplore = async () => {
    if (!selectedCity) {
      setError('Please select a city.');
      return;
    }

    setLoading(true);
    setError('');
    setCityData(null);

    try {
      const response = await axios.post('http://localhost:5000/city-explore', {
        city: selectedCity
      });

      setCityData(response.data);
    } catch (err) {
      setError('Failed to fetch data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="content-box">
        <h1>City Explorer</h1>

        <div className="controls">
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
          >
            <option value="">Select a city to explore</option>
            <option value="Bangalore">Bangalore</option>
          </select>

          <button onClick={handleExplore}>Enter</button>
        </div>

        {loading && <p className="center-text">Loading...</p>}
        {error && <p className="error-text">{error}</p>}

        {cityData && (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Tourist Place</th>
                  <th>Temperature & Weather</th>
                  <th>Transportation</th>
                </tr>
              </thead>
              <tbody>
                {cityData.places.map((place, index) => {
                  const tempData = cityData.temperature.find(
                    (t) => t.city.toLowerCase() === place.toLowerCase()
                  );
                  const transport = cityData.transport.find(
                    (t) => t.place.toLowerCase() === place.toLowerCase()
                  );

                  return (
                    <tr key={index}>
                      <td>{place}</td>
                      <td>
                        {tempData
                          ? `${tempData.temperature}, ${tempData["Weather Condition"]}`
                          : 'N/A'}
                      </td>
                      <td>
                        {transport ? (
                          <>
                            <div><strong>From Majestic:</strong> {transport.fromMajestic}</div>
                            <div><strong>From Airport:</strong> {transport.fromAirport}</div>
                          </>
                        ) : 'N/A'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;







