import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Cpu, Search, Filter, CheckSquare, Square,
    Play, RefreshCw, FileText, Download, Users,
    CheckCircle2, AlertCircle, Loader2
} from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import BotExecutionModal from '../../components/modals/BotExecutionModal';
import ReapConfigModal from '../../components/modals/ReapConfigModal';
import PendencyIndicator from '../../components/ui/PendencyIndicator';
import { auditService } from '../../services/auditService';

const Robots: React.FC = () => {
    const { clients, showToast, triggerRgpSync, triggerReapSync, fetchClients, refreshClient, reloadData } = useApp();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClients, setSelectedClients] = useState<string[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [activeRobot, setActiveRobot] = useState<'rgp' | 'reap' | null>(null);
    const [isBotModalOpen, setIsBotModalOpen] = useState(false);
    const [botQueue, setBotQueue] = useState<Array<{ id: string; cpf: string; name: string; senha?: string }>>([]);
    const [isHeadless, setIsHeadless] = useState(true);
    const [reapConfigOpen, setReapConfigOpen] = useState(false);

    const [fishingData, setFishingData] = useState<any[]>([]);

    // Server Status State
    const [serverStatus, setServerStatus] = useState<'stopped' | 'starting' | 'running' | 'error'>('stopped');
    const [serverMessage, setServerMessage] = useState('');

    // Start RGP Server on Mount
    React.useEffect(() => {
        const api = (window as any).electronAPI;
        if (api && api.startRgpServer) {
            setServerStatus('starting');
            api.startRgpServer()
                .then(() => {
                    console.log("RGP Server start requested");
                })
                .catch((err: any) => {
                    console.error("Failed to start server", err);
                    setServerStatus('error');
                    setServerMessage('Falha ao iniciar servidor');
                });

            const removeListener = api.onRgpStatus((status: string) => {
                console.log("RGP Server Status:", status);
                setServerStatus(status as any);
            });

            return () => {
                if (removeListener) removeListener(); // If onRgpStatus returned a cleaner
            };
        }
    }, []);
    React.useEffect(() => {
        const fetchBotConfig = async () => {
            const { data } = await supabase.from('system_settings').select('value').eq('key', 'clara_bot_control').single();
            if (data?.value?.config?.headless !== undefined) {
                setIsHeadless(data.value.config.headless);
            }
        };
        fetchBotConfig();
    }, []);

    // Lista de IDs que estão sendo processados visualmente
    const [processingIds, setProcessingIds] = useState<string[]>([]);

    const filteredClients = useMemo(() => {
        return clients.filter(c =>
            c.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.cpf_cnpj.includes(searchTerm)
        ).slice(0, 50);
    }, [clients, searchTerm]);

    // Ref para controlar se estavamos processando (para disparar o reload ao finalizar)
    const wasProcessingRef = React.useRef(false);

    React.useEffect(() => {
        if (processingIds.length > 0) {
            wasProcessingRef.current = true;
        } else if (wasProcessingRef.current) {
            // Se estava processando e agora zerou -> ACABOU
            wasProcessingRef.current = false;
            // Dispara o "Recarregamento Silencioso" pedido pelo usuário
            reloadData();
            showToast('success', 'Dados atualizados com sucesso!');
        }
    }, [processingIds, reloadData, showToast]);

    // POLLING: Verifica status no BANCO para remover do loading (Mais robusto que depender do Context)
    React.useEffect(() => {
        if (processingIds.length === 0) return;

        const interval = setInterval(async () => {
            try {
                // Consulta direta ao banco para ver se o status jà mudou
                // Isso evita problemas de delay na propagação do Estado Global
                const { data: statuses } = await supabase
                    .from('clients')
                    .select('id, rgp_status, reap_status')
                    .in('id', processingIds);

                if (statuses) {
                    const finishedIds = statuses
                        .filter(c => {
                            const finishedRgp = ['Ativo', 'Cancelado', 'Suspenso', 'Não Encontrado', 'Inexistente'];
                            const isRgpDone = c.rgp_status && finishedRgp.some(s => c.rgp_status?.includes(s));

                            // Para REAP, consideramos feito se tiver algo diferente de nulo e do estado anterior (se tivessemos)
                            // Ou simplesmente se o status for finalizado. 
                            // O robô de REAP salva 'Regular' ou 'Pendente Anual'.
                            const finishedReap = ['Regular', 'Pendente Anual'];
                            const isReapDone = c.reap_status && finishedReap.some(s => c.reap_status?.includes(s));

                            return isRgpDone || isReapDone;
                        })
                        .map(c => c.id);

                    if (finishedIds.length > 0) {
                        // Remove os finalizados da lista de processamento
                        setProcessingIds(prev => prev.filter(id => !finishedIds.includes(id)));

                        // Opcional: Já atualiza o cliente no contexto para feedback rápido enquanto não recarrega tudo
                        finishedIds.forEach(id => refreshClient && refreshClient(id));
                    }
                }
            } catch (err) {
                console.error("Polling error:", err);
            }
        }, 4000);

        return () => clearInterval(interval);
    }, [processingIds, refreshClient]);

    // Listener especifico para remover do loading quando o cliente atualizar
    React.useEffect(() => {
        if (processingIds.length === 0) return;

        // Hack: Usar supabase subscription local APENAS para saber quem acabou de atualizar
        const channel = supabase.channel('robots-view-realtime')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'clients' }, payload => {
                setProcessingIds(prev => prev.filter(id => id !== payload.new.id));
            })
            .subscribe();

        return () => { channel?.unsubscribe(); }
    }, [processingIds]); // Recria se a lista mudar é safe pois ids mudam pouco

    const toggleSelectAll = () => {
        if (selectedClients.length === filteredClients.length && filteredClients.length > 0) {
            setSelectedClients([]);
        } else {
            setSelectedClients(filteredClients.map(c => c.id));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedClients(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleRunRobot = (type: 'rgp' | 'reap') => {
        if (selectedClients.length === 0) {
            showToast('error', 'Selecione pelo menos um cliente.');
            return;
        }

        const clientsToProcess = clients
            .filter(c => selectedClients.includes(c.id))
            .map(c => ({
                id: c.id,
                cpf: c.cpf_cnpj,
                name: c.nome_completo,
                senha: c.senha_gov
            }));

        // Audit Log
        auditService.log({
            action: 'robot_execution_start',
            details: `Started ${type.toUpperCase()} robot for ${clientsToProcess.length} clients`,
            entity: 'robot',
            entity_id: type
        });

        setActiveRobot(type);

        if (type === 'reap') {
            // Verifica se todos têm senha
            const missingPassword = clientsToProcess.find(c => !c.senha);
            if (missingPassword) {
                showToast('error', `O cliente ${missingPassword.name} não possui senha GOV cadastrada.`);
                return;
            }
            // Abre Configuração ANTES de iniciar a fila
            setBotQueue(clientsToProcess);
            setReapConfigOpen(true);
        } else {
            // RGP inicia direto
            setBotQueue(clientsToProcess);
            setIsBotModalOpen(true);
            setSelectedClients([]);
        }
    };

    const handleReapConfigConfirm = (data: any[]) => {
        setFishingData(data);
        setReapConfigOpen(false);
        setIsBotModalOpen(true);
        setSelectedClients([]);
    };

    return (
        <div className="space-y-8 pb-10">
            {/* Standard Premium Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-4">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-gold-500/10 rounded-2xl text-gold-500 border border-gold-500/20 shadow-lg shadow-gold-500/5 transition-transform hover:scale-105">
                        <Cpu size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white font-serif tracking-tight">
                            Central de Robôs
                        </h1>
                        <p className="text-slate-400 text-[11px] md:text-xs font-medium mt-0.5 opacity-80 uppercase tracking-widest">
                            Selecione os clientes e dispare as automações em massa.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Server Status Indicator */}
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#18181b] border border-white/10 mr-2">
                        <div className={`w-2 h-2 rounded-full ${serverStatus === 'running' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                            serverStatus === 'starting' ? 'bg-amber-500 animate-pulse' :
                                serverStatus === 'error' ? 'bg-rose-500' : 'bg-slate-500'
                            }`} />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {serverStatus === 'running' ? 'Servidor Online' :
                                serverStatus === 'starting' ? 'Iniciando...' :
                                    serverStatus === 'error' ? 'Erro no Servidor' : 'Offline'}
                        </span>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleRunRobot('rgp')}
                        disabled={isRunning || serverStatus !== 'running'}
                        className="h-10 px-6 bg-[#131418] border border-white/10 hover:border-gold-500/50 text-gold-500 rounded-xl font-bold text-xs transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg"
                    >
                        {isRunning && activeRobot === 'rgp' ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                        <span>Consultar RGP</span>
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleRunRobot('reap')}
                        disabled={isRunning || serverStatus !== 'running'}
                        className="h-10 px-6 bg-gold-600 hover:bg-gold-700 text-black rounded-xl font-bold text-xs transition-all shadow-lg shadow-gold-600/20 flex items-center gap-2 disabled:opacity-50"
                    >
                        {isRunning && activeRobot === 'reap' ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                        <span>Realizar REAP</span>
                    </motion.button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-[#131418] border border-white/10 rounded-2xl p-5 space-y-6 shadow-xl">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                            <Filter size={12} className="text-gold-500" /> Filtros Avançados
                        </h3>

                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-gold-500 transition-colors" size={16} />
                            <input
                                type="text"
                                placeholder="Procurar cliente..."
                                className="w-full bg-[#18181b] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:border-gold-500/50 outline-none transition-all placeholder:text-slate-600"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="pt-6 border-t border-white/5">
                            <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">
                                <span>Seleção Atual</span>
                                <span className="text-gold-500">{selectedClients.length} Clientes</span>
                            </div>
                            <div className="w-full bg-[#18181b] h-2 rounded-full overflow-hidden border border-white/5">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(selectedClients.length / (filteredClients.length || 1)) * 100}%` }}
                                    className="bg-gold-600 h-full shadow-[0_0_10px_rgba(202,138,4,0.3)]"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-5 shadow-inner">
                        <div className="flex gap-4">
                            <div className="p-2 bg-amber-500/10 rounded-lg h-fit">
                                <AlertCircle className="text-amber-500" size={18} />
                            </div>
                            <div>
                                <h4 className="text-xs font-black text-amber-500 uppercase tracking-widest mb-2">Aviso de Execução</h4>
                                <p className="text-[11px] text-amber-500/70 leading-relaxed font-medium">Ao iniciar o robô REAP, o sistema irá gerar e anexar os PDFs automaticamente na conta de cada cliente.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-3">
                    <div className="bg-[#131418] border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-[#0f1014] text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-white/10">
                                    <tr>
                                        <th className="px-6 py-5 w-16 text-center">
                                            <button onClick={toggleSelectAll} className="text-gold-500 hover:text-gold-400 transition-all hover:scale-110 active:scale-95">
                                                {selectedClients.length === filteredClients.length && filteredClients.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
                                            </button>
                                        </th>
                                        <th className="px-6 py-5">Identificação do Cliente</th>
                                        <th className="px-6 py-5 text-center">Status RGP (Previdenciário)</th>
                                        <th className="px-6 py-5 text-center">Status REAP (Anual)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.03]">
                                    {filteredClients.map((client) => {
                                        const isProcessing = processingIds.includes(client.id);
                                        const isSelected = selectedClients.includes(client.id);

                                        return (
                                            <tr
                                                key={client.id}
                                                onClick={() => toggleSelect(client.id)}
                                                className={`group transition-all duration-300 cursor-pointer ${isSelected ? 'bg-gold-500/5' : 'hover:bg-white/[0.02]'}`}
                                            >
                                                <td className="px-6 py-4 text-center">
                                                    <div className={`transition-all duration-300 ${isSelected ? 'text-gold-500 scale-110' : 'text-slate-600 opacity-30 group-hover:opacity-60'}`}>
                                                        {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <PendencyIndicator pendencies={client.pendencias} align="left">
                                                        <div className="cursor-help py-1">
                                                            <p className="text-sm font-bold text-white group-hover:text-gold-500/90 transition-colors leading-tight">{client.nome_completo}</p>
                                                            <p className="text-[10px] text-slate-500 font-mono mt-1 tracking-wider">{client.cpf_cnpj}</p>
                                                        </div>
                                                    </PendencyIndicator>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {isProcessing ? (
                                                        <div className="flex items-center justify-center">
                                                            <div className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-gold-500/30 bg-gold-500/10 text-gold-500 flex items-center gap-2 shadow-[0_0_15px_rgba(202,138,4,0.1)]">
                                                                <Loader2 size={12} className="animate-spin" />
                                                                Sincronizando
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-center">
                                                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-inner ${client.rgp_status === 'Ativo' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5' :
                                                                client.rgp_status === 'Pendente' || !client.rgp_status ? 'text-amber-500 border-amber-500/20 bg-amber-500/5' :
                                                                    'text-slate-500 border-white/5 bg-white/5'
                                                                }`}>
                                                                {client.rgp_status || 'Pendente'}
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {isProcessing ? (
                                                        <span className="text-gold-600 animate-pulse text-[10px] font-black uppercase tracking-widest">Aguardando...</span>
                                                    ) : (
                                                        <div className="flex justify-center">
                                                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-inner ${client.reap_status === 'Regular' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5' :
                                                                client.reap_status === 'Pendente Anual' ? 'text-rose-500 border-rose-500/20 bg-rose-500/5' :
                                                                    'text-slate-500 border-white/5'
                                                                }`}>
                                                                {client.reap_status || 'Não Processado'}
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {filteredClients.length === 0 && (
                            <div className="py-12 flex flex-col items-center gap-3">
                                <Users className="text-slate-700" size={40} />
                                <p className="text-slate-500 text-sm font-medium">Nenhum cliente disponível para processamento automático.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <BotExecutionModal
                isOpen={isBotModalOpen}
                onClose={() => setIsBotModalOpen(false)}
                type={activeRobot || 'rgp'}
                queue={botQueue}
                headless={isHeadless}
                fishingData={activeRobot === 'reap' ? fishingData : undefined}
                // Props required by interface but overridden by queue logic
                clientId=""
                cpf=""
                onSuccess={() => {
                    // Update main clients list if needed
                    reloadData();
                }}
            />

            <ReapConfigModal
                isOpen={reapConfigOpen}
                onClose={() => setReapConfigOpen(false)}
                onConfirm={handleReapConfigConfirm}
                clientName={`${selectedClients.length} Clientes Selecionados`}
            />
        </div>
    );
};

export default Robots;
