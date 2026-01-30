import React, { memo, useState } from 'react';
import { Client, ClientDocument } from '../../types';
import { useApp } from '../../context/AppContext';
import { Loader2, UploadCloud, FileText, Eye, Download, Trash2, RefreshCw } from 'lucide-react';

interface ClientDocsTabProps {
    client: Client;
    activeTab: 'info' | 'docs' | 'credentials';
    isUploading: boolean;
    handleDocumentUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleDeleteDocument: (doc: ClientDocument) => void;
}

const ClientDocsTab: React.FC<ClientDocsTabProps> = ({
    client, activeTab, isUploading, handleDocumentUpload, handleDeleteDocument
}) => {
    const { syncClientDocuments } = useApp();
    const [isSyncing, setIsSyncing] = useState(false);

    if (activeTab !== 'docs') return null;

    const handleSync = async () => {
        setIsSyncing(true);
        await syncClientDocuments(client.id);
        setIsSyncing(false);
    };

    return (
        <div className="space-y-6 min-h-[300px]">
            <div className="bg-[#18181b] border-2 border-dashed border-white/5 rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors hover:border-gold-500/50 hover:bg-[#18181b]/80 group">
                {isUploading ? (
                    <div className="flex flex-col items-center animate-pulse">
                        <Loader2 className="animate-spin text-gold-500 mb-2" size={32} />
                        <p className="text-sm text-zinc-300 font-medium">Enviando para a nuvem...</p>
                    </div>
                ) : (
                    <label className="cursor-pointer w-full flex flex-col items-center">
                        <div className="w-14 h-14 bg-[#131418] rounded-full flex items-center justify-center mb-3 shadow-lg border border-white/5 group-hover:border-gold-500/30 transition-all">
                            <UploadCloud size={24} className="text-zinc-500 group-hover:text-gold-500" />
                        </div>
                        <h3 className="text-sm font-bold text-white mb-1">Clique para anexar</h3>
                        <p className="text-xs text-zinc-500">PDF ou Imagens (JPG, PNG)</p>
                        <input type="file" className="hidden" onChange={handleDocumentUpload} accept="application/pdf,image/*" />
                    </label>
                )}
            </div>

            <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2"><FileText size={14} className="text-gold-500" /> Arquivos Salvos</span>
                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="flex items-center gap-1.5 px-2 py-1 rounded bg-gold-600/10 hover:bg-gold-600/20 text-gold-500 transition-colors disabled:opacity-50"
                        title="Procurar arquivos antigos no armazenamento"
                    >
                        <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
                        <span className="text-[10px] uppercase font-bold">{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
                    </button>
                </h4>

                {client.documentos && client.documentos.length > 0 ? (
                    client.documentos.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-[#18181b] border border-white/5 rounded-lg hover:border-gold-500/20 transition-all group">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${doc.tipo === 'PDF' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-200 hover:text-gold-500 transition-colors cursor-pointer" onClick={() => window.open(doc.url, '_blank')}>
                                        {doc.nome}
                                    </p>
                                    <p className="text-[10px] text-slate-500">
                                        Enviado em {new Date(doc.data_upload).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <a
                                    href={doc.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                    title="Visualizar/Baixar"
                                >
                                    {doc.tipo === 'PDF' ? <Eye size={16} /> : <Download size={16} />}
                                </a>
                                <button
                                    onClick={() => handleDeleteDocument(doc)}
                                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                    title="Excluir"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-8 bg-navy-900/30 rounded-xl border border-dashed border-zinc-800">
                        <p className="text-xs text-zinc-500 italic">Nenhum documento anexado a este cliente.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default memo(ClientDocsTab);
