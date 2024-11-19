const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const axios = require('axios');
const openai = new OpenAI();

module.exports = function (pool) {
    const validate = require('../tokenValidation/checkToken')(pool);
    const conversations = {};

    router.post('/chat', validate, async (req, res) => {
        const sessionId = req.sessionId;
        const userMessage = req.body.message;

        if (!sessionId) {
            return res.status(400).json({ error: "Session ID is required" });
        }

        if (!conversations[sessionId]) {
            conversations[sessionId] = [
                { role: "system", content: "You are a helpful assistant. You are able to fetch data from JSON endpoints. You can access these endpoints: search/<query>, series, series/<seriesID>, books/<seriesID>, book/<bookID>, chapters/<bookID>, chapter/<chapterID>. You can perform multiple searches in one go or just one. Just send: Backend: <endpoint-name> <endpoint-name2> etc. Use the data returned like this: Returning data based on conversation: <data>. If based on context you need to do one search after other do other fetch after first data is returned and then write to user. Don't make anything up. If users ask for data, fetch them and don't rely on your knowledge. Use markdown only for whole response to the user but make lists simple." }
            ];
        }

        conversations[sessionId].push({
            role: "user",
            content: userMessage,
        });

        try {
            const responseMessage = await getOpenAIResponse(conversations[sessionId]);
            const fetchMatches = responseMessage.content.match(/^Backend:.*$/gm);
            
            if (fetchMatches) {
                const fetchPromises = fetchMatches.flatMap((match) => {
                    const endpoints = match.split(' ').slice(1);
                    return endpoints.map(async (endpoint) => {
                        return await fetchDataFromEndpoint(endpoint);
                    });
                });
            
                const fetchedDataArray = await Promise.all(fetchPromises);
                const fetchedData = fetchedDataArray.filter(data => data !== null);
        
                if (fetchedData.length > 0) {
                    const updatedResponseMessage = await getOpenAIResponse([
                        ...conversations[sessionId],
                        { role: "system", content: `Returning data based on conversation: ${JSON.stringify(fetchedData)}` }
                    ]);
        
                    conversations[sessionId].push(updatedResponseMessage);
                    return res.json({ response: updatedResponseMessage });
                } else {
                    const errorResponseMessage = await getOpenAIResponse([
                        ...conversations[sessionId],
                        { role: "system", content: `Error fetching data from endpoints` }
                    ]);
        
                    conversations[sessionId].push(errorResponseMessage);
                    return res.json({ response: errorResponseMessage });
                }
            }
        
            conversations[sessionId].push(responseMessage);
            res.json({ response: responseMessage });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
};

async function getOpenAIResponse(messages) {
    const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: messages,
    });
    return completion.choices[0].message;
}

async function fetchDataFromEndpoint(endpoint) {
    try {
        const fetchResponse = await axios.get(`https://apimdb.maxix.sk/${endpoint}`);
        return fetchResponse.data;
    } catch (error) {
        console.error(`Error fetching data from ${endpoint}: ${error.message}`);
        return null;
    }
}