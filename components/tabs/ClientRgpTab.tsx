import React, { useState, useEffect } from 'react';
import { Client } from '../../types';
import {
    Fish, Info, AlertTriangle, CheckCircle2,
    Calendar, MapPin, RefreshCw, Clock, ExternalLink,
    FileText, ShieldCheck, Eye, EyeOff, Shield, Terminal, Loader2
} from 'lucide-react';
import { formatDateDisplay } from '../../utils/dateUtils';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../services/supabaseClient';

interface ClientRgpTabProps {
    client: Client;
    onUpdate?: (updatedClient: Client) => Promise<void>;
    setEditedClient?: React.Dispatch<React.SetStateAction<Client>>;
}

const ClientRgpTab: React.FC<ClientRgpTabProps> = ({ client, onUpdate, setEditedClient }) => {
    const { showToast } = useApp();
    const [isHeadless, setIsHeadless] = useState<boolean>(true);
    const [isRunning, setIsRunning] = useState(false);

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
        showToast('success', 'Iniciando consulta ao robô... Aguarde.');

        const cpf = client.cpf_cnpj.replace(/\D/g, '');
        // Adiciona timestamp para evitar cache
        const url = `http://localhost:3001/api/stream-rgp?id=${client.id}&cpf=${cpf}&headless=${isHeadless}&t=${new Date().getTime()}`;

        const es = new EventSource(url);

        es.onmessage = async (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'success') {
                    es.close();
                    setIsRunning(false);

                    // Recarrega dados do cliente
                    const { data: updated, error } = await supabase.from('clients').select('*').eq('id', client.id).single();
                    if (updated) {
                        if (onUpdate) await onUpdate(updated);
                        if (setEditedClient) {
                            setEditedClient(prev => ({ ...prev, ...updated }));
                        }
                        showToast('success', 'Consulta Finalizada! Dados atualizados.');
                    }
                } else if (data.type === 'error') {
                    es.close();
                    setIsRunning(false);
                    showToast('error', `Erro no robô: ${data.message}`);
                }
            } catch (e) {
                console.error("Erro ao processar evento SSE:", e);
            }
        };

        es.onerror = (err) => {
            console.error("Erro na conexão SSE:", err);
            if (es.readyState !== 2) {
                es.close();
                setIsRunning(false);
                showToast('error', 'Conexão perdida com o robô.');
            }
        };
    };

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'Ativo': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
            case 'Suspenso': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
            case 'Cancelado': return 'text-red-500 bg-red-500/10 border-red-500/20';
            default: return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
        }
    };

    const getReapStatusColor = (status?: string) => {
        switch (status) {
            case 'Regular': return 'text-emerald-500';
            case 'Pendente Anual': return 'text-amber-500';
            default: return 'text-red-500';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-navy-900/50 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
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

                <div className="bg-navy-900/50 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Manutenção REAP</span>
                        <Clock size={16} className="text-gold-500" />
                    </div>
                    <div className="flex items-center gap-1">
                        <span className={`text-lg font-bold ${getReapStatusColor(client.reap_status)}`}>
                            {client.reap_status || 'Desconhecido'}
                        </span>
                        {client.reap_ano_base && (
                            <span className="text-slate-500 text-xs font-medium ml-1">
                                ({client.reap_ano_base})
                            </span>
                        )}
                    </div>
                </div>

                <div className="bg-navy-900/50 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Localidade Pesqueira</span>
                        <MapPin size={16} className="text-gold-500" />
                    </div>
                    <span className="text-slate-200 font-medium truncate">
                        {client.rgp_localidade || 'Não informada'}
                    </span>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* RGP Details */}
                <div className="bg-navy-900/30 border border-slate-800 rounded-xl overflow-hidden relative">
                    <div className="px-4 py-3 border-b border-slate-800 bg-navy-900/50 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2 font-serif">
                            <ShieldCheck size={16} className="text-gold-500" /> Detalhes do Registro
                        </h3>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleConsultation}
                                disabled={isRunning}
                                className={`text-xs font-bold flex items-center gap-1.5 transition-all px-3 py-1 rounded-full border ${isRunning ? 'bg-navy-800 text-slate-500 border-slate-700 cursor-not-allowed' : 'bg-navy-800 text-gold-500 hover:bg-navy-700 border-slate-700 hover:border-gold-500'}`}
                            >
                                <RefreshCw size={14} className={isRunning ? 'animate-spin' : ''} />
                                {isRunning ? 'Consultando...' : 'Consultar Robô'}
                            </button>
                        </div>
                    </div>
                    <div className="p-4 space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                            <span className="text-sm text-slate-500">Número do Registro:</span>
                            <span className="text-sm font-mono text-white bg-slate-800 px-2 py-0.5 rounded">
                                {client.rgp_numero || 'Pendente'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                            <span className="text-sm text-slate-500">Local de Exercício:</span>
                            <span className="text-sm text-slate-300">
                                {client.rgp_local_exercicio || client.rgp_localidade || 'Não identificado'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                            <span className="text-sm text-slate-500">Data do 1º RGP:</span>
                            <span className="text-sm text-slate-300">{client.rgp_data_primeiro || 'Não identificada'}</span>
                        </div>

                        {client.reap_status === 'Pendente Anual' && (
                            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex gap-3">
                                <AlertTriangle className="text-amber-500 shrink-0" size={18} />
                                <div>
                                    <p className="text-xs font-bold text-amber-500">Atenção: Manutenção Necessária</p>
                                    <p className="text-[10px] text-amber-500/80">O Relatório Reap do ano base {client.reap_ano_base || 'atual'} ainda não foi identificado.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Automation Actions */}
                <div className="space-y-4">

                    <div className="bg-navy-900/30 border border-slate-800 rounded-xl overflow-hidden h-fit group transition-all hover:border-purple-500/30">
                        <div className="px-4 py-3 border-b border-slate-800 bg-navy-900/50">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-serif">
                                <RefreshCw size={16} className="text-gold-500" /> Ações de Automação
                            </h3>
                        </div>
                        <div className="p-4 space-y-3">
                            <button
                                onClick={handleConsultation}
                                disabled={isRunning}
                                className={`w-full flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700 transition-all group ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                                onClick={() => showToast('success', 'Automação de REAP Anual agendada para próxima atualização.')}
                                className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700 transition-all group"
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
        </div>
    );
};

export default ClientRgpTab;
