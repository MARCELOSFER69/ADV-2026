import React from 'react';
import { Plus, Image as ImageIcon } from 'lucide-react';

interface DocumentToolbarProps {
    pdfDoc: any;
    htmlContent: string;
    isPreviewMode: boolean;
    isCodeMode: boolean;
    nextFieldTemplate: string;
    setNextFieldTemplate: (template: string) => void;
    handleAddFieldButton: () => void;
    handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    imageInputRef: React.RefObject<HTMLInputElement>;
    VARIABLES: { label: string; key: string }[];
}

const DocumentToolbar: React.FC<DocumentToolbarProps> = ({
    pdfDoc,
    htmlContent,
    isPreviewMode,
    isCodeMode,
    nextFieldTemplate,
    setNextFieldTemplate,
    handleAddFieldButton,
    handleImageUpload,
    imageInputRef,
    VARIABLES
}) => {
    if (!((pdfDoc || htmlContent) && !isPreviewMode && !isCodeMode)) return null;

    return (
        <div className="bg-zinc-900 border border-zinc-800 p-2 rounded-xl flex items-center gap-4 shadow-lg">
            <div className="flex items-center gap-2 flex-1">
                <span className="text-xs font-bold text-gold-500 uppercase ml-2">Texto:</span>
                <select
                    className="bg-black border border-zinc-700 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-gold-500 flex-1"
                    value={nextFieldTemplate}
                    onChange={(e) => setNextFieldTemplate(e.target.value)}
                >
                    {VARIABLES.map(v => <option key={v.key} value={v.key}>{v.label}</option>)}
                </select>
                <button onClick={handleAddFieldButton} className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg border border-zinc-600 flex items-center gap-2 text-sm"><Plus size={16} /> Add Texto</button>
            </div>
            <div className="w-px h-6 bg-zinc-700 mx-1"></div>
            <label className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg border border-zinc-600 cursor-pointer flex items-center gap-2 text-sm">
                <ImageIcon size={16} className="text-emerald-500" /> Add Imagem
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} ref={imageInputRef} />
            </label>
        </div>
    );
};

export default DocumentToolbar;
