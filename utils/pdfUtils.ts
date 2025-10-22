import type { Page } from './types';

// pdf-lib is loaded from a CDN, so we need to declare its global variable.
declare const PDFLib: any;

const renderPdfPage = async (pdfDoc: any, pageNum: number): Promise<string> => {
    const page = pdfDoc.getPages()[pageNum];
    const { width, height } = page.getSize();
    
    const scale = 2; // Render at a higher resolution for better OCR quality
    const viewportWidth = width * scale;
    const viewportHeight = height * scale;

    const canvas = document.createElement('canvas');
    canvas.width = viewportWidth;
    canvas.height = viewportHeight;
    const context = canvas.getContext('2d');

    if (!context) {
        throw new Error("Could not get canvas context");
    }

    const tempPdfDoc = await PDFLib.PDFDocument.create();
    const [copiedPage] = await tempPdfDoc.copyPages(pdfDoc, [pageNum]);
    tempPdfDoc.addPage(copiedPage);
    const pdfBytes = await tempPdfDoc.save();

    const pdfJs = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.3.136/build/pdf.min.mjs');
    pdfJs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.3.136/build/pdf.worker.min.mjs`;

    const pdfDocProxy = await pdfJs.getDocument({ data: pdfBytes }).promise;
    const pdfPageProxy = await pdfDocProxy.getPage(1);
    
    const viewport = pdfPageProxy.getViewport({ scale });

    await pdfPageProxy.render({ canvasContext: context, viewport }).promise;

    return canvas.toDataURL('image/jpeg', 0.9);
};


export const processPdf = async (file: File): Promise<Page[]> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
    const numPages = pdfDoc.getPageCount();
    const pages: Page[] = [];

    for (let i = 0; i < numPages; i++) {
        const imageDataUrl = await renderPdfPage(pdfDoc, i);
        pages.push({
            id: `${file.name}-${i}-${Date.now()}`,
            imageDataUrl,
            extractedText: null,
            isExtracting: false,
            source: { type: 'pdf', file, pageIndex: i },
        });
    }

    return pages;
};

export const processImages = async (files: File[]): Promise<Page[]> => {
    const imagePromises = files.map(file => {
        return new Promise<Page>((resolve, reject) => {
            if (!file.type.startsWith('image/')) {
                reject(new Error(`File ${file.name} is not an image.`));
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                resolve({
                    id: `${file.name}-${Date.now()}`,
                    imageDataUrl: e.target?.result as string,
                    extractedText: null,
                    isExtracting: false,
                    source: { type: 'image', file },
                });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    });

    return Promise.all(imagePromises);
};


export const createPdf = async (pages: Page[]): Promise<Uint8Array> => {
    const newPdfDoc = await PDFLib.PDFDocument.create();
    const originalPdfs: { [key: string]: any } = {};

    for (const page of pages) {
        if (page.source.type === 'pdf') {
            const { file, pageIndex } = page.source;
            if (!originalPdfs[file.name]) {
                const arrayBuffer = await file.arrayBuffer();
                originalPdfs[file.name] = await PDFLib.PDFDocument.load(arrayBuffer);
            }
            const pdfToCopyFrom = originalPdfs[file.name];
            const [copiedPage] = await newPdfDoc.copyPages(pdfToCopyFrom, [pageIndex]);
            newPdfDoc.addPage(copiedPage);
        } else if (page.source.type === 'image') {
            const { file } = page.source;
            const arrayBuffer = await file.arrayBuffer();
            let image;
            if (file.type === 'image/jpeg') {
                image = await newPdfDoc.embedJpg(arrayBuffer);
            } else if (file.type === 'image/png') {
                image = await newPdfDoc.embedPng(arrayBuffer);
            } else {
                console.warn(`Unsupported image type for PDF embedding: ${file.type}. Skipping.`);
                continue;
            }

            // FIX: Rename variable to avoid shadowing the loop variable 'page'.
            const newPdfPage = newPdfDoc.addPage();
            const { width, height } = image.scale(1);
            newPdfPage.setSize(width, height);
            newPdfPage.drawImage(image, {
                x: 0,
                y: 0,
                width: width,
                height: height,
            });
        }
    }
    return newPdfDoc.save();
};
