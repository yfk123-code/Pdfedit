import React, { useState, useRef } from 'react';
import { processImages, createPdf } from '../utils/pdfUtils';
import type { Page } from '../types';
import { UploadIcon, DownloadIcon, Loader2, ArrowLeftIcon, Trash2Icon } from './icons';

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


interface JpgToPdfConverterProps {
    onBackToHome: () => void;
}

export const JpgToPdfConverter: React.FC<JpgToPdfConverterProps> = ({ onBackToHome }) => {
    const [images, setImages] = useState<Page[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [processingText, setProcessingText] = useState<string>('');
    const uploadInputRef = useRef<HTMLInputElement>(null);
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        setIsLoading(true);
        setProcessingText('Processing images...');
        try {
            const newImages = await processImages(Array.from(files));
            setImages(prev => [...prev, ...newImages]);
        } catch (error) {
            console.error("Error processing images:", error);
            alert("Failed to process images. Please use valid image files (PNG, JPG).");
        } finally {
            setIsLoading(false);
            setProcessingText('');
        }
        event.target.value = ''; // Reset input
    };
    
    const handleDownload = async () => {
        if (images.length === 0) return;
        setIsLoading(true);
        setProcessingText('Creating PDF...');
        try {
            const pdfBytes = await createPdf(images);
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `converted-images-${Date.now()}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Error creating PDF:", error);
            alert("Failed to create the PDF.");
        }
        setIsLoading(false);
        setProcessingText('');
    };

    const handleDeleteImage = (indexToDelete: number) => {
        setImages(prev => prev.filter((_, index) => index !== indexToDelete));
    };
    
    const handleDragSort = () => {
        if (dragItem.current === null || dragOverItem.current === null) return;
        
        const newImages = [...images];
        const draggedItemContent = newImages.splice(dragItem.current, 1)[0];
        newImages.splice(dragOverItem.current, 0, draggedItemContent);
        
        dragItem.current = null;
        dragOverItem.current = null;
        setImages(newImages);
    };

    return (
        <div className="min-h-screen text-text-primary p-4 sm:p-6 md:p-8 relative">
            {isLoading && (
                <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center z-50">
                    <Spinner size="lg" />
                    <p className="mt-4 text-lg text-white">{processingText}</p>
                </div>
            )}
            <div className="max-w-6xl mx-auto">
                 <button onClick={onBackToHome} className="flex items-center gap-2 text-text-secondary hover:text-text-primary mb-8">
                    <ArrowLeftIcon className="w-5 h-5" />
                    Back to Tools
                </button>
                <header className="text-center pb-12">
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-text-primary mb-4">JPG to PDF Converter</h1>
                    <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto">
                        Upload your images, reorder them as needed, and convert them into a single PDF.
                    </p>
                </header>

                {images.length === 0 ? (
                    <div className="text-center p-8 border-2 border-dashed border-slate-600 rounded-lg bg-surface/50">
                        <label htmlFor="image-upload" className="cursor-pointer inline-flex items-center gap-3 px-8 py-4 bg-primary text-white font-semibold rounded-lg hover:bg-sky-500 transition-transform duration-200 hover:scale-105">
                            <UploadIcon className="w-6 h-6" />
                            <span className="text-lg">Upload JPG or PNG Images</span>
                        </label>
                        <input id="image-upload" ref={uploadInputRef} type="file" className="hidden" accept="image/png, image/jpeg" multiple onChange={handleFileChange} />
                    </div>
                ) : (
                    <div>
                         <div className="flex flex-col sm:flex-row justify-center items-center gap-4 p-4 bg-surface/50 rounded-lg mb-8">
                            <p className="text-text-secondary text-center sm:text-left flex-grow">
                                You have {images.length} image{images.length > 1 ? 's' : ''}. Drag and drop to reorder.
                            </p>
                            <div className="flex gap-4">
                                <button onClick={() => uploadInputRef.current?.click()} className="flex items-center justify-center gap-2 px-4 py-2 bg-secondary text-white font-semibold rounded-lg hover:bg-slate-500 transition-colors">
                                    <UploadIcon className="w-5 h-5" />
                                    <span>Add More</span>
                                </button>
                                <button onClick={handleDownload} className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-sky-500 transition-colors" disabled={images.length === 0}>
                                    <DownloadIcon className="w-5 h-5" />
                                    <span>Convert to PDF</span>
                                </button>
                            </div>
                         </div>
                         <input id="image-upload" ref={uploadInputRef} type="file" className="hidden" accept="image/png, image/jpeg" multiple onChange={handleFileChange} />

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                           {images.map((image, index) => (
                               <div 
                                key={image.id} 
                                className="relative group cursor-grab active:cursor-grabbing"
                                draggable
                                onDragStart={() => dragItem.current = index}
                                onDragEnter={() => dragOverItem.current = index}
                                onDragEnd={handleDragSort}
                                onDragOver={(e) => e.preventDefault()}
                                >
                                   <div className="absolute top-1 right-1 z-10">
                                        <button onClick={() => handleDeleteImage(index)} className="p-1.5 bg-red-600 text-white rounded-full hover:bg-red-500 transition-all opacity-0 group-hover:opacity-100 shadow-lg focus:opacity-100">
                                            <Trash2Icon className="w-4 h-4" />
                                        </button>
                                   </div>
                                    <div className="absolute bottom-1 left-1 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded z-10">
                                        {index + 1}
                                    </div>
                                   <img src={image.imageDataUrl} alt={`Page ${index + 1}`} className="w-full rounded aspect-[7/10] object-cover border-2 border-surface group-hover:border-primary transition-colors" />
                               </div>
                           ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
