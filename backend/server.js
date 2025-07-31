const express = require('express');
const dotenv = require('dotenv');
const axios = require('axios');
const cors = require('cors');
 
dotenv.config();
 
const app = express();
app.use(cors());
app.use(express.json());
 
const PORT = process.env.PORT;
const GEMINI_API_URL = process.env.GEMINI_API_URL;
 
let lastRecommendations = [];
<<<<<<< HEAD
let lastTempResults = [];

=======
 
>>>>>>> 861f160 (Changes made on agent3)
function extractArray(text) {
    try {
        const cleaned = text
            .replace(/```/g, '')
            .replace(/javascript/i, '')
            .replace(/\n/g, '')
            .trim();
 
        const parsed = Function('"use strict";return (' + cleaned + ')')();
<<<<<<< HEAD

        if (!Array.isArray(parsed)) throw new Error('Parsed data is not an array.');

=======
 
        if (!Array.isArray(parsed)) {
            throw new Error('Parsed data is not an array.');
        }
 
>>>>>>> 861f160 (Changes made on agent3)
        return parsed;
    } catch (err) {
        throw new Error('Failed to parse array from Gemini response.');
    }
}
 
// -------- First Agent: Get tourist places --------
app.post('/prompt', async (req, res) => {
    const { city } = req.body;
<<<<<<< HEAD

    if (!city) return res.status(400).json({ error: 'City name is required in the request body.' });

=======
 
    if (!city) {
        return res.status(400).json({ error: 'City name is required in the request body.' });
    }
 
>>>>>>> 861f160 (Changes made on agent3)
    const prompt = `Give me strictly 8 famous tourist places to visit in ${city}. Return only a valid JavaScript array. No explanation, no markdown formatting.`;
 
    try {
        const response = await axios.post(GEMINI_API_URL, {
            contents: [{ parts: [{ text: prompt }] }]
        });
 
        const raw = response.data.candidates[0].content.parts[0].text;
 
        let recommendations;
        try {
            recommendations = extractArray(raw);
            lastRecommendations = recommendations;
        } catch (err) {
            return res.status(500).json({ error: 'Failed to parse tourist places array from Gemini.', raw });
        }
 
        res.json({ city, recommendations });
<<<<<<< HEAD
=======
 
>>>>>>> 861f160 (Changes made on agent3)
    } catch (error) {
        res.status(500).json({
            error: 'Failed to fetch data from Gemini API.',
            details: error.response?.data || error.message
        });
    }
});
 
// -------- Second Agent: Get temperature and weather --------
app.post('/temp', async (req, res) => {
    let { cities } = req.body;
 
    if (!Array.isArray(cities) || cities.length === 0) {
        if (lastRecommendations.length === 0) {
            return res.status(400).json({ error: 'No cities provided and no previous recommendations found.' });
        }
        cities = lastRecommendations;
    }
 
    const prompt = `Give the current temperature and weather condition (ex: cloudy, sunny) for each of these places : ${cities.join(', ')}. Return only a JavaScript array of objects like: [{ city: '...', temperature: '...', Weather Condition:'....'\n} ...] No explanation, no markdown formatting, no code blocks.`;
 
    try {
        const response = await axios.post(GEMINI_API_URL, {
            contents: [{ parts: [{ text: prompt }] }]
        });
 
        const raw = response.data.candidates[0].content.parts[0].text;
 
        let temperatureData;
        try {
            temperatureData = extractArray(raw);
            lastTempResults = temperatureData;
        } catch (err) {
            return res.status(500).json({ error: 'Failed to parse temperature response from Gemini.', raw });
        }
 
        res.json({ results: temperatureData });
<<<<<<< HEAD
=======
 
>>>>>>> 861f160 (Changes made on agent3)
    } catch (error) {
        res.status(500).json({
            error: 'Failed to fetch temperature data from Gemini API.',
            details: error.response?.data || error.message
        });
    }
});
 
// -------- Third Agent: Get transportation info --------
app.post('/transport', async (req, res) => {
    if (lastRecommendations.length === 0) {
        return res.status(400).json({
            error: 'No tourist places found. Please call /prompt first to get recommendations.'
        });
    }
 
    const prompt = `For each of the following places in Bangalore: ${lastRecommendations.join(', ')}, provide the best transportation method to reach each place from both Majestic and Kempegowda International Airport. Return only a valid JavaScript array of objects in this format: 
[
  {
    place: 'Lalbagh',
    fromMajestic: 'Metro or BMTC bus - 30 minutes',
    fromAirport: 'Airport Shuttle + Metro - 90 minutes'
  },
  ...
]
No explanation, no markdown, no code block. Just return the array.`;
 
    try {
        const response = await axios.post(GEMINI_API_URL, {
            contents: [
                {
                    parts: [{ text: prompt }]
                }
            ]
        });
 
        const raw = response.data.candidates[0].content.parts[0].text;
 
        let transportInfo;
        try {
            transportInfo = extractArray(raw);
        } catch (err) {
            return res.status(500).json({
                error: 'Failed to parse transport info from Gemini.',
                raw
            });
        }
 
        res.json({ transport: transportInfo });
 
    } catch (error) {
        console.error('Gemini API error:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to fetch transport info from Gemini API.',
            details: error.response?.data || error.message
        });
    }
});
// -------- Unified Agent: City Explore --------
app.post('/city-explore', async (req, res) => {
    const { city } = req.body;

<<<<<<< HEAD
app.post('/destination', async (req, res) => {
    let { places } = req.body;

    if (!Array.isArray(places) || places.length === 0) {
        if (lastTempResults.length === 0) {
            return res.status(400).json({ error: 'No places provided and no previous temperature results found.' });
        }
        places = lastTempResults;
    }

    const placeNames = places.map(p => p.city).join(', ');

    const prompt = `List the most practical modes of transport from Bangalore airport to each of these destinations: ${placeNames}. Include walkable, local bus, cabs, metro, etc. Return only a JavaScript array of objects like: [{ city: '...', transport: '...' }, ...] No explanation, no markdown formatting, no code blocks.`;

    try {
        const response = await axios.post(GEMINI_API_URL, {
            contents: [{ parts: [{ text: prompt }] }]
        });

        const raw = response.data.candidates[0].content.parts[0].text;

        let transportData;
        try {
            transportData = extractArray(raw);
        } catch (err) {
            return res.status(500).json({ error: 'Failed to parse transport data from Gemini.', raw });
        }

        const merged = places.map(place => {
            const transportInfo = transportData.find(t => t.city.toLowerCase() === place.city.toLowerCase());
            return {
                city: place.city,
                temperature: place.temperature,
                transport: transportInfo ? transportInfo.transport : 'Unknown'
            };
        });

        res.json({ results: merged });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to fetch transport info from Gemini API.',
            details: error.response?.data || error.message
        });
    }
});

=======
    if (!city) {
        return res.status(400).json({ error: 'City name is required.' });
    }

    // Step 1: Get tourist places
    const placePrompt = `Give me strictly 8 famous tourist places to visit in ${city}. Return only a valid JavaScript array. No explanation, no markdown formatting.`;

    let places = [];

    try {
        const placeResponse = await axios.post(GEMINI_API_URL, {
            contents: [{ parts: [{ text: placePrompt }] }]
        });

        const rawPlaces = placeResponse.data.candidates[0].content.parts[0].text;
        places = extractArray(rawPlaces);
        lastRecommendations = places;
    } catch (err) {
        return res.status(500).json({
            error: 'Failed to get tourist places from Gemini.',
            details: err.message
        });
    }

    // Step 2: Get temperature & weather
    const tempPrompt = `Give the current temperature and weather condition (ex: cloudy, sunny) for each of these places : ${places.join(', ')}. Return only a JavaScript array of objects like: [{ city: '...', temperature: '...', Weather Condition:'...'}] No explanation, no markdown formatting, no code blocks.`;

    let temperatureData = [];

    try {
        const tempResponse = await axios.post(GEMINI_API_URL, {
            contents: [{ parts: [{ text: tempPrompt }] }]
        });

        const rawTemp = tempResponse.data.candidates[0].content.parts[0].text;
        temperatureData = extractArray(rawTemp);
    } catch (err) {
        return res.status(500).json({
            error: 'Failed to get temperature data from Gemini.',
            details: err.message
        });
    }

    // Step 3: Get transport info
    const transportPrompt = `For each of the following places in ${city}: ${places.join(', ')}, provide the best transportation method to reach each place from both Majestic and Kempegowda International Airport. Return only a valid JavaScript array of objects in this format: 
[
  {
    place: 'Lalbagh',
    fromMajestic: 'Metro or BMTC bus - 30 minutes',
    fromAirport: 'Airport Shuttle + Metro - 90 minutes'
  },
  ...
]
No explanation, no markdown, no code block. Just return the array.`;

    let transportInfo = [];

    try {
        const transportResponse = await axios.post(GEMINI_API_URL, {
            contents: [{ parts: [{ text: transportPrompt }] }]
        });

        const rawTransport = transportResponse.data.candidates[0].content.parts[0].text;
        transportInfo = extractArray(rawTransport);
    } catch (err) {
        return res.status(500).json({
            error: 'Failed to get transport data from Gemini.',
            details: err.message
        });
    }

    // Final response
    res.json({
        city,
        places,
        temperature: temperatureData,
        transport: transportInfo
    });
});

 
// -------- Start server --------
>>>>>>> 861f160 (Changes made on agent3)
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
