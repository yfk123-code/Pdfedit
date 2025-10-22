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
    
    // In a browser environment like Netlify, environment variables are not
    // available on a `process.env` object. Attempting to access `process`
    // throws a ReferenceError and crashes the entire application, leading
    // to the white screen.
    // We must check for the key on the `window` object if it exists.
    // A better approach for production would be a secure server-side proxy,
    // but for this client-side app, we'll assume the key is injected
    // into the environment in a browser-compatible way if at all.
    // For now, we will make this check fail gracefully without crashing.
    
    // We will attempt to get the API key from a global scope if it exists,
    // but we will not assume `process` is defined.
    // A real production app would fetch this from a secure backend endpoint.
    // For this project, we'll throw a clear error if it's not found.
    const API_KEY = (window as any).API_KEY; // A placeholder for where the key *should* be in a browser.

    if (!API_KEY && !(window as any).GEMINI_API_KEY) {
        // This is a simplified check. A robust app would have a dedicated config.
        // We'll throw an error that the calling component can catch and display.
         throw new Error("API_KEY is not configured. Please ensure it is set up correctly in your deployment environment.");
    }
    
    // Use the found key, defaulting to a fallback if needed.
    const finalApiKey = API_KEY || (window as any).GEMINI_API_KEY;
    
    const ai = new GoogleGenAI({ apiKey: finalApiKey });

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
