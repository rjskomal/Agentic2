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

// Global variables to store trip info
let lastRecommendations = [];
let tripDates = { start: '', end: '' };
let tripCity = '';

function extractJSON(text) {
    if (!text || typeof text !== "string") return {};

    try {
        // Match triple backticks with ANY language (json, javascript, etc.)
        const fenceMatch = text.match(/```(?:\w+)?([\s\S]*?)```/i);
        if (fenceMatch) {
            return JSON.parse(fenceMatch[1].trim());
        }

        // Otherwise, match first {...}
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        return JSON.parse(text.trim());
    } catch (err) {
        console.error("❌ Failed to parse Gemini JSON:", err.message);
        console.error("Raw text was:\n", text);
        return {};
    }
}

function validateDateFormat(dateString) {
    const regex = /^\d{2}\/\d{2}\/\d{2}$/;
    return regex.test(dateString);
}

function calculateDaysDifference(startDate, endDate) {
    const [startDay, startMonth, startYear] = startDate.split('/').map(n => parseInt(n));
    const [endDay, endMonth, endYear] = endDate.split('/').map(n => parseInt(n));
    const startFullYear = startYear < 50 ? 2000 + startYear : 1900 + startYear;
    const endFullYear = endYear < 50 ? 2000 + endYear : 1900 + endYear;
    const start = new Date(startFullYear, startMonth - 1, startDay);
    const end = new Date(endFullYear, endMonth - 1, endDay);
    const diffMs = end.getTime() - start.getTime();
    return Math.ceil(diffMs / (1000 * 3600 * 24)) + 1; // inclusive
}

// --------- First: `/prompt` with date and city ---------
app.post('/prompt', async (req, res) => {
    const { city, start_date, end_date } = req.body;

    if (!city) return res.status(400).json({ error: 'City is required' });

    if (!start_date || !end_date) return res.status(400).json({ error: 'Start and end dates are required' });
    if (!validateDateFormat(start_date) || !validateDateFormat(end_date))
        return res.status(400).json({ error: 'Dates must be in dd/mm/yy format' });

    tripDates.start = start_date;
    tripDates.end = end_date;
    tripCity = city;

     //const prompt = `Give me strictly 8 famous tourist places to visit in ${city}. Return only a valid JavaScript array. No explanation, no markdown formatting.`;
   const totalDays = calculateDaysDifference(start_date, end_date);

const prompt = `
Plan a trip for ${city} from ${start_date} to ${end_date}.
Distribute tourist places across ${totalDays} days.
Each day must include 3 to 4 famous tourist places.

Return the response strictly as a valid JavaScript object in this format:

{
  "days": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "places": ["Place 1", "Place 2", "Place 3"]
    },
    {
      "day": 2,
      "date": "YYYY-MM-DD",
      "places": ["Place 4", "Place 5", "Place 6"]
    }
  ]
}
No explanation, no markdown formatting.
`;


    try {
        const response = await axios.post(GEMINI_API_URL, {
            contents: [{ parts: [{ text: prompt }] }],
        });
        const raw = response.data.candidates[0].content.parts[0].text;
let recommendations = extractJSON(raw);

// ✅ Extract only the places from day-wise plan
lastRecommendations = recommendations.days.flatMap(day => day.places);

// Debugging
console.log("📌 Saved lastRecommendations (places only):", lastRecommendations);

res.json({
    city,
    recommendations,
    start_date,
    end_date,
    total_days: calculateDaysDifference(start_date, end_date),
});


    } catch (err) {
        res.status(500).json({ error: 'Error fetching tourist places', details: err.message });
    }
});


app.post('/temp', async (req, res) => {
    let { cities, city } = req.body;

    // If cities not provided, use stored recommendations
    if (!cities || !Array.isArray(cities) || cities.length === 0) {
        if (lastRecommendations.length === 0) {
            if (!city) return res.status(400).json({ error: 'No city info available' });
            return res.status(400).json({ error: 'Call /prompt first to get tourist places' });
        }
        cities = lastRecommendations;
    }

    // ✅ Ensure cities is always an array
    if (!Array.isArray(cities)) {
        cities = [cities];
    }

    const prompt = `Give the current temperature and weather condition (ex: cloudy, sunny) for each of these places: ${cities.join(', ')}. 
Return ONLY valid JSON.
Do not include explanations, text, or code fences.
Return format:
[
  { "city": "...", "temperature": "...", "Weather Condition": "..." }
]`;

    try {
        const response = await axios.post(GEMINI_API_URL, {
            contents: [{ parts: [{ text: prompt }] }],
        });

        const raw = response.data.candidates[0].content.parts[0].text;

        // 🔎 Debug log
        console.log("🌐 Gemini raw response (for /temp):\n", raw);

        const temperatureData = extractJSON(raw);
        res.json({ results: temperatureData });

    } catch (err) {
        console.error("❌ Backend /temp error:", err.message);
        res.status(500).json({ error: 'Error fetching temperature', details: err.message });
    }
});


