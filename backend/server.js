const express = require('express');
const dotenv = require('dotenv');
const axios = require('axios');
dotenv.config();

const app = express();
const cors = require('cors');
app.use(cors());

app.use(express.json());

const PORT = process.env.PORT;
const GEMINI_API_URL = process.env.GEMINI_API_URL;



app.post('/prompt', async (req, res) => {
    const { city } = req.body;

    if (!city) {
        return res.status(400).json({ error: 'City name is required in the request body.' });
    }

    const prompt = `List strictly 8 best tourist places to visit in ${city}. Include famous food places, monuments, parks, and entertainment spots. Each point should be a bullet point followed by a one-sentence description. Do not add any extra text before or after the bullet points.`;

    try {
        const response = await axios.post(GEMINI_API_URL, {
            contents: [
                {
                    parts: [
                        { text: prompt }
                    ]
                }
            ]
        });

        const reply = response.data.candidates[0].content.parts[0].text;
        res.json({ city, recommendations: reply });

    } catch (error) {
        console.error('Gemini API error details:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch data from Gemini API.', details: error.response?.data || error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});