import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [selectedCity, setSelectedCity] = useState('Bangalore');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleExplore = async () => {
    setLoading(true);
    setError('');
    setData([]);

    try {
      // 1. Get tourist places
      const promptRes = await axios.post('http://localhost:5000/prompt', {
        city: selectedCity
      });
      const places = promptRes.data.recommendations;

      // 2. Get temperature and weather
      const tempRes = await axios.post('http://localhost:5000/temp', {
        cities: places
      });
      const weatherData = tempRes.data.results;

      // 3. Get transport info
      const transportRes = await axios.post('http://localhost:5000/transport');
      const transportData = transportRes.data.transport;

      // 4. Merge data
      const combinedData = places.map((placeName) => {
        const weather = weatherData.find(w => w.city?.toLowerCase() === placeName.toLowerCase());
        const transport = transportData.find(t => t.place?.toLowerCase() === placeName.toLowerCase());

        return {
          name: placeName,
          temperature: weather?.temperature || 'N/A',
          weatherCondition: weather?.['Weather Condition'] || 'N/A',
          fromMajestic: transport?.fromMajestic || 'N/A',
          fromAirport: transport?.fromAirport || 'N/A'
        };
      });

      setData(combinedData);
    } catch (err) {
      console.error(err);
      setError('Something went wrong while fetching city data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <h1>City Explorer</h1>
      <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)}>
        <option value="Bangalore">Bangalore</option>
        {/* You can add more cities here */}
      </select>
      <button onClick={handleExplore} disabled={loading}>
        {loading ? 'Loading...' : 'Enter'}
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {data.length > 0 && (
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
            {data.map((place, index) => (
              <tr key={index}>
                <td>{place.name}</td>
                <td>{place.temperature}, {place.weatherCondition}</td>
                <td>
                  <strong>From Majestic:</strong> {place.fromMajestic}<br />
                  <strong>From Airport:</strong> {place.fromAirport}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
  

}

export default App;











