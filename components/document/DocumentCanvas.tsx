import React, { useRef, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, FileText, X } from 'lucide-react';
import { FieldMark, Client } from '../../types';
import { replaceVariables, applyDateFormat } from '../../utils/documentUtils';

interface DocumentCanvasProps {
    pdfDoc: any;
    htmlContent: string;
    isCodeMode: boolean;
    baseType: 'pdf' | 'html';
    currentPage: number;
    setCurrentPage: (page: (prev: number) => number) => void;
    numPages: number;
    containerRef: React.RefObject<HTMLDivElement>;
    canvasRef: React.RefObject<HTMLCanvasElement>;
    handleMouseMove: (e: React.MouseEvent) => void;
    handleMouseUp: () => void;
    isPreviewMode: boolean;
    previewClient?: Client;
    fields: FieldMark[];
    selectedFieldId: string | null;
    handleMouseDown: (e: React.MouseEvent, fieldId: string) => void;
    removeField: (id: string) => void;
    setSelectedFieldId: (id: string | null) => void;
    setHtmlContent: (content: string) => void;
}

const AutoFitText = ({ text, width, style, autoFit, containerRef }: { text: string, width: number, style: any, autoFit?: boolean, containerRef: React.RefObject<HTMLDivElement> }) => {
    const textRef = useRef<HTMLSpanElement>(null);
    const [scale, setScale] = useState(1);

    useEffect(() => {
        if (!autoFit || !width || !textRef.current || !containerRef.current) {
            setScale(1);
            return;
        }
        const containerWidth = containerRef.current.offsetWidth;
        const availablePx = (width / 100) * containerWidth;
        const contentPx = textRef.current.scrollWidth;
        if (contentPx > availablePx && availablePx > 0) {
            setScale(availablePx / contentPx);
        } else {
            setScale(1);
        }
    }, [text, width, autoFit, style.fontSize, style.fontWeight]);

    return (
        <span
            ref={textRef}
            style={{
                ...style,
                display: 'inline-block',
                whiteSpace: 'nowrap',
                transform: `scale(${scale})`,
                transformOrigin: style.textAlign === 'right' ? 'right center' : style.textAlign === 'center' ? 'center center' : 'left center',
                width: autoFit ? '100%' : 'auto'
            }}
        >
            {text}
        </span>
    );
};

