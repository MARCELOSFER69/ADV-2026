import React from 'react';
import { motion } from 'framer-motion';
import { FileText, FileCode, User, Eye, EyeOff, Save, Layout, Loader2 } from 'lucide-react';
import { Client } from '../../types';

interface DocumentHeaderProps {
    baseType: 'pdf' | 'html';
    isPreviewMode: boolean;
    previewClientId: string;
    setPreviewClientId: (id: string) => void;
    clients: Client[];
    pdfDoc: any;
    htmlContent: string;
    isCodeMode: boolean;
    setIsCodeMode: (mode: boolean) => void;
    setIsPreviewMode: (mode: boolean) => void;
    handleSave: () => void;
    isSaving: boolean;
}

const DocumentHeader: React.FC<DocumentHeaderProps> = ({
    baseType,
    isPreviewMode,
    previewClientId,
    setPreviewClientId,
    clients,
    pdfDoc,
    htmlContent,
    isCodeMode,
    setIsCodeMode,
    setIsPreviewMode,
    handleSave,
    isSaving
}) => {
    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-4">
            <div className="flex items-center gap-4">
                <div className="p-2.5 bg-gold-500/10 rounded-2xl text-gold-500 border border-gold-500/20 shadow-lg shadow-gold-500/5 transition-transform hover:scale-105">
                    {baseType === 'pdf' ? <FileText size={24} /> : <FileCode size={24} />}
                </div>
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white font-serif tracking-tight">
                        Criador de Modelos
                    </h1>
                    <p className="text-slate-400 text-[11px] md:text-xs font-medium mt-0.5 opacity-80 uppercase tracking-widest">
                        Crie e edite modelos inteligentes {baseType === 'html' ? 'em HTML' : 'baseados em PDF'}.
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {isPreviewMode && (
                    <div className="flex items-center gap-2 bg-[#131418] border border-white/10 px-3 py-2 rounded-xl">
                        <User size={16} className="text-gold-500" />
                        <select
                            className="bg-transparent text-xs text-white outline-none w-40 font-medium"
                            value={previewClientId}
                            onChange={(e) => setPreviewClientId(e.target.value)}
                        >
                            <option value="">Exemplo Genérico</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.nome_completo}</option>)}
                        </select>
                    </div>
                )}

                {(pdfDoc || htmlContent) && (
                    <>
                        {baseType === 'html' && !isPreviewMode && (
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setIsCodeMode(!isCodeMode)}
                                className={`h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all shadow-lg ${isCodeMode ? 'bg-[#131418] border-purple-500 text-purple-400' : 'bg-[#131418] border-white/10 text-slate-400 hover:text-white'}`}
                            >
                                <Layout size={16} /> {isCodeMode ? 'Visual' : 'Código'}
                            </motion.button>
                        )}
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setIsPreviewMode(!isPreviewMode)}
                            className={`h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all shadow-lg ${isPreviewMode ? 'bg-blue-600/20 border-blue-500/50 text-blue-400' : 'bg-[#131418] border-white/10 text-slate-400 hover:text-white'}`}
                        >
                            {isPreviewMode ? <EyeOff size={16} /> : <Eye size={16} />} <span>Preview</span>
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleSave}
                            disabled={isSaving}
                            className="h-10 px-6 bg-gold-600 hover:bg-gold-700 text-black rounded-xl font-bold text-xs transition-all shadow-lg shadow-gold-600/20 flex items-center gap-2 disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                            <span>Salvar Modelo</span>
                        </motion.button>
                    </>
                )}
            </div>
        </div>
    );
};

export default DocumentHeader;
