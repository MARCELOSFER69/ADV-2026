import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, CheckCircle2, Info } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info' | 'success';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    variant = 'danger'
}) => {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (variant) {
            case 'danger': return <AlertTriangle className="text-red-500" size={24} />;
            case 'warning': return <AlertTriangle className="text-amber-500" size={24} />;
            case 'success': return <CheckCircle2 className="text-emerald-500" size={24} />;
            default: return <Info className="text-blue-500" size={24} />;
        }
    };

    const getButtonClass = () => {
        switch (variant) {
            case 'danger': return 'bg-red-600 hover:bg-red-500 shadow-red-600/20';
            case 'warning': return 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20';
            case 'success': return 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20';
            default: return 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20';
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="bg-[#0f1014] w-full max-w-md rounded-2xl border border-white/10 shadow-2xl relative z-10 overflow-hidden"
                >
                    <div className="p-6">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-white/5 rounded-xl shrink-0">
                                {getIcon()}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-white mb-2 font-serif">{title}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    {message}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 mt-8">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition-all text-sm border border-white/5"
                            >
                                {cancelLabel}
                            </button>
                            <button
                                onClick={() => {
                                    onConfirm();
                                    onClose();
                                }}
                                className={`flex-1 px-4 py-2.5 rounded-xl text-white font-bold transition-all text-sm shadow-lg ${getButtonClass()}`}
                            >
                                {confirmLabel}
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-zinc-500 hover:text-white p-1"
                    >
                        <X size={18} />
                    </button>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ConfirmModal;
