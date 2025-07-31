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
 
function extractArray(text) {
    try {
        const cleaned = text
            .replace(/```/g, '')
            .replace(/javascript/i, '')
            .replace(/\n/g, '')
            .trim();
 
        const parsed = Function('"use strict";return (' + cleaned + ')')();
 
        if (!Array.isArray(parsed)) {
            throw new Error('Parsed data is not an array.');
        }
 
        return parsed;
    } catch (err) {
        throw new Error('Failed to parse array from Gemini response.');
    }
}
 
// -------- First Agent: Get tourist places --------
app.post('/prompt', async (req, res) => {
    const { city } = req.body;
 
    if (!city) {
        return res.status(400).json({ error: 'City name is required in the request body.' });
    }
 
    const prompt = `Give me strictly 8 famous tourist places to visit in ${city}. Return only a valid JavaScript array. No explanation, no markdown formatting.`;
 
    try {
        const response = await axios.post(GEMINI_API_URL, {
            contents: [
                {
                    parts: [{ text: prompt }]
                }
            ]
        });
 
        const raw = response.data.candidates[0].content.parts[0].text;
 
        let recommendations;
        try {
            recommendations = extractArray(raw);
            lastRecommendations = recommendations;
        } catch (err) {
            return res.status(500).json({
                error: 'Failed to parse tourist places array from Gemini.',
                raw
            });
        }
 
        res.json({ city, recommendations });
 
    } catch (error) {
        console.error('Gemini API error:', error.response?.data || error.message);
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
            return res.status(400).json({
                error: 'No cities provided and no previous recommendations found.'
            });
        }
        cities = lastRecommendations;
    }
 
    const prompt = `Give the current temperature and weather condition (ex: cloudy, sunny) for each of these places : ${cities.join(', ')}. Return only a JavaScript array of objects like: [{ city: '...', temperature: '...', Weather Condition:'....'\n} ...] No explanation, no markdown formatting, no code blocks.`;
 
    try {
        const response = await axios.post(GEMINI_API_URL, {
            contents: [
                {
                    parts: [{ text: prompt }]
                }
            ]
        });
 
        const raw = response.data.candidates[0].content.parts[0].text;
 
        let temperatureData;
        try {
            temperatureData = extractArray(raw);
        } catch (err) {
            return res.status(500).json({
                error: 'Failed to parse temperature response from Gemini.',
                raw
            });
        }
 
        res.json({ results: temperatureData });
 
    } catch (error) {
        console.error('Gemini API error:', error.response?.data || error.message);
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
app.post('/city-explore', async (req, res) => {
    const { city } = req.body;

    if (!city) return res.status(400).json({ error: 'City name is required in the request body.' });

    try {
        // ----- 1. Get Places -----
        const placePrompt = `Give me strictly 8 famous tourist places to visit in ${city}. Return only a valid JavaScript array. No explanation, no markdown formatting.`;

        const placeResponse = await axios.post(GEMINI_API_URL, {
            contents: [{ parts: [{ text: placePrompt }] }]
        });

        const placeRaw = placeResponse.data.candidates[0].content.parts[0].text;
        const recommendations = extractArray(placeRaw);

        // Save for later if needed
        lastRecommendations = recommendations;

        // ----- 2. Get Temperatures -----
        const tempPrompt = `Give the current temperature for each of these places: ${recommendations.join(', ')}. Return only a JavaScript array of objects like: [{ city: '...', temperature: '...' }, ...] No explanation, no markdown formatting, no code blocks.`;

        const tempResponse = await axios.post(GEMINI_API_URL, {
            contents: [{ parts: [{ text: tempPrompt }] }]
        });

        const tempRaw = tempResponse.data.candidates[0].content.parts[0].text;
        const temperatureData = extractArray(tempRaw);

        lastTempResults = temperatureData;

        // ----- 3. Get Transport -----
        const placeNames = temperatureData.map(p => p.city).join(', ');
        const transportPrompt = `List the most practical modes of transport from ${city} airport to each of these destinations: ${placeNames}. Include walkable, local bus, cabs, metro, etc. Return only a JavaScript array of objects like: [{ city: '...', transport: '...' }, ...] No explanation, no markdown formatting, no code blocks.`;

        const transportResponse = await axios.post(GEMINI_API_URL, {
            contents: [{ parts: [{ text: transportPrompt }] }]
        });

        const transportRaw = transportResponse.data.candidates[0].content.parts[0].text;
        const transportData = extractArray(transportRaw);

        // ----- 4. Merge all data -----
        const finalData = temperatureData.map(place => {
            const transportInfo = transportData.find(t => t.city.toLowerCase() === place.city.toLowerCase());
            return {
                city: place.city,
                temperature: place.temperature,
                transport: transportInfo ? transportInfo.transport : 'Unknown'
            };
        });

        res.json({
            city,
            places: recommendations,
            details: finalData
        });

    } catch (error) {
        console.error('City Explore Error:', error);
        res.status(500).json({
            error: 'Failed to complete city exploration.',
            details: error.response?.data || error.message
        });
    }
});

// -------- Start server --------
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
 
