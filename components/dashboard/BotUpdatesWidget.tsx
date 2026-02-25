import React from 'react';
import { motion } from 'framer-motion';
import { Bot, RefreshCcw, ArrowRight, Clock } from 'lucide-react';
import { formatDateDisplay } from '../../utils/dateUtils';

interface BotUpdate {
    id: string;
    numero_processo: string;
    case_title: string;
    bot_name: string;
    changes_detected: {
        old_status: string;
        new_status: string;
    };
    created_at: string;
}

interface BotUpdatesWidgetProps {
    updates: BotUpdate[] | null;
    title?: string;
}

const BotUpdatesWidget: React.FC<BotUpdatesWidgetProps> = ({ updates, title = 'Últimas Atualizações dos Bots' }) => {
    return (
        <div className="flex flex-col h-full">
            <h3 className="text-sm font-bold text-white mb-4 font-serif flex items-center gap-2">
                <Bot size={16} className="text-gold-500" />
                {title}
            </h3>

            <div className="space-y-3 overflow-y-auto custom-scrollbar flex-1 pr-1">
                {!updates || updates.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-500 py-8">
                        <RefreshCcw size={24} className="mb-2 opacity-20" />
                        <span className="text-xs">Nenhuma atualização recente</span>
                    </div>
                ) : (
                    updates.map((update, index) => (
                        <motion.div
                            key={update.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="p-3 rounded-xl bg-black/40 border border-white/5 hover:border-gold-500/20 transition-all group"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h4 className="text-xs font-bold text-white group-hover:text-gold-500 transition-colors">
                                        {update.numero_processo}
                                    </h4>
                                    <p className="text-[10px] text-zinc-400 truncate max-w-[150px]">
                                        {update.case_title}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gold-500/10 border border-gold-500/20">
                                    <span className="text-[9px] font-black uppercase text-gold-500 tracking-tighter">
                                        {update.bot_name}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-[11px]">
                                <span className="text-zinc-500 line-through truncate max-w-[80px]">
                                    {update.changes_detected?.old_status || '---'}
                                </span>
                                <ArrowRight size={12} className="text-gold-500 shrink-0" />
                                <span className="text-emerald-400 font-medium truncate">
                                    {update.changes_detected?.new_status}
                                </span>
                            </div>

                            <div className="mt-2 flex items-center gap-1 text-[9px] text-zinc-500 uppercase tracking-widest font-bold">
                                <Clock size={10} />
                                {formatDateDisplay(update.created_at)}
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
};

export default BotUpdatesWidget;