// --------- `/transport` using stored data if not provided ---------
app.post('/transport', async (req, res) => {
    const { places } = req.body;
    if (!places || !Array.isArray(places) || places.length === 0) {
        if (!lastRecommendations || lastRecommendations.length === 0 || !tripCity) {
            return res.status(400).json({ error: 'No places info' });
        }
    }
    const targetPlaces = places && Array.isArray(places) && places.length > 0 ? places : lastRecommendations;
    const prompt = `Provide the best transportation method to reach each place in ${tripCity}. For places: ${targetPlaces.join(', ')}, from Majestic and Kempegowda Airport. Return a JavaScript array of objects with {place, fromMajestic, fromAirport}.`;

    try {
        const response = await axios.post(GEMINI_API_URL, {
            contents: [{ parts: [{ text: prompt }] }],
        });
        const raw = response.data.candidates[0].content.parts[0].text;
        const transportInfo = extractJSON(raw);
        res.json({ transport: transportInfo });
    } catch (err) {
        res.status(500).json({ error: 'Error fetching transport info', details: err.message });
    }
});

// --------- `/finalTrip` auto uses stored trip info ---------
app.post('/finalTrip', async (req, res) => {
    // Optional: accept specific data, but default to stored data
    const { transportData, temperatureData } = req.body;

    if (!tripDates.start || !tripDates.end || !tripCity) {
        return res.status(400).json({ error: 'Trip info not initialized. Call /prompt first.' });
    }

    const totalDays = calculateDaysDifference(tripDates.start, tripDates.end);

    // Build prompt with stored data
    const prompt = `Create a detailed day-wise trip plan for ${tripCity} from ${tripDates.start} to ${tripDates.end} (${totalDays} days). Strictly only give Daywise (Day 1: ...) ignore all other context. Use transport info: ${JSON.stringify(transportData || [])}. ${temperatureData ? `Use weather info: ${JSON.stringify(temperatureData)}` : ''} Structure: For each day: places, transport, weather, activities, costs, tips. Distribute recommendations logically. Provide cost estimates and detailed suggestions.`;

    try {
        const response = await axios.post(GEMINI_API_URL, {
            contents: [{ parts: [{ text: prompt }] }],
        });
        const tripPlan = response.data.candidates[0].content.parts[0].text;
        res.json({
            city: tripCity,
            start_date: tripDates.start,
            end_date: tripDates.end,
            total_days: totalDays,
            trip_plan: tripPlan,
        });
    } catch (err) {
        res.status(500).json({ error: 'Error generating trip plan', details: err.message });
    }
});

// --------- Optional: `/autoFinalTrip` triggers full chain ----------
// Might be useful to run everything sequentially (calls /prompt, /temp, /transport, /finalTrip)
app.post('/autoFinalTrip', async (req, res) => {
    const { city, start_date, end_date } = req.body;
    // Step 1: call /prompt to set global data
    await new Promise((resolve, reject) => {
        axios.post(`http://localhost:${PORT}/prompt`, { city, start_date, end_date }).then(resolve).catch(reject);
    });
    // Step 2: call /temp
    const tempRes = await axios.post(`http://localhost:${PORT}/temp`);
    const temperatureData = tempRes.data.results;

    // Step 3: call /transport
    const transportRes = await axios.post(`http://localhost:${PORT}/transport`);
    const transportData = transportRes.data.transport;

    // Step 4: call /finalTrip
    const finalRes = await axios.post(`http://localhost:${PORT}/finalTrip`, {
        transportData,
        temperatureData,
    });
    res.json(finalRes.data);
});

// --------- Server start ---------
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
