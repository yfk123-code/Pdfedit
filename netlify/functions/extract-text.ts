// This is our secure backend function. It runs on Netlify, not in the user's browser.

// We need to import the type for the handler
import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

// The Gemini library is imported here, on the backend.
import { GoogleGenAI } from '@google/genai';

function dataUrlToBlob(dataUrl: string): { mimeType: string; data: string } {
    const parts = dataUrl.split(',');
    const metaParts = parts[0].match(/:(.*?);/);
    if (!metaParts || metaParts.length < 2) {
        throw new Error("Invalid data URL");
    }
    const mimeType = metaParts[1];
    const data = parts[1];
    return { mimeType, data };
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // Get the image data from the request sent by the frontend
        const { imageDataUrl } = JSON.parse(event.body || '{}');
        if (!imageDataUrl) {
            return { statusCode: 400, body: JSON.stringify({ error: 'imageDataUrl is required' }) };
        }

        // Securely get the API key from Netlify's environment variables
        const API_KEY = process.env.API_KEY;
        if (!API_KEY) {
            console.error("API_KEY is not set in Netlify environment variables!");
            return { statusCode: 500, body: JSON.stringify({ error: 'API key is not configured on the server.' }) };
        }
        
        const ai = new GoogleGenAI({ apiKey: API_KEY });

        const { mimeType, data } = dataUrlToBlob(imageDataUrl);

        const imagePart = {
            inlineData: {
                mimeType,
                data,
            },
        };
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [imagePart],
            },
            config: {
                systemInstruction: "You are a world-class OCR (Optical Character Recognition) engine. Your task is to extract every single piece of text from the provided image with the highest possible accuracy. Provide only the extracted text as a raw string."
            },
        });
        
        const extractedText = response.text.trim();

        // Send the extracted text back to the frontend
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: extractedText }),
        };

    } catch (error) {
        console.error("Error in Netlify function:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to extract text.' }),
        };
    }
};

export { handler };
