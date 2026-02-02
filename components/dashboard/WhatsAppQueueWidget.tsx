import React from 'react';
import { motion } from 'framer-motion';
import { Send, Clock, CheckCircle2, AlertCircle, MessageSquare } from 'lucide-react';

interface WhatsAppQueueWidgetProps {
    pending: number;
    sent?: number;
    errors?: number;
    onClick?: () => void;
}

const WhatsAppQueueWidget: React.FC<WhatsAppQueueWidgetProps> = ({ pending, sent = 0, errors = 0, onClick }) => {
    return (
        <div
            className="flex flex-col h-full cursor-pointer group"
            onClick={onClick}
        >
            <h3 className="text-sm font-bold text-white mb-4 font-serif flex items-center gap-2">
                <Send size={16} className="text-emerald-500" />
                Fila de Disparos WhatsApp
            </h3>

            <div className="flex-1 flex flex-col justify-center">
                <div className="flex items-center justify-center mb-6">
                    <div className="relative">
                        <div className="text-5xl font-black text-white tracking-tighter drop-shadow-lg">
                            {pending}
                        </div>
                        <div className="absolute -top-1 -right-4 w-3 h-3 bg-emerald-500 rounded-full animate-ping opacity-75" />
                        <div className="absolute -top-1 -right-4 w-3 h-3 bg-emerald-500 rounded-full" />
                    </div>
                    <div className="ml-4 flex flex-col">
                        <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Pendentes</span>
                        <span className="text-xs text-emerald-500 font-bold uppercase">Processando...</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-auto">
                    <div className="p-2 rounded-xl bg-black/20 border border-white/5 flex flex-col items-center">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase">Enviados</span>
                        <div className="flex items-center gap-1.5 mt-1">
                            <CheckCircle2 size={12} className="text-emerald-500" />
                            <span className="text-sm font-bold text-white">{sent}</span>
                        </div>
                    </div>
                    <div className="p-2 rounded-xl bg-black/20 border border-white/5 flex flex-col items-center">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase">Erros</span>
                        <div className="flex items-center gap-1.5 mt-1">
                            <AlertCircle size={12} className="text-red-500" />
                            <span className="text-sm font-bold text-white">{errors}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 py-2 bg-emerald-500/10 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
                <MessageSquare size={14} className="text-emerald-500" />
                <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Ver Fila Completa</span>
            </div>
        </div>
    );
};

export default WhatsAppQueueWidget;
