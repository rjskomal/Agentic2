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
let lastTempResults = [];

function extractArray(text) {
    try {
        const cleaned = text
            .replace(/```/g, '')
            .replace(/javascript/i, '')
            .replace(/\n/g, '')
            .trim();

        const parsed = Function('"use strict";return (' + cleaned + ')')();

        if (!Array.isArray(parsed)) throw new Error('Parsed data is not an array.');

        return parsed;
    } catch (err) {
        throw new Error('Failed to parse array from Gemini response.');
    }
}

app.post('/prompt', async (req, res) => {
    const { city } = req.body;

    if (!city) return res.status(400).json({ error: 'City name is required in the request body.' });

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
    } catch (error) {
        res.status(500).json({
            error: 'Failed to fetch data from Gemini API.',
            details: error.response?.data || error.message
        });
    }
});

app.post('/temp', async (req, res) => {
    let { cities } = req.body;

    if (!Array.isArray(cities) || cities.length === 0) {
        if (lastRecommendations.length === 0) {
            return res.status(400).json({ error: 'No cities provided and no previous recommendations found.' });
        }
        cities = lastRecommendations;
    }

    const prompt = `Give the current temperature for each of these places: ${cities.join(', ')}. Return only a JavaScript array of objects like: [{ city: '...', temperature: '...' }, ...] No explanation, no markdown formatting, no code blocks.`;

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
    } catch (error) {
        res.status(500).json({
            error: 'Failed to fetch temperature data from Gemini API.',
            details: error.response?.data || error.message
        });
    }
});

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

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