const DocumentCanvas: React.FC<DocumentCanvasProps> = ({
    pdfDoc,
    htmlContent,
    isCodeMode,
    baseType,
    currentPage,
    setCurrentPage,
    numPages,
    containerRef,
    canvasRef,
    handleMouseMove,
    handleMouseUp,
    isPreviewMode,
    previewClient,
    fields,
    selectedFieldId,
    handleMouseDown,
    removeField,
    setSelectedFieldId,
    setHtmlContent
}) => {
    const renderField = (field: FieldMark) => {
        if (field.page !== currentPage && baseType === 'pdf') return null;

        const isSelected = selectedFieldId === field.id;
        let displayText = field.template;

        if (isPreviewMode && field.type === 'text') {
            displayText = replaceVariables(field.template, previewClient);
            displayText = applyDateFormat(displayText, field.dateFormat);
        }

        let transform = 'translate(0, -50%)';
        if (field.textAlign === 'center') transform = 'translate(-50%, -50%)';
        if (field.textAlign === 'right') transform = 'translate(-100%, -50%)';

        const commonStyle: React.CSSProperties = {
            left: `${field.x}%`,
            top: `${field.y}%`,
            transform: transform,
            position: 'absolute',
            zIndex: isSelected ? 20 : 10,
            cursor: isPreviewMode ? 'default' : (isSelected ? 'move' : 'pointer'),
        };

        if (field.type === 'image') {
            return (
                <div
                    key={field.id}
                    onMouseDown={(e) => handleMouseDown(e, field.id)}
                    style={{
                        ...commonStyle,
                        width: `${field.width}%`,
                        height: `${field.height}%`,
                    }}
                    className={`field-mark group ${isSelected && !isPreviewMode ? 'ring-2 ring-blue-500' : ''}`}
                >
                    <img src={field.src} alt="Field" className="w-full h-full object-contain pointer-events-none" />
                    {isSelected && !isPreviewMode && (
                        <button onMouseDown={(e) => { e.stopPropagation(); removeField(field.id); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center z-50"><X size={10} /></button>
                    )}
                </div>
            );
        }

        return (
            <div
                key={field.id}
                onMouseDown={(e) => handleMouseDown(e, field.id)}
                className={`field-mark absolute select-none ${isPreviewMode ? '' : (isSelected ? 'border border-blue-500 bg-blue-500/10' : 'border border-dashed border-transparent hover:border-zinc-400 bg-yellow-500/20')
                    }`}
                style={{
                    ...commonStyle,
                    width: field.autoFit && field.width ? `${field.width}%` : 'auto',
                    fontSize: `${field.fontSize}px`,
                    fontFamily: 'Arial, sans-serif',
                    fontWeight: field.isBold ? 'bold' : 'normal',
                    textAlign: field.textAlign,
                    color: 'black',
                    whiteSpace: 'nowrap',
                }}
            >
                <AutoFitText text={displayText} width={field.width || 0} autoFit={field.autoFit} style={{ color: 'inherit' }} containerRef={containerRef} />
                {isSelected && !isPreviewMode && field.autoFit && (
                    <div className="absolute inset-0 border border-dotted border-red-400 pointer-events-none opacity-50" title="Área Limite" />
                )}
            </div>
        );
    };

    return (
        <div
            className={`flex-1 bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-auto relative flex flex-col items-center ${isCodeMode ? 'p-0' : 'p-8'} custom-scrollbar select-none`}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {(pdfDoc || htmlContent) ? (
                <>
                    {isCodeMode ? (
                        <div className="w-full h-full min-h-[600px] flex flex-col">
                            <textarea
                                className="w-full h-full bg-[#1e1e1e] text-zinc-300 font-mono text-sm p-6 outline-none resize-none focus:border-blue-500 shadow-inner leading-relaxed"
                                value={htmlContent}
                                onChange={(e) => setHtmlContent(e.target.value)}
                                spellCheck={false}
                            />
                        </div>
                    ) : (
                        <>
                            {baseType === 'pdf' && (
                                <div className="sticky top-0 z-50 bg-zinc-800/90 backdrop-blur px-4 py-2 rounded-full shadow-lg flex gap-4 items-center mb-4 border border-zinc-700">
                                    <button disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)} className="text-white disabled:opacity-30"><ArrowLeft size={18} /></button>
                                    <span className="text-sm font-mono text-white">Página {currentPage} de {numPages}</span>
                                    <button disabled={currentPage >= numPages} onClick={() => setCurrentPage(p => p + 1)} className="text-white disabled:opacity-30"><ArrowRight size={18} /></button>
                                </div>
                            )}

                            <div ref={containerRef} className="relative shadow-2xl border border-white/10 bg-white mx-auto" style={{ lineHeight: 0, width: baseType === 'html' ? '210mm' : 'auto', minHeight: baseType === 'html' ? '297mm' : 'auto', overflow: 'hidden' }} onClick={() => setSelectedFieldId(null)}>
                                {baseType === 'pdf' ? (
                                    <canvas ref={canvasRef} className="block max-w-full h-auto" />
                                ) : (
                                    <div
                                        className="w-full h-full text-black font-serif leading-relaxed text-justify bg-white"
                                        dangerouslySetInnerHTML={{
                                            __html: isPreviewMode ? replaceVariables(htmlContent, previewClient) : htmlContent
                                        }}
                                        style={{ pointerEvents: 'none' }}
                                    />
                                )}
                                {fields.map(renderField)}
                            </div>
                        </>
                    )}
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-600">
                    <FileText size={64} className="opacity-20 mb-4" />
                    <p className="mb-4">Selecione um modelo à esquerda ou importe um arquivo.</p>
                </div>
            )}
        </div>
    );
};

export default DocumentCanvas;
