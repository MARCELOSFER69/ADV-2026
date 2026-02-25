import React, { useState, useEffect } from 'react';
import { Client } from '../../types';
import {
    Fish, Info, AlertTriangle, CheckCircle2,
    Calendar, MapPin, RefreshCw, Clock, ExternalLink,
    FileText, ShieldCheck, Eye, EyeOff, Shield, Terminal, Loader2,
    ChevronDown, ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import BotExecutionModal from '../modals/BotExecutionModal';
import ReapConfigModal from '../modals/ReapConfigModal';
import { formatDateDisplay } from '../../utils/dateUtils';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../services/supabaseClient';

interface ClientRgpTabProps {
    client: Client;
    onUpdate?: (updatedClient: Client) => Promise<void>;
    setEditedClient?: React.Dispatch<React.SetStateAction<Client>>;
}

const ClientRgpTab: React.FC<ClientRgpTabProps> = ({ client, onUpdate, setEditedClient }) => {
    const { showToast, triggerRgpSync } = useApp();
    const [isHeadless, setIsHeadless] = useState<boolean>(true);
    const [isRunning, setIsRunning] = useState(false);
    const [modalConfig, setModalConfig] = useState<{
        type: 'rgp' | 'reap';
        isOpen: boolean;
    }>({ type: 'rgp', isOpen: false });
    const [reapConfigOpen, setReapConfigOpen] = useState(false);
    const [fishingData, setFishingData] = useState<any[]>([]);
    const [isReapExpanded, setIsReapExpanded] = useState(false);

    // Carregar configuração de headless do robô
    useEffect(() => {
        const fetchBotConfig = async () => {
            const { data } = await supabase.from('system_settings').select('value').eq('key', 'clara_bot_control').single();
            if (data?.value?.config?.headless !== undefined) {
                setIsHeadless(data.value.config.headless);
            }
        };
        fetchBotConfig();

        // Escutar mudanças no modo headless
        const channel = supabase.channel('rgp-tab-monitor')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'system_settings' }, payload => {
                const newData = (payload.new as any);
                if (newData.key === 'clara_bot_control') {
                    if (newData.value?.config?.headless !== undefined) {
                        setIsHeadless(newData.value.config.headless);
                    }
                }
            })
            .subscribe();

        return () => { channel.unsubscribe(); };
    }, []);

    const toggleHeadless = async () => {
        try {
            const newValue = !isHeadless;
            setIsHeadless(newValue);

            const { data: current } = await supabase.from('system_settings').select('value').eq('key', 'clara_bot_control').single();
            const updatedValue = {
                ...(current?.value || {}),
                config: {
                    ...(current?.value?.config || {}),
                    headless: newValue
                }
            };

            await supabase.from('system_settings').update({ value: updatedValue }).eq('key', 'clara_bot_control');
            showToast('success', `Modo Oculto ${newValue ? 'Ativado' : 'Desativado'}`);
        } catch (e) {
            showToast('error', 'Erro ao alterar configuração');
        }
    };

    const handleConsultation = () => {
        if (!client.cpf_cnpj) {
            showToast('error', 'Cliente sem CPF cadastrado.');
            return;
        }
        setIsRunning(true);
        setModalConfig({ type: 'rgp', isOpen: true });
    };

    const handleReapProcess = () => {
        if (!client.cpf_cnpj) {
            showToast('error', 'Cliente sem CPF cadastrado.');
            return;
        }
        if (!client.senha_gov) {
            showToast('error', 'Senha Gov.br necessária para o REAP.');
            return;
        }
        // Abre modal de configuração PRIMEIRO
        setReapConfigOpen(true);
    };

    const handleReapConfigConfirm = (data: any[]) => {
        setFishingData(data);
        setReapConfigOpen(false);
        setModalConfig({ type: 'reap', isOpen: true });
    };

    const handleModalSuccess = async () => {
        const { data: updated } = await supabase.from('clients').select('*').eq('id', client.id).single();
        if (updated) {
            if (onUpdate) await onUpdate(updated);
            if (setEditedClient) setEditedClient(prev => ({ ...prev, ...updated }));
            showToast('success', 'Dados atualizados com sucesso!');
        }
    };

    // --- LOGICA REAP HISTORICO ---
    const CURRENT_YEAR = new Date().getFullYear();
    const CURRENT_MONTH = new Date().getMonth() + 1; // 1-indexed

    const MONTHS = [
        { id: 1, name: 'Jan', blocked: true },
        { id: 2, name: 'Fev', blocked: true },
        { id: 3, name: 'Mar', blocked: true },
        { id: 4, name: 'Abr', blocked: false },
        { id: 5, name: 'Mai', blocked: false },
        { id: 6, name: 'Jun', blocked: false },
        { id: 7, name: 'Jul', blocked: false },
        { id: 8, name: 'Ago', blocked: false },
        { id: 9, name: 'Set', blocked: false },
        { id: 10, name: 'Out', blocked: false },
        { id: 11, name: 'Nov', blocked: false },
        { id: 12, name: 'Dez', blocked: true },
    ];

    const reapHistory = client.reap_history || {};

    const toggleYear = async (year: number) => {
        const newHistory = { ...reapHistory };
        newHistory[year] = !newHistory[year];
        const updatedClient = { ...client, reap_history: newHistory };
        if (setEditedClient) setEditedClient(updatedClient);
        if (onUpdate) await onUpdate(updatedClient);
    };

    const toggleMonth = async (year: number, monthId: number) => {
        const newHistory = { ...reapHistory };
        const currentMonths = Array.isArray(newHistory[year]) ? (newHistory[year] as number[]) : [];

        if (currentMonths.includes(monthId)) {
            newHistory[year] = currentMonths.filter(m => m !== monthId);
        } else {
            newHistory[year] = [...currentMonths, monthId].sort((a, b) => a - b);
        }

        const updatedClient = { ...client, reap_history: newHistory };
        if (setEditedClient) setEditedClient(updatedClient);
        if (onUpdate) await onUpdate(updatedClient);
    };

    const selectAllMonths = async (year: number) => {
        const newHistory = { ...reapHistory };
        const validMonths = MONTHS.filter(m => !m.blocked).map(m => m.id);

        const currentMonths = Array.isArray(newHistory[year]) ? (newHistory[year] as number[]) : [];
        if (currentMonths.length === validMonths.length) {
            newHistory[year] = [];
        } else {
            newHistory[year] = validMonths;
        }

        const updatedClient = { ...client, reap_history: newHistory };
        if (setEditedClient) setEditedClient(updatedClient);
        if (onUpdate) await onUpdate(updatedClient);
    };

    // Calcular sinalização (Simplificado)
    const getReapSignaling = () => {
        const missing: string[] = [];

        // 2021-2024
        for (let y = 2021; y <= 2024; y++) {
            if (!reapHistory[y]) missing.push(`${y}`);
        }

        // 2025 onwards logic
        for (let y = 2025; y <= CURRENT_YEAR; y++) {
            const doneMonths = Array.isArray(reapHistory[y]) ? (reapHistory[y] as number[]) : [];
            const isFishingSeason = CURRENT_MONTH >= 4 && CURRENT_MONTH <= 11;

            let targetMonths = MONTHS.filter(m => !m.blocked && m.id < CURRENT_MONTH).map(m => m.id);
            if (y < CURRENT_YEAR) {
                targetMonths = MONTHS.filter(m => !m.blocked).map(m => m.id);
            } else if (y === CURRENT_YEAR && isFishingSeason) {
                // Se estivermos na temporada, o mês atual TAMBÉM deve estar feito? 
                // O usuário disse: "se tiver em abril e abril nao tiver feito, vai sinalizar"
                targetMonths = MONTHS.filter(m => !m.blocked && m.id <= CURRENT_MONTH).map(m => m.id);
            } else if (y === CURRENT_YEAR && CURRENT_MONTH > 11) {
                targetMonths = MONTHS.filter(m => !m.blocked).map(m => m.id);
            }

            const missingInYear = targetMonths.filter(m => !doneMonths.includes(m));
            if (missingInYear.length > 0) {
                missing.push(`${y}: ${missingInYear.map(m => MONTHS[m - 1].name).join(', ')}`);
            }
        }

        return missing;
    };

    const missingReaps = getReapSignaling();
    const isRegular = missingReaps.length === 0;

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'Ativo': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
            case 'Suspenso': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
            case 'Cancelado': return 'text-red-500 bg-red-500/10 border-red-500/20';
            default: return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
        }
    };

    const getReapStatusColor = (status?: string) => {
        if (isRegular) return 'text-emerald-500';
        return 'text-amber-500';
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#18181b] border border-white/5 rounded-xl p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status RGP</span>
                        <Fish size={16} className="text-gold-500" />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${getStatusColor(client.rgp_status)}`}>
                            {client.rgp_status || 'Não Identificado'}
                        </span>
                    </div>
                </div>

                <div className="bg-[#18181b] border border-white/5 rounded-xl p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Manutenção REAP</span>
                        <Clock size={16} className="text-gold-500" />
                    </div>
                    <div className="flex items-center gap-1">
                        <span className={`text-lg font-bold ${getReapStatusColor()}`}>
                            {isRegular ? 'Regular' : 'Manutenção Pendente'}
                        </span>
                    </div>
                </div>

                <div className="bg-[#18181b] border border-white/5 rounded-xl p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Localidade Pesqueira</span>
                        <MapPin size={16} className="text-gold-500" />
                    </div>
                    <span className="text-slate-200 font-medium truncate">
                        {client.rgp_localidade || 'Não informada'}
                    </span>
                </div>
            </div>

            {/* Checklist Section */}
            <div className="bg-[#18181b] border border-white/5 rounded-xl overflow-hidden shadow-sm">
                <button
                    onClick={() => setIsReapExpanded(!isReapExpanded)}
                    className="w-full px-4 py-3 border-b border-white/5 bg-[#131418] flex items-center justify-between hover:bg-white/5 transition-colors group"
                >
                    <div className="flex items-center gap-3">
                        <Calendar size={18} className="text-gold-500" />
                        <h3 className="text-sm font-bold text-white font-serif">
                            Checklist de Manutenção REAP
                        </h3>
                        {!isRegular && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-500">
                                <AlertTriangle size={12} /> PENDENTE: {missingReaps.length}
                            </div>
                        )}
                        {isRegular && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-500">
                                <CheckCircle2 size={12} /> REGULAR
                            </div>
                        )}
                    </div>
                    <div className="text-slate-500 group-hover:text-white transition-colors">
                        {isReapExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                </button>

                <AnimatePresence>
                    {isReapExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="p-4 space-y-6 overflow-hidden"
                        >
                            {/* Anos Anuais (2021-2024) */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[2021, 2022, 2023, 2024].map(year => (
                                    <button
                                        key={year}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleYear(year);
                                        }}
                                        className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${reapHistory[year]
                                                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-500'
                                                : 'bg-zinc-900 border-white/5 text-slate-500 hover:border-white/20'
                                            }`}
                                    >
                                        <span className="text-xs font-bold">{year}</span>
                                        {reapHistory[year] ? <CheckCircle2 size={16} className="mt-1" /> : <Clock size={16} className="mt-1 opacity-20" />}
                                    </button>
                                ))}
                            </div>

                            {/* Anos Mensais (2025+) */}
                            {[2025, 2026].filter(y => y <= CURRENT_YEAR).map(year => {
                                const doneMonths = Array.isArray(reapHistory[year]) ? (reapHistory[year] as number[]) : [];
                                const validMonthsCount = MONTHS.filter(m => !m.blocked).length;

                                return (
                                    <div key={year} className="space-y-3 p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-white">{year}</span>
                                                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">(Mensal)</span>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    selectAllMonths(year);
                                                }}
                                                className="text-[10px] font-bold text-gold-500 hover:text-gold-400 uppercase tracking-wider px-2 py-1 bg-gold-500/10 rounded flex items-center gap-1.5 transition-colors"
                                            >
                                                <RefreshCw size={10} />
                                                {doneMonths.length === validMonthsCount ? 'Limpar Tudo' : 'Marcar Tudo'}
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-2">
                                            {MONTHS.map(month => {
                                                const isDone = doneMonths.includes(month.id);
                                                const isFuture = year === CURRENT_YEAR && month.id > CURRENT_MONTH;

                                                return (
                                                    <button
                                                        key={month.id}
                                                        disabled={month.blocked || isFuture}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleMonth(year, month.id);
                                                        }}
                                                        className={`flex flex-col items-center justify-center py-2 rounded border transition-all ${month.blocked
                                                                ? 'bg-transparent border-dashed border-white/5 opacity-20 cursor-not-allowed'
                                                                : isDone
                                                                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                                                                    : isFuture
                                                                        ? 'bg-zinc-800/30 border-white/5 text-slate-700 cursor-not-allowed'
                                                                        : 'bg-zinc-800 border-white/5 text-slate-400 hover:border-white/20'
                                                            }`}
                                                    >
                                                        <span className="text-[10px] font-bold uppercase">{month.name}</span>
                                                        {isDone && <CheckCircle2 size={10} className="mt-0.5" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Main Content Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* RGP Details */}
                <div className="bg-[#18181b] border border-white/5 rounded-xl overflow-hidden relative">
                    <div className="px-4 py-3 border-b border-white/5 bg-[#131418] flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2 font-serif">
                            <ShieldCheck size={16} className="text-gold-500" /> Detalhes do Registro
                        </h3>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleConsultation}
                                disabled={isRunning}
                                className={`text-xs font-bold flex items-center gap-1.5 transition-all px-3 py-1 rounded-full border ${isRunning ? 'bg-[#131418] text-slate-500 border-white/5 cursor-not-allowed' : 'bg-[#131418] text-gold-500 hover:bg-gold-500/10 border-white/5 hover:border-gold-500/30'}`}
                            >
                                <RefreshCw size={14} className={isRunning ? 'animate-spin' : ''} />
                                {isRunning ? 'Consultando...' : 'Consultar Robô'}
                            </button>
                        </div>
                    </div>
                    <div className="p-4 space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-sm text-slate-500">Número do Registro:</span>
                            <span className="text-sm font-mono text-white bg-black/40 px-2 py-0.5 rounded">
                                {client.rgp_numero || 'Pendente'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-sm text-slate-500">Local de Exercício:</span>
                            <span className="text-sm text-slate-300">
                                {client.rgp_local_exercicio || client.rgp_localidade || 'Não identificado'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-sm text-slate-500">Data do 1º RGP:</span>
                            <span className="text-sm text-slate-300">{client.rgp_data_primeiro || 'Não identificada'}</span>
                        </div>

                        {!isRegular && (
                            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex gap-3">
                                <AlertTriangle className="text-amber-500 shrink-0" size={18} />
                                <div>
                                    <p className="text-xs font-bold text-amber-500">Atenção: Manutenção Necessária</p>
                                    <div className="text-[10px] text-amber-500/80 mt-1 space-y-0.5">
                                        {missingReaps.map((m, i) => (
                                            <p key={i}>• Faltando: {m}</p>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Automation Actions */}
                <div className="space-y-4">

                    <div className="bg-[#18181b] border border-white/5 rounded-xl overflow-hidden h-fit group transition-all hover:border-purple-500/30">
                        <div className="px-4 py-3 border-b border-white/5 bg-[#131418]">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-serif">
                                <RefreshCw size={16} className="text-gold-500" /> Ações de Automação
                            </h3>
                        </div>
                        <div className="p-4 space-y-3">
                            <button
                                onClick={handleConsultation}
                                disabled={isRunning}
                                className={`w-full flex items-center justify-between p-3 rounded-lg bg-[#131418] hover:bg-black/40 border border-white/5 transition-all group ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-gold-600/20 flex items-center justify-center text-gold-500">
                                        <Fish size={14} className={isRunning ? 'animate-pulse' : ''} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xs font-bold text-white">
                                            {isRunning ? 'Consultando Robô...' : 'Consulta Automatizada RGP'}
                                        </p>
                                        <p className="text-[10px] text-slate-500">Verifica status e localidade no MAPA</p>
                                    </div>
                                </div>
                                {isRunning ? <Loader2 size={14} className="animate-spin text-gold-500" /> : <ExternalLink size={14} className="text-slate-600 group-hover:text-gold-500" />}
                            </button>

                            <button
                                onClick={handleReapProcess}
                                className="w-full flex items-center justify-between p-3 rounded-lg bg-[#131418] hover:bg-black/40 border border-white/5 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-600/20 flex items-center justify-center text-emerald-500">
                                        <FileText size={14} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xs font-bold text-white">Realizar REAP Anual</p>
                                        <p className="text-[10px] text-slate-500">Faz a manutenção e anexa o PDF</p>
                                    </div>
                                </div>
                                <ExternalLink size={14} className="text-slate-600 group-hover:text-emerald-500" />
                            </button>

                            {/* HOVER CONFIG: HEADLESS TOGGLE */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-800/50 mt-2">
                                <span className="flex items-center gap-1.5">
                                    <Eye size={12} /> Ver navegador?
                                </span>
                                <button
                                    onClick={toggleHeadless}
                                    className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${!isHeadless ? 'bg-purple-500' : 'bg-slate-700'}`}
                                    title={isHeadless ? "Modo Oculto (Ativo)" : "Modo Visível (Ativo)"}
                                >
                                    <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${!isHeadless ? 'translate-x-3' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ReapConfigModal
                isOpen={reapConfigOpen}
                onClose={() => setReapConfigOpen(false)}
                onConfirm={handleReapConfigConfirm}
                clientName={client.nome_completo}
                clientLocation={client.rgp_localidade}
            />

            <BotExecutionModal
                isOpen={modalConfig.isOpen}
                onClose={() => {
                    setModalConfig(prev => ({ ...prev, isOpen: false }));
                    setIsRunning(false);
                }}
                type={modalConfig.type}
                clientId={client.id}
                cpf={client.cpf_cnpj.replace(/\D/g, '')}
                senha={client.senha_gov}
                headless={isHeadless}
                onSuccess={handleModalSuccess}
                fishingData={modalConfig.type === 'reap' ? fishingData : undefined}
                hideUI={modalConfig.type === 'rgp'}
                onError={(msg) => showToast('error', msg)}
            />
        </div>
    );
};

export default ClientRgpTab;
