import React, { useState, useMemo } from 'react';
import { AppNotification } from '../../types';
import {
    X, Calendar, AlertCircle, CheckCircle2, TrendingDown,
    TrendingUp, Shield, Pin, Users, AlertTriangle,
    ChevronDown, ChevronRight, Eye, Scale, ArrowRight, Bell
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAllCases } from '../../hooks/useCases';
import { useAllClients } from '../../hooks/useClients';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    notifications: AppNotification[];
}

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ isOpen, onClose, notifications }) => {
    const { setCurrentView, setClientToView, setCaseToView } = useApp();
    const { data: cases = [] } = useAllCases();
    const { data: clients = [] } = useAllClients();
    const [collapsedSections, setCollapsedSections] = useState<string[]>(['tomorrow', 'upcoming']);
    const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null);

    const typeLabels: Record<string, string> = {
        reminder: 'Lembrete',
        interview: 'Perícia/Reunião',
        benefit: 'Status Processo',
        expense: 'Pagamento',
        income: 'Recebimento'
    };
    // Grouping by Type inside Days
    const getGroups = (notifs: AppNotification[]) => {
        const groups: Record<string, AppNotification[]> = {
            'Pagamentos': [],
            'Processos': [],
            'Agenda': []
        };

        notifs.forEach(n => {
            if (n.type === 'expense' || n.type === 'income') {
                groups['Pagamentos'].push(n);
            } else if (n.type === 'benefit') {
                groups['Processos'].push(n);
            } else if (n.type === 'reminder' || n.type === 'interview') {
                groups['Agenda'].push(n);
            } else {
                groups['Processos'].push(n);
            }
        });

        return groups;
    };

    if (!isOpen) return null;

    const todayNotifications = notifications.filter(n => n.urgency === 'today');
    const tomorrowNotifications = notifications.filter(n => n.urgency === 'tomorrow');
    const upcomingNotifications = notifications.filter(n => n.urgency === 'upcoming');

    const sections = [
        { id: 'today', label: 'Hoje', items: todayNotifications, color: 'red' },
        { id: 'tomorrow', label: 'Amanhã', items: tomorrowNotifications, color: 'yellow' },
        { id: 'upcoming', label: 'Próximos Dias', items: upcomingNotifications, color: 'gold' }
    ].filter(s => s.items.length > 0);

    const toggleSection = (sectionId: string) => {
        setCollapsedSections(prev =>
            prev.includes(sectionId) ? prev.filter(s => s !== sectionId) : [...prev, sectionId]
        );
    };

    const formatMoney = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const parts = dateStr.split('T')[0].split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return new Date(dateStr).toLocaleDateString('pt-BR');
    };

    const handleNavigate = (type: 'client' | 'case', name?: string, id?: string) => {
        if (!id && !name) return;

        if (type === 'client') {
            const finalId = id || clients.find(c => c.nome_completo === name)?.id;
            if (finalId) {
                setCurrentView('clients');
                setClientToView(finalId);
                onClose();
                setSelectedNotification(null);
            }
        } else {
            const kase = id ? cases.find(c => c.id === id) : cases.find(c => name && (name.includes(c.titulo) || name.includes(c.numero_processo)));
            if (kase) {
                let targetView: any = 'cases';
                if (kase.tipo === 'Seguro Defeso') targetView = 'cases-insurance';
                else if (kase.tribunal && kase.tribunal.toUpperCase() !== 'INSS') targetView = 'cases-judicial';
                else targetView = 'cases-administrative';

                setCurrentView(targetView);
                setCaseToView(kase.id);
                onClose();
                setSelectedNotification(null);
            }
        }
    };

    const renderItem = (item: AppNotification) => {
        let Icon = AlertCircle;
        let colorClass = 'text-zinc-400';
        let bgClass = 'bg-zinc-800/10';
        let borderClass = 'border-zinc-800';

        if (item.type === 'reminder') {
            Icon = Pin;
            colorClass = 'text-indigo-400';
            bgClass = 'bg-indigo-500/10';
            borderClass = 'border-indigo-500/20';
        } else if (item.type === 'interview') {
            Icon = Users;
            colorClass = 'text-purple-400';
            bgClass = 'bg-purple-500/10';
            borderClass = 'border-purple-500/20';
        } else if (item.type === 'expense') {
            const isFatal = item.title.includes('FATAL');
            Icon = isFatal ? AlertCircle : TrendingDown;
            colorClass = 'text-red-400';
            bgClass = 'bg-red-500/10';
            borderClass = 'border-red-500/20';
        } else if (item.type === 'benefit') {
            const isStagnant = item.title.includes('Estagnado');
            Icon = isStagnant ? AlertTriangle : Shield;
            colorClass = isStagnant ? 'text-amber-400' : 'text-blue-400';
            bgClass = isStagnant ? 'bg-amber-500/10' : 'bg-blue-500/10';
            borderClass = isStagnant ? 'border-amber-500/20' : 'border-blue-500/20';
        } else {
            Icon = TrendingUp;
            colorClass = 'text-emerald-400';
            bgClass = 'bg-emerald-500/10';
            borderClass = 'border-emerald-500/20';
        }

        return (
            <motion.div
                key={item.id}
                layout
                onClick={() => setSelectedNotification(item)}
                className={`p-3 rounded-xl border ${borderClass} ${bgClass} mb-2 flex items-start gap-3 cursor-pointer group transition-all transform hover:scale-[1.01]`}
            >
                <div className={`p-2 rounded-full bg-black/20 ${colorClass} shrink-0`}>
                    <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                        <h4 className={`text-[10px] font-bold ${colorClass} truncate`}>{item.title}</h4>
                        {item.amount > 0 && (
                            <span className="text-[9px] font-bold text-white bg-black/30 px-1.5 py-0.5 rounded">
                                {formatMoney(item.amount)}
                            </span>
                        )}
                    </div>
                    <p className="text-[11px] text-zinc-300 font-medium truncate mt-0.5">{item.clientName}</p>
                    <p className="text-[10px] text-zinc-500 mt-1 line-clamp-1">{item.message}</p>
                </div>
            </motion.div>
        );
    };

    return (
        <>
            <div className="fixed inset-0 z-[9998]" onClick={onClose}></div>

            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="fixed left-[80px] top-[120px] z-[9999] w-80 p-[1px] rounded-2xl overflow-hidden group/panel shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
            >
                {/* Efeito de Borda Animada (Tracing Border) */}
                <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,transparent_25%,#eab308_50%,transparent_75%)] animate-[spin_3s_linear_infinite] opacity-40 group-hover/panel:opacity-100 transition-opacity" />

                <div className="relative w-full h-full bg-[#0c0d12]/95 backdrop-blur-xl rounded-2xl flex flex-col max-h-[80vh] overflow-hidden">
                    <div className="p-4 border-b border-zinc-800/50 flex justify-between items-center bg-[#0f111a]/50 rounded-t-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gold-600 to-transparent opacity-50"></div>
                        <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                            <div className="p-1 rounded-lg bg-gold-500/10 border border-gold-500/20">
                                <Bell size={14} className="text-gold-500" />
                            </div>
                            Notificações
                        </h3>
                        <button onClick={onClose} className="text-zinc-500 hover:text-white p-1.5 hover:bg-white/5 rounded-full transition-colors">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="overflow-y-auto p-4 custom-scrollbar space-y-4 flex-1">
                        {notifications.length === 0 && (
                            <div className="text-center py-12 text-zinc-500">
                                <div className="w-16 h-16 bg-zinc-800/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-800/30">
                                    <CheckCircle2 size={32} className="opacity-30" />
                                </div>
                                <p className="text-sm font-medium text-zinc-400">Tudo em dia!</p>
                            </div>
                        )}

                        {sections.map(section => {
                            const groups = getGroups(section.items);
                            const isCollapsed = collapsedSections.includes(section.id);

                            return (
                                <div key={section.id} className="space-y-2">
                                    <button
                                        onClick={() => toggleSection(section.id)}
                                        className="w-full flex items-center justify-between px-2"
                                    >
                                        <h4 className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${section.color === 'red' ? 'text-red-400' : section.color === 'yellow' ? 'text-yellow-500' : 'text-gold-500/70'
                                            }`}>
                                            {isCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                                            {section.label}
                                            <span className="bg-white/5 px-1.5 rounded-md text-[9px] opacity-50">{section.items.length}</span>
                                        </h4>
                                    </button>

                                    {!isCollapsed && (
                                        <div className="pl-2 space-y-4 border-l border-zinc-800/50 ml-3 py-1">
                                            {Object.entries(groups).map(([groupName, groupItems]) => {
                                                if (groupItems.length === 0) return null;
                                                const groupId = `${section.id}-${groupName}`;
                                                const isGroupCollapsed = collapsedSections.includes(groupId);

                                                return (
                                                    <div key={groupName} className="space-y-2">
                                                        <button
                                                            onClick={() => toggleSection(groupId)}
                                                            className="flex items-center gap-2 text-[9px] font-bold text-zinc-500 hover:text-zinc-300 uppercase tracking-wider"
                                                        >
                                                            {isGroupCollapsed ? <ChevronRight size={8} /> : <ChevronDown size={8} />}
                                                            {groupName}
                                                            <span className="text-zinc-700">({groupItems.length})</span>
                                                        </button>
                                                        {!isGroupCollapsed && (
                                                            <div className="space-y-1">
                                                                {groupItems.map(renderItem)}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="p-3 border-t border-zinc-800/50 bg-[#0f111a]/50 rounded-b-2xl text-center">
                        <p className="text-[10px] font-medium text-zinc-500 flex items-center justify-center gap-1">
                            <Calendar size={10} className="text-zinc-600" />
                            Próximos 7 dias
                        </p>
                    </div>

                    <AnimatePresence>
                        {selectedNotification && (
                            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                                    onClick={() => setSelectedNotification(null)}
                                />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                    className="relative w-full max-w-[340px] bg-[#0c0d12] rounded-2xl flex flex-col border border-zinc-800 shadow-[0_30px_90px_rgba(0,0,0,0.9)] overflow-hidden max-h-[85vh]"
                                >
                                    <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-[#0f111a]">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-xs font-black text-gold-500 uppercase tracking-wider">Detalhes</h4>
                                            <span className="text-xs font-bold text-zinc-400 font-mono tracking-tight">
                                                • {formatDate(selectedNotification.date)}
                                            </span>
                                        </div>
                                        <button onClick={() => setSelectedNotification(null)} className="p-1.5 hover:bg-white/5 rounded-full text-zinc-500 hover:text-white transition-colors">
                                            <X size={18} />
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                                        <div className="flex flex-col items-center text-center space-y-3 mb-6">
                                            <div className="p-4 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-500">
                                                <Bell size={24} />
                                            </div>
                                            <h2 className="text-sm font-bold text-white leading-tight px-2">{selectedNotification.title}</h2>
                                            {selectedNotification.amount > 0 && (
                                                <div className="text-xl font-black text-emerald-500">
                                                    {formatMoney(selectedNotification.amount)}
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-4">
                                            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                                <label className="text-[9px] text-zinc-500 uppercase font-black block mb-1.5">Mensagem</label>
                                                <p className="text-xs text-zinc-200 leading-relaxed font-medium">{selectedNotification.message}</p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    onClick={() => handleNavigate('client', selectedNotification.clientName, selectedNotification.clientId)}
                                                    className="bg-navy-900/50 hover:bg-navy-900 border border-navy-800 p-3 rounded-xl flex flex-col items-center gap-1.5 group transition-all"
                                                >
                                                    <Users size={16} className="text-blue-400 group-hover:scale-110 transition-transform" />
                                                    <span className="text-[9px] font-bold text-zinc-500 uppercase">Cliente</span>
                                                    <p className="text-[10px] text-zinc-200 truncate w-full text-center">{selectedNotification.clientName}</p>
                                                </button>
                                                <button
                                                    onClick={() => handleNavigate('case', selectedNotification.message, selectedNotification.caseId)}
                                                    className="bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 p-3 rounded-xl flex flex-col items-center gap-1.5 group transition-all"
                                                >
                                                    <Scale size={16} className="text-gold-500 group-hover:scale-110 transition-transform" />
                                                    <span className="text-[9px] font-bold text-zinc-500 uppercase">Processo</span>
                                                    <p className="text-[10px] text-zinc-200 truncate w-full text-center">Ver Processo</p>
                                                </button>
                                            </div>

                                            <div className="flex justify-end px-1">
                                                <span className="bg-zinc-800/50 px-2 py-0.5 rounded text-gold-500 text-[9px] font-bold uppercase tracking-widest border border-gold-500/10">
                                                    {typeLabels[selectedNotification.type] || selectedNotification.type.toUpperCase()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 border-t border-zinc-800 bg-[#0f111a]">
                                        <button
                                            onClick={() => setSelectedNotification(null)}
                                            className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 border border-white/5"
                                        >
                                            Voltar para Lista
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </>
    );
};

export default NotificationsPanel;
