import React from 'react';
import { AppNotification } from '../../types';
import { X, Calendar, AlertCircle, CheckCircle2, TrendingDown, TrendingUp, Shield, Pin, Users } from 'lucide-react';

interface NotificationsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    notifications: AppNotification[];
}

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ isOpen, onClose, notifications }) => {
    if (!isOpen) return null;

    const todayNotifications = notifications.filter(n => n.urgency === 'today');
    const tomorrowNotifications = notifications.filter(n => n.urgency === 'tomorrow');
    const upcomingNotifications = notifications.filter(n => n.urgency === 'upcoming');

    const formatMoney = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        // Converte YYYY-MM-DD para o formato brasileiro sem variações de fuso horário
        const parts = dateStr.split('T')[0].split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return new Date(dateStr).toLocaleDateString('pt-BR');
    };

    const renderItem = (item: AppNotification) => {

        // --- DESIGN 1: LEMBRETES PESSOAIS (Indigo) ---
        if (item.type === 'reminder') {
            const isPersonal = item.clientName === 'Pessoal';
            return (
                <div key={item.id} className="p-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 mb-2 flex items-start gap-3 group hover:bg-indigo-500/10 transition-all hover:scale-[1.02]">
                    <div className="p-2 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                        <Pin size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-indigo-300 leading-tight">{item.title}</h4>
                        {!isPersonal && item.clientName && (
                            <p className="text-xs text-indigo-400 mt-1 font-bold">{item.clientName}</p>
                        )}
                        <p className="text-xs text-zinc-200 mt-1 font-medium">{item.message}</p>
                        <div className="flex justify-between items-center mt-2">
                            <p className="text-[10px] text-indigo-500/70 font-mono uppercase tracking-wider">
                                {isPersonal ? 'Lembrete Pessoal' : 'Evento do Processo'}
                            </p>
                            {item.date && <p className="text-[10px] text-zinc-500">{formatDate(item.date)}</p>}
                        </div>
                    </div>
                </div>
            );
        }

        // --- DESIGN 2: ENTREVISTAS (Roxo/Purple) --- [NOVO]
        if (item.type === 'interview') {
            return (
                <div key={item.id} className="p-3 rounded-xl border border-purple-500/20 bg-purple-500/5 mb-2 flex items-start gap-3 group hover:bg-purple-500/10 transition-all hover:scale-[1.02]">
                    <div className="p-2 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
                        <Users size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-purple-300 leading-tight">{item.title}</h4>
                        <p className="text-xs text-zinc-200 mt-1 font-bold">{item.clientName}</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">{item.message}</p>
                        {item.date && <p className="text-[10px] text-zinc-600 mt-1 text-right">{formatDate(item.date)}</p>}
                    </div>
                </div>
            );
        }

        // --- DESIGN 3: FINANCEIRO E BENEFÍCIOS (Padrão) ---
        let Icon = AlertCircle;
        let colorClass = 'text-zinc-400';
        let bgClass = 'bg-zinc-800/5';
        let borderClass = 'border-zinc-700/30';

        if (item.type === 'expense') {
            Icon = TrendingDown;
            colorClass = 'text-red-400';
            bgClass = 'bg-red-500/5';
            borderClass = 'border-red-500/20';
        } else if (item.type === 'benefit') {
            Icon = Shield;
            colorClass = 'text-blue-400';
            bgClass = 'bg-blue-500/5';
            borderClass = 'border-blue-500/20';
        } else {
            Icon = TrendingUp;
            colorClass = 'text-emerald-400';
            bgClass = 'bg-emerald-500/5';
            borderClass = 'border-emerald-500/20';
        }

        return (
            <div key={item.id} className={`p-3 rounded-xl border ${borderClass} ${bgClass} mb-2 flex items-start gap-3 hover:bg-opacity-70 transition-all hover:scale-[1.02]`}>
                <div className={`p-2 rounded-full bg-black/20 ${colorClass} shrink-0`}>
                    <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                        <h4 className={`text-sm font-bold ${colorClass} truncate`}>{item.title}</h4>
                        {item.amount > 0 && (
                            <span className="text-xs font-bold text-white bg-black/30 px-2 py-0.5 rounded whitespace-nowrap">
                                {formatMoney(item.amount)}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-zinc-300 mt-1 font-medium truncate">{item.clientName}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5 leading-tight line-clamp-2">{item.message}</p>
                    {item.date && <p className="text-[10px] text-zinc-600 mt-1 text-right">{formatDate(item.date)}</p>}
                </div>
            </div>
        );
    };

    return (
        <>
            {/* Backdrop invisível */}
            <div className="fixed inset-0 z-[9998]" onClick={onClose}></div>

            {/* Painel */}
            <div className="fixed left-[80px] bottom-16 z-[9999] w-80 bg-[#0c0d12] border border-zinc-800/50 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col max-h-[650px] animate-in slide-in-from-left-4 fade-in duration-300">

                {/* Header */}
                <div className="p-5 border-b border-zinc-800/50 flex justify-between items-center bg-[#0f111a] rounded-t-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gold-600 to-transparent opacity-50"></div>
                    <h3 className="font-bold text-white flex items-center gap-2 text-base">
                        <div className="p-1.5 rounded-lg bg-gold-500/10 border border-gold-500/20">
                            <AlertCircle size={16} className="text-gold-500" />
                        </div>
                        Notificações
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-zinc-500 hover:text-white p-2 hover:bg-white/5 rounded-full transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto p-4 custom-scrollbar space-y-6">

                    {notifications.length === 0 && (
                        <div className="text-center py-12 text-zinc-500">
                            <div className="w-16 h-16 bg-zinc-800/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-800/30">
                                <CheckCircle2 size={32} className="opacity-30" />
                            </div>
                            <p className="text-sm font-medium text-zinc-400">Tudo em dia!</p>
                            <p className="text-xs mt-1">Nenhuma pendência ou evento para os próximos dias.</p>
                        </div>
                    )}

                    {/* HOJE */}
                    {todayNotifications.length > 0 && (
                        <div className="relative">
                            <div className="absolute -left-4 top-0 bottom-0 w-1 bg-red-500/50 rounded-full"></div>
                            <h4 className="text-[11px] font-black text-red-400 uppercase tracking-[0.1em] mb-3 flex items-center gap-2 pl-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                Para Hoje
                            </h4>
                            <div className="space-y-1">
                                {todayNotifications.map(renderItem)}
                            </div>
                        </div>
                    )}

                    {/* AMANHÃ */}
                    {tomorrowNotifications.length > 0 && (
                        <div className="relative">
                            <div className="absolute -left-4 top-0 bottom-0 w-1 bg-yellow-500/50 rounded-full"></div>
                            <h4 className="text-[11px] font-black text-yellow-500 uppercase tracking-[0.1em] mb-3 flex items-center gap-2 pl-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                                Para Amanhã
                            </h4>
                            <div className="space-y-1">
                                {tomorrowNotifications.map(renderItem)}
                            </div>
                        </div>
                    )}

                    {/* EM ALGUNS DIAS */}
                    {upcomingNotifications.length > 0 && (
                        <div className="relative">
                            <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gold-500/30 rounded-full"></div>
                            <h4 className="text-[11px] font-black text-gold-500/70 uppercase tracking-[0.1em] mb-3 flex items-center gap-2 pl-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-gold-500/50"></span>
                                Em alguns dias
                            </h4>
                            <div className="space-y-1">
                                {upcomingNotifications.map(renderItem)}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-3 border-t border-zinc-800/50 bg-[#0f111a] rounded-b-2xl text-center">
                    <p className="text-[10px] font-medium text-zinc-500 flex items-center justify-center gap-1">
                        <Calendar size={10} className="text-zinc-600" />
                        Eventos dos próximos 7 dias
                    </p>
                </div>
            </div>
        </>
    );
};

export default NotificationsPanel;
