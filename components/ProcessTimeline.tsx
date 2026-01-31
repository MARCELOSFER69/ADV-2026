import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, MessageSquare, Clock, AlertCircle, Bot, User, Share2 } from 'lucide-react';
import { formatDateDisplay } from '../utils/dateUtils';

interface HistoryItem {
    id: string;
    action: string;
    old_value: string;
    new_value: string;
    details: string;
    timestamp: string;
    is_bot_update?: boolean;
    whatsapp_status?: 'pendente' | 'enviado' | 'erro';
}

interface ProcessTimelineProps {
    history: HistoryItem[];
}

const RefreshCcw = ({ size, className }: any) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
        <path d="M16 16h5v5" />
    </svg>
);

const ProcessTimeline: React.FC<ProcessTimelineProps> = ({ history }) => {
    if (!history || history.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                <Clock size={32} className="mb-2 opacity-20" />
                <p className="text-sm">Nenhum histórico registrado para este processo.</p>
            </div>
        );
    }

    return (
        <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-800">
            {history.map((item, index) => {
                const isStatusChange = item.old_value !== item.new_value;
                const Icon = item.is_bot_update ? Bot : isStatusChange ? RefreshCcw : MessageSquare;

                return (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="relative"
                    >
                        {/* Dot */}
                        <div className={`absolute -left-[27px] top-1 w-5 h-5 rounded-full border-4 border-[#131418] z-10 flex items-center justify-center ${item.is_bot_update ? 'bg-gold-500' : isStatusChange ? 'bg-blue-500' : 'bg-zinc-600'
                            }`}>
                            <Icon size={10} className="text-black" />
                        </div>

                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-all">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                    {formatDateDisplay(item.timestamp)}
                                </span>

                                {item.whatsapp_status && (
                                    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tighter ${item.whatsapp_status === 'enviado' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                        item.whatsapp_status === 'pendente' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                                            'bg-red-500/10 text-red-500 border border-red-500/20'
                                        }`}>
                                        <Share2 size={10} />
                                        WhatsApp: {item.whatsapp_status}
                                    </div>
                                )}
                            </div>

                            <h4 className="text-sm font-bold text-white mb-1">
                                {item.action}
                            </h4>

                            {isStatusChange && (
                                <div className="flex items-center gap-2 mb-2 p-2 rounded-lg bg-black/20 border border-white/5">
                                    <span className="text-xs text-zinc-500 line-through">{item.old_value || 'N/A'}</span>
                                    <RefreshCcw size={12} className="text-gold-500" />
                                    <span className="text-xs text-emerald-400 font-bold">{item.new_value}</span>
                                </div>
                            )}

                            <p className="text-xs text-zinc-400 leading-relaxed">
                                {item.details}
                            </p>

                            {item.is_bot_update && (
                                <div className="mt-3 py-1 px-2 bg-gold-500/5 border border-gold-500/10 rounded-md inline-flex items-center gap-1.5">
                                    <Bot size={12} className="text-gold-500" />
                                    <span className="text-[10px] text-gold-500 font-medium uppercase tracking-tight">Atualização Automática Inteligente</span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
};

export default ProcessTimeline;
