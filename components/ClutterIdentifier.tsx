import React, { useState, useCallback, useRef } from 'react';
import { analyzeClutter } from '../services/geminiService';
import { IdentifiedItem, BoundingBox, CropRegion } from '../types';
import Spinner from './Spinner';
import { IconUpload, IconScan, IconValue, IconLink, IconLightbulb, IconFire, IconTrendingUp, IconClock, IconSearch, IconCrop, IconX, IconChevronDown, IconChevronUp } from './Icons';
import { useTranslation } from '../App';
import ScanningOverlay from './ScanningOverlay';

const fileToBase64 = (file: File): Promise<{base64: string, mimeType: string}> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const [header, data] = result.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] || 'application/octet-stream';
      resolve({ base64: data, mimeType });
    };
    reader.onerror = (error) => reject(error);
  });


const ClutterIdentifier: React.FC = () => {
    const { t, language } = useTranslation();
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [results, setResults] = useState<IdentifiedItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isAnalyzingSelection, setIsAnalyzingSelection] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    
    // State for Loupe
    const [isLoupeActive, setIsLoupeActive] = useState(false);
    const [loupePosition, setLoupePosition] = useState({ x: 0, y: 0, visible: false });
    const [loupeSize, setLoupeSize] = useState(150);
    const [loupeZoom, setLoupeZoom] = useState(2.5);
    const viewportRef = useRef<HTMLDivElement>(null);

    // State for selection
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectionRect, setSelectionRect] = useState<{startX: number, startY: number, endX: number, endY: number} | null>(null);
    const [cropRegion, setCropRegion] = useState<CropRegion | null>(null);
    const selectionStartRef = useRef({x: 0, y: 0});
    
    // State for collapsible sources
    const [sourcesVisible, setSourcesVisible] = useState<Record<number, boolean>>({});

    const toggleSourceVisibility = (index: number) => {
        setSourcesVisible(prev => ({...prev, [index]: !prev[index]}));
    }


    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setImageFile(file);
            setResults([]);
            setError(null);
            handleClearSelection();
            setIsLoupeActive(false);
            const previewUrl = URL.createObjectURL(file);
            setImagePreview(previewUrl);
        }
    };

    const handleAnalyze = useCallback(async () => {
        if (!imageFile) {
            setError(t('clutter.error.noImage'));
            return;
        }
        setIsLoading(true);
        setError(null);
        setResults([]);
        handleClearSelection();
        try {
            const { base64, mimeType } = await fileToBase64(imageFile);
            const analysisResults = await analyzeClutter(base64, mimeType, language);
            setResults(analysisResults);
        } catch (err) {
            console.error(err);
            setError(t('clutter.error.fail'));
        } finally {
            setIsLoading(false);
        }
    }, [imageFile, language, t]);

    const handleAnalyzeSelection = useCallback(async () => {
        if (!cropRegion || !imagePreview || !imageFile) {
            setError('Please select an area to analyze.');
            return;
        }

        setIsAnalyzingSelection(true);
        setError(null);

        const image = new Image();
        image.src = imagePreview;
        image.onload = async () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error("Could not get canvas context");
                
                const sx = cropRegion.x * image.naturalWidth;
                const sy = cropRegion.y * image.naturalHeight;
                const sWidth = cropRegion.width * image.naturalWidth;
                const sHeight = cropRegion.height * image.naturalHeight;

                canvas.width = sWidth;
                canvas.height = sHeight;

                ctx.drawImage(image, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);

                const croppedImageResult = canvas.toDataURL(imageFile.type || 'image/jpeg');
                const [, data] = croppedImageResult.split(',');
                const mimeType = croppedImageResult.match(/:(.*?);/)?.[1] || 'image/jpeg';

                const analysisResults = await analyzeClutter(data, mimeType, language, cropRegion);
                setResults(prev => [...prev, ...analysisResults]);

            } catch (err) {
                console.error(err);
                setError(t('clutter.error.fail'));
            } finally {
                setIsAnalyzingSelection(false);
                handleClearSelection();
            }
        };
        image.onerror = () => {
             setError('Could not load image for cropping.');
             setIsAnalyzingSelection(false);
        }
    }, [cropRegion, imagePreview, imageFile, language, t]);

    const handleClearSelection = () => {
        setIsSelecting(false);
        setSelectionRect(null);
        setCropRegion(null);
    }

    const getBoundingBoxStyle = (box: BoundingBox): React.CSSProperties => {
        if (!viewportRef.current) return {};
        const { clientWidth, clientHeight } = viewportRef.current;
        return {
            position: 'absolute',
            left: `${box.x1 * clientWidth}px`,
            top: `${box.y1 * clientHeight}px`,
            width: `${(box.x2 - box.x1) * clientWidth}px`,
            height: `${(box.y2 - box.y1) * clientHeight}px`,
        };
    };

    const getSelectionBoxStyle = (): React.CSSProperties => {
        if (!selectionRect) return { display: 'none' };
        const { startX, startY, endX, endY } = selectionRect;
        const x = Math.min(startX, endX);
        const y = Math.min(startY, endY);
        const width = Math.abs(startX - endX);
        const height = Math.abs(startY - endY);
        return {
            position: 'absolute',
            left: `${x}px`,
            top: `${y}px`,
            width: `${width}px`,
            height: `${height}px`,
            border: '2px dashed #facc15', // yellow-400
            backgroundColor: 'rgba(250, 204, 21, 0.2)',
            zIndex: 30,
        };
    };
    
    const getLoupeStyle = (): React.CSSProperties => {
        if (!viewportRef.current || !imagePreview) return {};
        const { clientWidth, clientHeight } = viewportRef.current;
        
        const top = loupePosition.y - loupeSize / 2;
        const left = loupePosition.x - loupeSize / 2;
        
        const bgX = -(loupePosition.x * loupeZoom - loupeSize / 2);
        const bgY = -(loupePosition.y * loupeZoom - loupeSize / 2);

        return {
            position: 'absolute',
            top: `${top}px`,
            left: `${left}px`,
            width: `${loupeSize}px`,
            height: `${loupeSize}px`,
            borderRadius: '50%',
            border: '3px solid #facc15', // yellow-400
            backgroundImage: `url(${imagePreview})`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: `${clientWidth * loupeZoom}px ${clientHeight * loupeZoom}px`,
            backgroundPosition: `${bgX}px ${bgY}px`,
            pointerEvents: 'none',
            zIndex: 40,
            boxShadow: '0 5px 15px rgba(0,0,0,0.5)',
            display: loupePosition.visible ? 'block' : 'none',
        };
    };

    const getCoords = (clientX: number, clientY: number) => {
        if (!viewportRef.current) return { x: 0, y: 0 };
        const rect = viewportRef.current.getBoundingClientRect();
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const startAction = (clientX: number, clientY: number) => {
        if (isSelecting) {
            const { x, y } = getCoords(clientX, clientY);
            selectionStartRef.current = { x, y };
            setSelectionRect({ startX: x, startY: y, endX: x, endY: y });
        }
    };

    const moveAction = (clientX: number, clientY: number, e: React.MouseEvent | React.TouchEvent) => {
         if (isSelecting && selectionRect) {
            const { x, y } = getCoords(clientX, clientY);
            setSelectionRect({ ...selectionRect, endX: x, endY: y });
        } else if (isLoupeActive) {
            const { x, y } = getCoords(clientX, clientY);
            setLoupePosition({ x, y, visible: true });
        }
    };

    const endAction = () => {
        if (isSelecting) {
            if (selectionRect && viewportRef.current) {
                const { clientWidth, clientHeight } = viewportRef.current;
                const { startX, startY, endX, endY } = selectionRect;

                const x1 = Math.min(startX, endX);
                const y1 = Math.min(startY, endY);
                const x2 = Math.max(startX, endX);
                const y2 = Math.max(startY, endY);

                if ((x2 - x1) > 10 && (y2 - y1) > 10) {
                    setCropRegion({
                        x: x1 / clientWidth,
                        y: y1 / clientHeight,
                        width: (x2 - x1) / clientWidth,
                        height: (y2 - y1) / clientHeight,
                    });
                } else {
                    setSelectionRect(null);
                    setCropRegion(null);
                }
            }
            setIsSelecting(false);
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => startAction(e.clientX, e.clientY);
    const handleMouseMove = (e: React.MouseEvent) => moveAction(e.clientX, e.clientY, e);
    const handleTouchStart = (e: React.TouchEvent) => e.touches.length === 1 && startAction(e.touches[0].clientX, e.touches[0].clientY);
    const handleTouchMove = (e: React.TouchEvent) => e.touches.length === 1 && moveAction(e.touches[0].clientX, e.touches[0].clientY, e);
    const handleMouseLeave = () => setLoupePosition(prev => ({ ...prev, visible: false }));

    return (
        <div className="max-w-7xl mx-auto">
            <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
                <div className="grid md:grid-cols-2 gap-6 items-center">
                    <div>
                        <h2 className="text-2xl font-bold mb-2 text-indigo-400">{t('clutter.title')}</h2>
                        <p className="text-gray-400 mb-4">{t('clutter.description')}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                        <label htmlFor="file-upload" className="relative cursor-pointer bg-gray-700 hover:bg-gray-600 text-gray-300 font-bold py-3 px-4 rounded-lg inline-flex items-center justify-center w-full sm:w-auto transition-colors duration-200">
                           <IconUpload className="w-6 h-6 mr-2" />
                            <span>{imageFile ? t('clutter.upload.change') : t('clutter.upload.new')}</span>
                        </label>
                        <input id="file-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                        
                        <button
                            onClick={handleAnalyze}
                            disabled={!imageFile || isLoading || isAnalyzingSelection}
                            className="w-full sm:w-auto flex-grow bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-colors duration-200"
                        >
                            {isLoading ? (
                                <>
                                    <Spinner />
                                    <span>{t('clutter.button.analyzing')}</span>
                                </>
                            ) : (
                                <>
                                    <IconScan className="w-6 h-6 mr-2" />
                                    <span>{t('clutter.button.analyze')}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
                 {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
            </div>

            {imagePreview && (
                <div className="mt-8 flex flex-col gap-8">
                    <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 shadow-lg sticky top-20 z-5">
                         <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4 items-center">
                             {/* Selection Controls */}
                            <div className="flex flex-wrap gap-2 items-center">
                                <button onClick={() => setIsSelecting(true)} disabled={isLoading || isAnalyzingSelection || isLoupeActive} className={`flex items-center text-sm px-3 py-2 rounded-md transition-colors ${isSelecting ? 'bg-yellow-500 text-black' : 'bg-gray-700 hover:bg-gray-600 text-white'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                                    <IconCrop className="w-5 h-5 mr-2" /> {t('clutter.button.selectArea')}
                                </button>
                                 <button onClick={handleAnalyzeSelection} disabled={!cropRegion || isLoading || isAnalyzingSelection} className="flex items-center text-sm px-3 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-500 disabled:cursor-not-allowed">
                                    {isAnalyzingSelection ? <Spinner size="sm"/> : <IconScan className="w-5 h-5 mr-2" />}
                                    {t('clutter.button.analyzeSelection')}
                                </button>
                                <button onClick={handleClearSelection} disabled={!selectionRect && !cropRegion} className="flex items-center text-sm px-3 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-500 disabled:cursor-not-allowed">
                                    <IconX className="w-5 h-5 mr-2" /> {t('clutter.button.clearSelection')}
                                </button>
                            </div>
                            <div className="h-6 w-px bg-gray-600 hidden md:block"></div>
                             {/* Loupe Controls */}
                            <div className="flex flex-wrap gap-2 items-center">
                                <button onClick={() => setIsLoupeActive(p => !p)} disabled={isSelecting} className={`flex items-center text-sm px-3 py-2 rounded-md transition-colors ${isLoupeActive ? 'bg-yellow-500 text-black' : 'bg-gray-700 hover:bg-gray-600 text-white'} disabled:opacity-50`}>
                                    <IconSearch className="w-5 h-5 mr-2" /> Loupe
                                </button>
                                {isLoupeActive && (
                                    <div className="flex items-center gap-4 text-xs text-gray-300">
                                        <div className="flex items-center gap-2">
                                            <label htmlFor="loupe-size">Size:</label>
                                            <input id="loupe-size" type="range" min="50" max="300" value={loupeSize} onChange={(e) => setLoupeSize(Number(e.target.value))} className="w-24" />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <label htmlFor="loupe-zoom">Zoom:</label>
                                            <input id="loupe-zoom" type="range" min="1.5" max="8" step="0.1" value={loupeZoom} onChange={(e) => setLoupeZoom(Number(e.target.value))} className="w-24" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                         <div 
                            ref={viewportRef} 
                            className={`relative w-full max-w-4xl mx-auto rounded-md overflow-hidden touch-none ${isSelecting ? 'cursor-crosshair' : ''}`}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={endAction}
                            onMouseLeave={handleMouseLeave}
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={endAction}
                         >
                            <img src={imagePreview} alt="Analyzed clutter" className="w-full h-auto rounded-md object-contain select-none pointer-events-none" />
                            {isLoading && <ScanningOverlay />}
                            <div style={getSelectionBoxStyle()} />
                            {cropRegion && !isAnalyzingSelection && (
                                 <div style={getBoundingBoxStyle(cropRegion)} className="border-2 border-green-500 bg-green-500/20" />
                            )}
                            {!isLoading && results.map((item, index) => (
                                <div
                                    key={`box-${index}`}
                                    style={getBoundingBoxStyle(item.boundingBox)}
                                    className={`transition-all duration-200 border-2 cursor-pointer ${hoveredIndex === index ? 'border-yellow-400 bg-yellow-400/30' : 'border-indigo-500/50 bg-transparent hover:bg-indigo-500/20'}`}
                                    onMouseEnter={() => setHoveredIndex(index)}
                                    onMouseLeave={() => setHoveredIndex(null)}
                                />
                            ))}
                             <div style={getLoupeStyle()} />
                        </div>
                    </div>

                    {results.length > 0 && (
                        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
                             <h3 className="text-xl font-bold mb-4 flex items-center text-indigo-400"><IconValue className="w-6 h-6 mr-2" /> {t('clutter.results.title')}</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {results.map((item, index) => {
                                    const isSourcesVisible = !!sourcesVisible[index];
                                    return (
                                        <div 
                                            key={index}
                                            title={item.summary}
                                            className={`rounded-lg p-4 shadow-md transition-all duration-200 flex flex-col ${item.isHighValue ? 'border-l-4 border-yellow-400' : 'border-l-4 border-gray-600'} ${hoveredIndex === index ? 'bg-gray-700 scale-105 shadow-xl' : 'bg-gray-700/50 hover:bg-gray-700'}`}
                                            onMouseEnter={() => setHoveredIndex(index)}
                                            onMouseLeave={() => setHoveredIndex(null)}
                                        >
                                            <div className="flex-grow">
                                                {item.isHighValue && <div className="text-xs font-bold text-yellow-300 mb-1">{t('clutter.results.highValue')}</div>}
                                                <h4 className="font-bold text-lg text-white">{item.item}</h4>
                                                <p className="text-gray-400 text-sm mt-2 mb-1 font-semibold">{t('clutter.results.description')}:</p>
                                                <p className="text-gray-300 text-sm mb-3">{item.description}</p>
                                                
                                                <div className="grid grid-cols-2 gap-x-4 text-sm border-t border-gray-600 pt-3">
                                                    <div>
                                                        <p className="text-gray-400 font-medium mb-1">{t('clutter.results.marketValue')}</p>
                                                        <p className="font-semibold text-green-400 text-base">{item.marketValue}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-400 font-medium mb-1">{t('clutter.results.quickSale')}</p>
                                                        <p className="font-semibold text-green-300 text-base">{item.quickSalePrice}</p>
                                                    </div>
                                                </div>
                                                
                                                <div className="mt-4 border-t border-gray-600 pt-3">
                                                    <h5 className="text-sm font-bold text-indigo-400 mb-3">{t('clutter.results.analytics')}</h5>
                                                    <div className="space-y-3 text-sm">
                                                        <div className="flex items-start">
                                                            <div className="w-5 h-5 mr-2 text-gray-400 flex-shrink-0 mt-0.5">
                                                                {(item.saleSpeed && (item.saleSpeed.toLowerCase().includes('высокий') || item.saleSpeed.toLowerCase().includes('high'))) ? <IconFire className="text-green-400" /> :
                                                                 (item.saleSpeed && (item.saleSpeed.toLowerCase().includes('средний') || item.saleSpeed.toLowerCase().includes('medium'))) ? <IconTrendingUp className="text-yellow-400" /> :
                                                                 <IconClock className="text-gray-500" />}
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{t('clutter.results.saleSpeed')}</p>
                                                                <p className={`font-semibold ${
                                                                    (item.saleSpeed && (item.saleSpeed.toLowerCase().includes('высокий') || item.saleSpeed.toLowerCase().includes('high'))) ? 'text-green-400' :
                                                                    (item.saleSpeed && (item.saleSpeed.toLowerCase().includes('средний') || item.saleSpeed.toLowerCase().includes('medium'))) ? 'text-yellow-400' :
                                                                    'text-gray-400'
                                                                }`}>
                                                                    {item.saleSpeed || 'N/A'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-start">
                                                            <IconLightbulb className="w-5 h-5 mr-2 text-gray-400 flex-shrink-0 mt-0.5" />
                                                            <div>
                                                                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{t('clutter.results.buyRecommendation')}</p>
                                                                <p className="text-gray-300">{item.buyRecommendation || 'N/A'}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {item.sources && item.sources.length > 0 && (
                                                <div className="mt-4 border-t border-gray-600 pt-3">
                                                    <button onClick={() => toggleSourceVisibility(index)} className="w-full flex justify-between items-center text-left text-gray-400 text-sm font-semibold mb-2 hover:text-white transition-colors">
                                                        <span>{t('clutter.results.sources')}:</span>
                                                        {isSourcesVisible ? <IconChevronUp className="w-5 h-5"/> : <IconChevronDown className="w-5 h-5"/>}
                                                    </button>
                                                    <div className={`overflow-hidden transition-all duration-300 ${isSourcesVisible ? 'max-h-96' : 'max-h-0'}`}>
                                                        <ul className="space-y-1 pt-1">
                                                            {item.sources.map((source, idx) => (
                                                                <li key={idx}>
                                                                    <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center group">
                                                                        <IconLink className="w-4 h-4 mr-2 flex-shrink-0" />
                                                                        <span className="truncate group-hover:underline">{source.title || source.uri}</span>
                                                                    </a>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ClutterIdentifier;