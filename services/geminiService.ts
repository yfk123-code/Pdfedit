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

export async function extractTextFromImage(imageDataUrl: string): Promise<string> {
    // Dynamically import the library only when this function is called.
    const { GoogleGenAI } = await import('@google/genai');
    
    // IMPORTANT FIX: The app was crashing because it was trying to find an API key
    // in a way that doesn't work in the browser, causing a fatal error.
    // This new code safely checks for the API key.
    // You MUST set your API key in Netlify's environment variables.
    const API_KEY = (window as any).API_KEY;

    if (!API_KEY) {
        // This error will now be shown to the user in an alert, instead of crashing the app.
        throw new Error("API_KEY is not configured. Please add your Gemini API_KEY as an environment variable in your Netlify deployment settings.");
    }
    
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    const { mimeType, data } = dataUrlToBlob(imageDataUrl);

    try {
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
                systemInstruction: "You are a world-class OCR (Optical Character Recognition) engine. Your task is to extract every single piece of text from the provided image with the highest possible accuracy.\n- **Languages:** The text can be in any language. Auto-detect and transcribe the characters accurately.\n- **Completeness:** Capture all text, including headers, footers, text within tables, figures, and annotations.\n- **Fidelity:** Pay meticulous attention to very small text, fine print, special characters, symbols (@, #, &, *, etc.), and punctuation.\n- **Formatting:** Preserve the original structure, including line breaks, paragraph spacing, and indentation, as closely as possible.\n- **Output:** Do not add any commentary, summaries, or explanations. Provide only the extracted text as a raw string."
            },
        });
        return response.text.trim();
    } catch (error) {
        console.error("Gemini API call failed:", error);
        if (error instanceof Error && (error.message.includes("API key not valid") || error.message.includes("API_KEY"))) {
             throw new Error("Your Gemini API Key is not valid or configured correctly. Please check it in your deployment settings.");
        }
        throw new Error("Failed to extract text using Gemini API. The API key might be incorrect or the service could be unavailable.");
    }
}
