import React from 'react';
import { Archive, Trash2, X } from 'lucide-react';
import { Client } from '../../types';

interface ClientActionModalsProps {
    clientToArchive: Client | null;
    archiveReason: string;
    setArchiveReason: (reason: string) => void;
    onCloseArchive: () => void;
    onConfirmArchive: () => Promise<void>;
    clientToDelete: Client | null;
    deleteReason: string;
    setDeleteReason: (reason: string) => void;
    onCloseDelete: () => void;
    onConfirmDelete: () => Promise<void>;
}

const ClientActionModals: React.FC<ClientActionModalsProps> = ({
    clientToArchive,
    archiveReason,
    setArchiveReason,
    onCloseArchive,
    onConfirmArchive,
    clientToDelete,
    deleteReason,
    setDeleteReason,
    onCloseDelete,
    onConfirmDelete
}) => {
    return (
        <>
            {clientToArchive && (
                <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#0f1014] border border-zinc-800 p-6 rounded-xl max-w-sm w-full shadow-2xl animate-in zoom-in duration-200">
                        <div className="flex flex-col items-center mb-4">
                            <div className="p-3 bg-zinc-800 rounded-full mb-3 text-zinc-400">
                                <Archive size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-white text-center">Arquivar Cliente</h3>
                            <p className="text-xs text-zinc-500 text-center mt-1">
                                {clientToArchive.nome_completo}
                            </p>
                        </div>

                        <div className="mb-4">
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Motivo do Arquivamento</label>
                            <textarea
                                className="w-full bg-[#09090b] border border-zinc-800 rounded-lg p-3 text-sm text-white outline-none focus:border-gold-500 resize-none h-24"
                                placeholder="Ex: Falecimento, Troca de Advogado, Desistência..."
                                value={archiveReason}
                                onChange={(e) => setArchiveReason(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={onCloseArchive}
                                className="flex-1 px-4 py-2 text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors text-sm font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={onConfirmArchive}
                                className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors text-sm font-medium"
                            >
                                Arquivar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {clientToDelete && (
                <div className="fixed inset-0 bg-black/80 z-[80] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#0f1014] border border-red-900/50 p-6 rounded-xl max-w-sm w-full shadow-2xl shadow-red-900/20 animate-in zoom-in duration-200">
                        <div className="flex flex-col items-center mb-4">
                            <div className="p-3 bg-red-900/20 rounded-full mb-3 text-red-500 border border-red-900/50">
                                <Trash2 size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-white text-center">Excluir Definitivamente</h3>
                            <p className="text-xs text-zinc-500 text-center mt-1">
                                {clientToDelete.nome_completo}
                            </p>
                        </div>

                        <div className="mb-4">
                            <div className="bg-red-900/10 border border-red-900/30 p-3 rounded-lg mb-3">
                                <p className="text-xs text-red-300 text-center font-medium">Atenção: Esta ação não pode ser desfeita. Todos os dados serão perdidos.</p>
                            </div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Motivo da Exclusão <span className="text-red-500">*</span></label>
                            <textarea
                                className="w-full bg-[#09090b] border border-zinc-800 rounded-lg p-3 text-sm text-white outline-none focus:border-red-500 resize-none h-24"
                                placeholder="Informe o motivo da exclusão..."
                                value={deleteReason}
                                onChange={(e) => setDeleteReason(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={onCloseDelete}
                                className="flex-1 px-4 py-2 text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors text-sm font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={onConfirmDelete}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium shadow-lg shadow-red-900/30"
                            >
                                Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ClientActionModals;
