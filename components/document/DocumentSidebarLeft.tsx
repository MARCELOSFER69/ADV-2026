import React from 'react';
import { UploadCloud, Code, FileText, Trash2 } from 'lucide-react';

interface DocumentSidebarLeftProps {
    handleReset: () => void;
    handlePdfUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleHtmlUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    fileInputRef: React.RefObject<HTMLInputElement>;
    htmlInputRef: React.RefObject<HTMLInputElement>;
    savedTemplates: any[];
    handleSelectTemplate: (template: any) => void;
    templateId: string | null;
    handleDeleteTemplate: (id: string, e: React.MouseEvent) => void;
}

const DocumentSidebarLeft: React.FC<DocumentSidebarLeftProps> = ({
    handleReset,
    handlePdfUpload,
    handleHtmlUpload,
    fileInputRef,
    htmlInputRef,
    savedTemplates,
    handleSelectTemplate,
    templateId,
    handleDeleteTemplate
}) => {
    return (
        <div className="w-64 bg-[#0f1014] border border-zinc-800 rounded-xl p-4 flex flex-col shadow-xl">
            <button onClick={handleReset} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg mb-2 text-xs font-bold">Novo / Limpar</button>

            <div className="grid grid-cols-2 gap-2 mb-4">
                <label className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 py-3 rounded-lg cursor-pointer flex flex-col items-center justify-center gap-1 transition-colors text-center">
                    <UploadCloud size={20} className="text-gold-500" />
                    <span className="text-[10px] font-bold">Importar PDF</span>
                    <input type="file" accept="application/pdf" className="hidden" onChange={handlePdfUpload} ref={fileInputRef} />
                </label>
                <label className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 py-3 rounded-lg cursor-pointer flex flex-col items-center justify-center gap-1 transition-colors text-center">
                    <Code size={20} className="text-blue-500" />
                    <span className="text-[10px] font-bold">Importar HTML</span>
                    <input type="file" accept=".html,.htm" className="hidden" onChange={handleHtmlUpload} ref={htmlInputRef} />
                </label>
            </div>

            <h4 className="text-xs font-bold text-zinc-500 uppercase mb-2">Modelos Salvos</h4>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                {savedTemplates.map(t => (
                    <div key={t.id} onClick={() => handleSelectTemplate(t)} className={`p-3 rounded-lg cursor-pointer border flex justify-between items-center group ${templateId === t.id ? 'bg-zinc-800 border-gold-500 text-white' : 'bg-zinc-900 border-transparent text-zinc-400 hover:bg-zinc-800'}`}>
                        <div className="flex items-center gap-2 overflow-hidden">
                            {t.base_type === 'html' ? <Code size={12} className="text-blue-500 shrink-0" /> : <FileText size={12} className="text-red-500 shrink-0" />}
                            <span className="text-sm truncate font-medium">{t.titulo}</span>
                        </div>
                        <button onClick={(e) => handleDeleteTemplate(t.id, e)} className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-500 p-1 transition-opacity"><Trash2 size={14} /></button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DocumentSidebarLeft;
