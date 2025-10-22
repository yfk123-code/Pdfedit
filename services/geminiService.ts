// This function now calls our own secure backend function, not Gemini directly.
export async function extractTextFromImage(imageDataUrl: string): Promise<string> {
    try {
        // The URL for our Netlify function.
        const response = await fetch('/.netlify/functions/extract-text', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ imageDataUrl }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch from backend.');
        }

        const data = await response.json();
        return data.text;

    } catch (error) {
        console.error("Error calling backend function:", error);
        throw new Error("Could not connect to the text extraction service. Please try again later.");
    }
}
