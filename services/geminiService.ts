import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

function dataUrlToBlob(dataUrl: string): { mimeType: string; data: string } {
    const parts = dataUrl.split(',');
    const meta = parts[0].split(':')[1].split(';')[0];
    const data = parts[1];
    return { mimeType: meta, data: data };
}

export async function extractTextFromImage(imageDataUrl: string): Promise<string> {
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
        throw new Error("Failed to extract text using Gemini API.");
    }
}
