import React, { useState } from 'react';
import { OcrEditor } from './components/OcrEditor';
import { JpgToPdfConverter } from './components/JpgToPdfConverter';
import { OcrIcon, ImageToPdfIcon } from './components/icons';

type Tool = 'home' | 'ocr' | 'jpgToPdf';

const App: React.FC = () => {
    const [activeTool, setActiveTool] = useState<Tool>('home');

    const renderTool = () => {
        switch (activeTool) {
            case 'ocr':
                return <OcrEditor onBackToHome={() => setActiveTool('home')} />;
            case 'jpgToPdf':
                return <JpgToPdfConverter onBackToHome={() => setActiveTool('home')} />;
            case 'home':
            default:
                return <ToolSelectionScreen onSelectTool={setActiveTool} />;
        }
    };

    return <div className="bg-background min-h-screen">{renderTool()}</div>;
};

interface ToolSelectionScreenProps {
    onSelectTool: (tool: Tool) => void;
}

const ToolSelectionScreen: React.FC<ToolSelectionScreenProps> = ({ onSelectTool }) => {
    return (
        <div className="text-text-primary p-4 sm:p-6 md:p-8">
            <div className="max-w-4xl mx-auto">
                <header className="text-center py-12">
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-text-primary mb-4">Intelligent Document Tools</h1>
                    <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto">
                        A suite of powerful tools for your PDF and image needs, powered by Google Gemini.
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                    <ToolCard
                        icon={<OcrIcon className="w-12 h-12 mb-4 text-primary" />}
                        title="PDF OCR & Editor"
                        description="Extract text, add or remove pages from a PDF. Ideal for editing scanned documents."
                        onClick={() => onSelectTool('ocr')}
                    />
                    <ToolCard
                        icon={<ImageToPdfIcon className="w-12 h-12 mb-4 text-primary" />}
                        title="JPG to PDF Converter"
                        description="Convert multiple JPG or PNG images into a single, easy-to-share PDF file."
                        onClick={() => onSelectTool('jpgToPdf')}
                    />
                </div>
                 <footer className="text-center py-10 mt-8">
                    <p className="text-slate-400 text-sm">
                        Made with <span className="text-red-500">❤️</span> by{' '}
                        <span className="font-bold text-text-primary transition-colors hover:text-primary">
                            PATHAN YOUSUF KHAN
                        </span>{' '}
                        ✨
                    </p>
                </footer>
            </div>
        </div>
    );
};

interface ToolCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    onClick: () => void;
}

const ToolCard: React.FC<ToolCardProps> = ({ icon, title, description, onClick }) => {
    return (
        <div
            onClick={onClick}
            className="bg-surface p-8 rounded-lg text-center cursor-pointer transition-all duration-300 ease-in-out transform hover:scale-105 hover:bg-slate-600/50 border border-transparent hover:border-primary"
        >
            {icon}
            <h3 className="text-2xl font-semibold mb-3">{title}</h3>
            <p className="text-text-secondary">{description}</p>
        </div>
    );
};


export default App;
