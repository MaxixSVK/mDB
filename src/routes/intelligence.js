const router = require('express').Router();
const OpenAI = require('openai');
const axios = require('axios');
const openai = new OpenAI();

module.exports = function (pool) {
    const validate = require('../middleware/checkToken')(pool);
    const conversations = {};

    router.post('/chat', validate, async (req, res, next) => {
        const sessionId = req.sessionId;
        const userMessage = req.body.message;
        
        initializeConversation(sessionId);

        conversations[sessionId].push({
            role: "user",
            content: userMessage,
        });

        try {
            let responseMessage = await handleConversation(sessionId);
            conversations[sessionId].push(responseMessage);
            res.success({ response: responseMessage });
        } catch (error) {
            next(error);
        }
    });

    function initializeConversation(sessionId) {
        if (!conversations[sessionId]) {
            conversations[sessionId] = [
                {
                    role: "system",
                    content: "You are a helpful assistant in current user's personal library - mDB. You are able to fetch data from JSON endpoints. You can access these endpoints: search/<query>, series, series/<seriesID>, books/<seriesID>, book/<bookID>, chapters/<bookID>, chapter/<chapterID>. You can perform multiple searches in one go or just one. Just send: Backend: <endpoint-name> <endpoint-name2> etc. Use the data returned like this: Returning data based on conversation: <data>. If not enough data is returned based on the context, ask again for additional data based on the previous data, and then send the response back to the user normally.  Don't make anything up. If users ask for data, fetch them and don't rely on your knowledge. Use markdown only for whole response to the user but make lists simple."
                }
            ];
        }
    }

    async function handleConversation(sessionId) {
        let responseMessage = await getOpenAIResponse(conversations[sessionId]);
        let fetchMatches = detectBackendRequests(responseMessage.content);

        while (fetchMatches) {
            const fetchedData = await fetchDataFromEndpoints(fetchMatches);

            if (fetchedData.length > 0) {
                responseMessage = await getOpenAIResponse([
                    ...conversations[sessionId],
                    { role: "system", content: `Returning data based on conversation: ${JSON.stringify(fetchedData)}` }
                ]);
            } else {
                responseMessage = await getOpenAIResponse([
                    ...conversations[sessionId],
                    { role: "system", content: `Error fetching data from endpoints` }
                ]);
            }

            fetchMatches = detectBackendRequests(responseMessage.content);
        }

        return responseMessage;
    }

    async function getOpenAIResponse(messages) {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: messages,
        });
        return completion.choices[0].message;
    }

    async function fetchDataFromEndpoints(fetchMatches) {
        const fetchPromises = fetchMatches.flatMap((match) => {
            const endpoints = match.split(' ').slice(1);
            return endpoints.map(fetchDataFromEndpoint);
        });

        const fetchedDataArray = await Promise.all(fetchPromises);
        return fetchedDataArray.filter(data => data !== null);
    }

    async function fetchDataFromEndpoint(endpoint) {
        try {
            const fetchResponse = await axios.get(`https://apimdb.maxix.sk/${endpoint}`);
            console.log(`AI fetched data from ${endpoint}`);
            return fetchResponse.data;
        } catch (error) {
            return null;
        }
    }

    function detectBackendRequests(content) {
        return content.match(/^Backend:.*$/gm);
    }

    return router;
};