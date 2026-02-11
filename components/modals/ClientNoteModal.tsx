import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, FileText, User, Clock, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClientNote } from '../../types';
import { formatDateDisplay } from '../../utils/dateUtils';
import { useApp } from '../../context/AppContext';

interface ClientNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    note: ClientNote | null;
    onSave: (noteId: string, content: string) => Promise<void>;
    onDelete?: (noteId: string) => Promise<void>;
}

export const ClientNoteModal: React.FC<ClientNoteModalProps> = ({
    isOpen, onClose, note, onSave, onDelete
}) => {
    const [content, setContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const { showToast } = useApp();

    useEffect(() => {
        if (note) {
            setContent(note.conteudo);
        } else {
            setContent('');
        }
    }, [note]);

    if (!isOpen || !note) return null;

    const handleSave = async () => {
        if (!content.trim()) return;

        setIsSaving(true);
        try {
            await onSave(note.id, content);
            onClose();
        } catch (error) {
            console.error(error);
            showToast('error', 'Erro ao salvar anotação');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!onDelete) return;
        if (confirm('Tem certeza que deseja excluir esta anotação?')) {
            await onDelete(note.id);
            onClose();
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#18181b] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gold-500/10 rounded-lg">
                            <FileText size={20} className="text-gold-500" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">Visualizar/Editar Anotação</h3>
                            <div className="flex items-center gap-3 mt-1 text-[10px] text-zinc-400">
                                <span className="flex items-center gap-1">
                                    <User size={10} />
                                    {note.user_name}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Clock size={10} />
                                    {formatDateDisplay(note.created_at)}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 flex-1 overflow-y-auto">
                    <textarea
                        className="w-full h-[300px] bg-[#0f1014] border border-white/10 rounded-xl p-4 text-sm text-zinc-200 resize-none outline-none focus:border-gold-500/50 transition-colors custom-scrollbar leading-relaxed"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Escreva sua anotação aqui..."
                    />
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 bg-white/5 flex items-center justify-between">
                    <div>
                        {onDelete && (
                            <button
                                onClick={handleDelete}
                                className="px-4 py-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-xs font-bold flex items-center gap-2"
                            >
                                <Trash2 size={16} />
                                Excluir
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors text-xs font-bold"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || !content.trim() || content === note.conteudo}
                            className="px-6 py-2 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 disabled:cursor-not-allowed text-black rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-gold-500/20 text-xs"
                        >
                            {isSaving ? (
                                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                            ) : (
                                <Save size={16} />
                            )}
                            Salvar Alterações
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>,
        document.body
    );
};
