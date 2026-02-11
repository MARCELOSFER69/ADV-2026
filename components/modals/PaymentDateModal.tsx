import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, X, Check, Clock } from 'lucide-react';
import { getTodayBrasilia } from '../../utils/dateUtils';

interface PaymentDateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (date: string) => void;
    title: string;
    message: string;
}

const PaymentDateModal: React.FC<PaymentDateModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message
}) => {
    const [selectedOption, setSelectedOption] = useState<'today' | 'custom'>('today');
    const [customDate, setCustomDate] = useState(getTodayBrasilia());

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4 pointer-events-auto">
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
                        <div className="flex items-start gap-4 mb-6">
                            <div className="p-3 bg-white/5 rounded-xl shrink-0 text-gold-500">
                                <Calendar size={24} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-white mb-1 font-serif">{title}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    {message}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => setSelectedOption('today')}
                                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${selectedOption === 'today'
                                    ? 'bg-gold-500/10 border-gold-500 text-gold-500'
                                    : 'bg-white/5 border-white/5 text-zinc-400 hover:border-white/10'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <Clock size={18} />
                                    <div className="text-left">
                                        <div className="font-bold text-sm">Pagar Hoje</div>
                                        <div className="text-[10px] opacity-70">{new Date().toLocaleDateString('pt-BR')}</div>
                                    </div>
                                </div>
                                {selectedOption === 'today' && <Check size={18} />}
                            </button>

                            <button
                                onClick={() => setSelectedOption('custom')}
                                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${selectedOption === 'custom'
                                    ? 'bg-gold-500/10 border-gold-500 text-gold-500'
                                    : 'bg-white/5 border-white/5 text-zinc-400 hover:border-white/10'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <Calendar size={18} />
                                    <div className="text-left">
                                        <div className="font-bold text-sm">Escolher Data</div>
                                        <div className="text-[10px] opacity-70">Definir dia do pagamento</div>
                                    </div>
                                </div>
                                {selectedOption === 'custom' && <Check size={18} />}
                            </button>

                            {selectedOption === 'custom' && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="pt-2 animate-in fade-in slide-in-from-top-2"
                                >
                                    <input
                                        type="date"
                                        value={customDate}
                                        onChange={(e) => setCustomDate(e.target.value)}
                                        className="w-full bg-[#131418] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-gold-500 transition-all font-mono text-sm"
                                    />
                                </motion.div>
                            )}
                        </div>

                        <div className="flex items-center gap-3 mt-8">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition-all text-sm border border-white/5"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => onConfirm(selectedOption === 'today' ? getTodayBrasilia() : customDate)}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-black font-bold transition-all text-sm shadow-lg shadow-gold-500/10"
                            >
                                Confirmar
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

export default PaymentDateModal;
