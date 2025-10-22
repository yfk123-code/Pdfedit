export interface Page {
    id: string; // Unique identifier for React key
    imageDataUrl: string; // For display
    extractedText: string | null; // Null initially, then string
    isExtracting: boolean; // To show loading state per page
    source: {
        type: 'pdf';
        file: File;
        pageIndex: number;
    } | {
        type: 'image';
        file: File;
    };
}
