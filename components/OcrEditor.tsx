import React, { useState, useCallback, useRef } from 'react';
// This service now calls our secure backend, so no API key is needed here.
import { extractTextFromImage } from '../services/geminiService.ts';
import { processPdf, processImages, createPdf } from '../utils/pdfUtils.ts';
import type { Page } from '../types.ts';
import { UploadIcon, Trash2Icon, PlusIcon, DownloadIcon, CopyIcon, CheckIcon, Loader2, ArrowLeftIcon } from './icons.tsx';

interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg';
}
const Spinner: React.FC<SpinnerProps> = ({ size = 'md' }) => {
    const sizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-8 w-8',
        lg: 'h-12 w-12',
    };
    return (
        <div className="flex justify-center items-center">
            <Loader2 className={`animate-spin text-primary ${sizeClasses[size]}`} />
        </div>
    );
};

interface OcrEditorProps {
    onBackToHome: () => void;
}

export const OcrEditor: React.FC<OcrEditorProps> = ({ onBackToHome }) => {
    const [pages, setPages] = useState<Page[]>([]);
    const [selectedPageIndex, setSelectedPageIndex] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [processingText, setProcessingText] = useState<string>('');
    const [copiedPage, setCopiedPage] = useState<number | null>(null);
    const addPageInputRef = useRef<HTMLInputElement>(null);
    const uploadInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const pdfFile = [...files].find(file => file.type === 'application/pdf');
        if (!pdfFile) {
            alert("Please upload a PDF file.");
            return;
        }

        setIsLoading(true);
        setProcessingText('Processing PDF...');
        setPages([]);
        setSelectedPageIndex(null);

        try {
            const processedPages = await processPdf(pdfFile);
            setPages(processedPages);
            if (processedPages.length > 0) {
                setSelectedPageIndex(0);
                // Call extraction for the first page automatically
                extractTextForPage(0, processedPages);
            }
        } catch (error) {
            console.error("Error processing PDF:", error);
            alert("Failed to process PDF. Please ensure it's a valid file.");
        } finally {
            setIsLoading(false);
            setProcessingText('');
        }
    };
    
    // This function is much simpler now. No more API key handling!
    const extractTextForPage = useCallback(async (index: number, pageList: Page[]) => {
        const page = pageList[index];
        if (page.extractedText !== null || page.isExtracting) return;

        setPages(prev => prev.map((p, i) => i === index ? { ...p, isExtracting: true } : p));
        
        try {
            const text = await extractTextFromImage(page.imageDataUrl);
            setPages(prev => prev.map((p, i) => i === index ? { ...p, extractedText: text || "No text found.", isExtracting: false } : p));
        } catch (error) {
            console.error("Error extracting text:", error);
            alert((error as Error).message);
            setPages(prev => prev.map((p, i) => i === index ? { ...p, extractedText: "Error extracting text.", isExtracting: false } : p));
        }
    }, []);

    const handleSelectPage = (index: number) => {
        setSelectedPageIndex(index);
        // Automatically extract text if it hasn't been extracted yet
        if (pages[index] && pages[index].extractedText === null) {
            extractTextForPage(index, pages);
        }
    };

    const handleDeletePage = (indexToDelete: number) => {
        const newPages = pages.filter((_, index) => index !== indexToDelete);
        setPages(newPages);
        if (selectedPageIndex === indexToDelete) {
            if (newPages.length > 0) {
                const newIndex = Math.max(0, indexToDelete - 1);
                setSelectedPageIndex(newIndex);
            } else {
                setSelectedPageIndex(null);
            }
        } else if (selectedPageIndex && selectedPageIndex > indexToDelete) {
            setSelectedPageIndex(prev => prev! - 1);
        }
    };

    const handleAddPages = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        setIsLoading(true);
        setProcessingText('Adding new pages...');
        try {
            const newPages = await processImages(Array.from(files));
            setPages(prev => [...prev, ...newPages]);
        } catch (error) {
            console.error("Error adding pages:", error);
            alert("Failed to add new pages. Please use valid image files (PNG, JPG).");
        }
        setIsLoading(false);
        setProcessingText('');
        event.target.value = ''; // Reset file input
    };

    const handleDownload = async () => {
        if (pages.length === 0) return;
        setIsLoading(true);
        setProcessingText('Creating new PDF...');
        try {
            const pdfBytes = await createPdf(pages);
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `edited-document-${Date.now()}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Error creating PDF:", error);
            alert("Failed to create the new PDF.");
        }
        setIsLoading(false);
        setProcessingText('');
    };
    
    const handleCopyToClipboard = (text: string, pageIndex: number) => {
        navigator.clipboard.writeText(text);
        setCopiedPage(pageIndex);
        setTimeout(() => setCopiedPage(null), 2000);
    };

    const selectedPage = selectedPageIndex !== null ? pages[selectedPageIndex] : null;

    if (isLoading && pages.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background">
                <Spinner size="lg" />
                <p className="mt-4 text-lg text-text-secondary">{processingText}</p>
            </div>
        );
    }
    
    if (pages.length === 0) {
        return (
             <div className="min-h-screen text-text-primary p-4 sm:p-6 md:p-8">
                <div className="max-w-4xl mx-auto">
                    <button onClick={onBackToHome} className="flex items-center gap-2 text-text-secondary hover:text-text-primary mb-8">
                        <ArrowLeftIcon className="w-5 h-5" />
                        Back to Tools
                    </button>
                    <header className="text-center py-12">
                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-text-primary mb-4">PDF OCR & Editor</h1>
                        <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto">
                            Effortlessly extract text from your PDFs and images, manage pages, and export your work.
                        </p>
                    </header>

                    <div className="text-center p-8 border-2 border-dashed border-slate-600 rounded-lg bg-surface/50">
                        <label htmlFor="pdf-upload" className="cursor-pointer inline-flex items-center gap-3 px-8 py-4 bg-primary text-white font-semibold rounded-lg hover:bg-sky-500 transition-transform duration-200 hover:scale-105">
                            <UploadIcon className="w-6 h-6" />
                            <span className="text-lg">Upload PDF to Get Started</span>
                        </label>
                        <input id="pdf-upload" ref={uploadInputRef} type="file" className="hidden" accept="application/pdf" onChange={handleFileChange} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row h-screen bg-background font-sans overflow-hidden">
             {isLoading && (
                <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center z-50">
                    <Spinner size="lg" />
                    <p className="mt-4 text-lg text-white">{processingText}</p>
                </div>
            )}
            
            <aside className="w-full lg:w-64 h-auto lg:h-auto bg-slate-900/50 p-2 lg:p-4 flex flex-col order-last lg:order-first flex-shrink-0">
                 <button onClick={onBackToHome} className="lg:flex items-center gap-2 text-text-secondary hover:text-text-primary mb-4 hidden">
                    <ArrowLeftIcon className="w-5 h-5" />
                    <span>Back to Tools</span>
                </button>
                <h2 className="text-xl font-bold mb-4 text-text-primary hidden lg:block">Pages</h2>
                <div className="flex-grow overflow-x-auto overflow-y-hidden lg:overflow-y-auto lg:overflow-x-hidden">
                    <div className="flex flex-row lg:flex-col space-x-2 lg:space-x-0 lg:space-y-2 h-full items-start lg:items-stretch pb-2 lg:pb-0">
                        {pages.map((page, index) => (
                            <div key={page.id} className={`relative p-1 rounded-md cursor-pointer transition-all w-24 lg:w-full flex-shrink-0 ${selectedPageIndex === index ? 'ring-2 ring-primary' : 'ring-1 ring-surface'}`} onClick={() => handleSelectPage(index)}>
                                <img src={page.imageDataUrl} alt={`Page ${index + 1}`} className="w-full rounded aspect-[7/10] object-cover" />
                                <div className="absolute top-1 right-1">
                                    <button onClick={(e) => { e.stopPropagation(); handleDeletePage(index); }} className="p-1.5 bg-red-600 text-white rounded-full hover:bg-red-500 transition-colors shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-white">
                                        <Trash2Icon className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="absolute bottom-1 left-1 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                                    {index + 1}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="mt-auto pt-2 lg:pt-4 border-t border-surface flex flex-row lg:flex-col gap-2">
                     <input type="file" multiple ref={addPageInputRef} className="hidden" accept="image/png, image/jpeg" onChange={handleAddPages} />
                     <button onClick={() => addPageInputRef.current?.click()} className="flex-1 lg:flex-initial w-full flex items-center justify-center gap-2 px-4 py-2 bg-secondary text-white font-semibold rounded-lg hover:bg-slate-500 transition-colors">
                        <PlusIcon className="w-5 h-5" />
                        <span>Add Page(s)</span>
                    </button>
                    <button onClick={handleDownload} className="flex-1 lg:flex-initial w-full mt-0 lg:mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-sky-500 transition-colors" disabled={pages.length === 0}>
                        <DownloadIcon className="w-5 h-5" />
                        <span>Export PDF</span>
                    </button>
                </div>
            </aside>

            <main className="flex-1 flex flex-col p-3 lg:p-6 overflow-hidden">
                {selectedPage ? (
                    <div className="flex flex-col gap-4 lg:gap-6 h-full min-h-0">
                        <div className="bg-surface rounded-lg p-2 lg:p-4 flex flex-col flex-1 min-h-0">
                            <h3 className="text-lg font-semibold mb-2 text-text-secondary flex-shrink-0">Page {selectedPageIndex! + 1}</h3>
                             <div className="flex-grow overflow-hidden rounded relative bg-black/20">
                                <img src={selectedPage.imageDataUrl} alt={`Page ${selectedPageIndex! + 1}`} className="absolute w-full h-full object-contain" />
                            </div>
                        </div>
                        
                         <div className="h-24 flex-shrink-0 flex items-center justify-center border-2 border-dashed border-slate-600 rounded-lg bg-surface/50">
                            <p className="text-text-secondary">Advertisement Placeholder</p>
                        </div>

                        <div className="bg-surface rounded-lg p-2 lg:p-4 flex flex-col flex-1 min-h-0">
                            <div className="flex justify-between items-center mb-2 flex-shrink-0">
                                <h3 className="text-lg font-semibold text-text-secondary">Extracted Text</h3>
                                {selectedPage.extractedText && selectedPage.extractedText !== "Error extracting text." && (
                                    <button onClick={() => handleCopyToClipboard(selectedPage.extractedText!, selectedPageIndex!)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-secondary rounded-md hover:bg-slate-500 transition-colors">
                                        {copiedPage === selectedPageIndex ? <CheckIcon className="w-4 h-4 text-green-400" /> : <CopyIcon className="w-4 h-4" />}
                                        {copiedPage === selectedPageIndex ? 'Copied!' : 'Copy'}
                                    </button>
                                )}
                            </div>
                            <div className="flex-grow bg-background p-4 rounded-md overflow-y-auto">
                                {selectedPage.isExtracting ? (
                                    <div className="flex flex-col items-center justify-center h-full">
                                        <Spinner />
                                        <p className="mt-2 text-text-secondary">Extracting text with Gemini...</p>
                                    </div>
                                ) : (
                                    <p className="text-text-secondary whitespace-pre-wrap font-mono text-sm leading-relaxed">
                                        {selectedPage.extractedText}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-center">
                        ...
                    </div>
                )}
            </main>
        </div>
    );
};
