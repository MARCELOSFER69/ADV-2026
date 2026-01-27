import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
    Cpu, Search, Filter, CheckSquare, Square,
    Play, RefreshCw, FileText, Download, Users,
    CheckCircle2, AlertCircle, Loader2
} from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

const Robots: React.FC = () => {
    const { clients, showToast, triggerRgpSync, triggerReapSync, fetchClients, refreshClient, reloadData } = useApp();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClients, setSelectedClients] = useState<string[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [activeRobot, setActiveRobot] = useState<'rgp' | 'reap' | null>(null);

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

        if (type === 'rgp') {
            const clientsToSync = clients.filter(c => selectedClients.includes(c.id));

            // Ativa loading visual para esses IDs
            setProcessingIds(prev => [...prev, ...clientsToSync.map(c => c.id)]);

            triggerRgpSync(clientsToSync.map(c => ({ id: c.id, cpf_cnpj: c.cpf_cnpj })));
            setSelectedClients([]); // Limpa seleção
        } else if (type === 'reap') {
            const clientsToSync = clients.filter(c => selectedClients.includes(c.id));

            // Ativa loading visual
            setProcessingIds(prev => [...prev, ...clientsToSync.map(c => c.id)]);

            triggerReapSync(clientsToSync.map(c => ({
                id: c.id,
                cpf_cnpj: c.cpf_cnpj,
                senha_gov: c.senha_gov
            })));

            setSelectedClients([]);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-end border-b border-slate-800 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white font-serif flex items-center gap-3">
                        <Cpu className="text-gold-500" size={32} /> Central de Robôs
                    </h1>
                    <p className="text-slate-500 mt-2">Selecione os clientes e dispare as automações em massa.</p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => handleRunRobot('rgp')}
                        disabled={isRunning}
                        className="bg-navy-900 hover:bg-navy-800 border border-gold-600/30 hover:border-gold-500 text-gold-500 px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {isRunning && activeRobot === 'rgp' ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                        Consultar RGP
                    </button>
                    <button
                        onClick={() => handleRunRobot('reap')}
                        disabled={isRunning}
                        className="bg-gold-600 hover:bg-gold-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-lg shadow-gold-600/20 flex items-center gap-2 disabled:opacity-50"
                    >
                        {isRunning && activeRobot === 'reap' ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                        Realizar REAP
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-navy-900/50 border border-slate-800 rounded-xl p-4 space-y-4">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <Filter size={14} className="text-gold-500" /> Filtros
                        </h3>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input
                                type="text"
                                placeholder="Procurar cliente..."
                                className="w-full bg-navy-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-gold-500 outline-none transition-colors"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="pt-4 border-t border-slate-800">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500">Selecionados</span>
                                <span className="text-gold-500 font-bold">{selectedClients.length}</span>
                            </div>
                            <div className="w-full bg-navy-950 h-1.5 rounded-full mt-2 overflow-hidden">
                                <div
                                    className="bg-gold-500 h-full transition-all duration-300"
                                    style={{ width: `${(selectedClients.length / (filteredClients.length || 1)) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                        <div className="flex gap-3">
                            <AlertCircle className="text-amber-500 shrink-0" size={20} />
                            <div>
                                <h4 className="text-xs font-bold text-amber-500">Aviso de Execução</h4>
                                <p className="text-[10px] text-amber-500/80 mt-1">Ao iniciar o robô REAP, o sistema irá gerar e anexar os PDFs automaticamente na conta de cada cliente.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-3">
                    <div className="bg-navy-900/30 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
                        <table className="w-full text-left">
                            <thead className="bg-navy-900 text-slate-400 text-[10px] uppercase font-bold tracking-widest border-b border-slate-800">
                                <tr>
                                    <th className="px-6 py-4 w-12">
                                        <button onClick={toggleSelectAll} className="text-gold-500 hover:text-gold-400 transition-colors">
                                            {selectedClients.length === filteredClients.length && filteredClients.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
                                        </button>
                                    </th>
                                    <th className="px-6 py-4">Cliente / CPF</th>
                                    <th className="px-6 py-4 text-center">Status RGP</th>
                                    <th className="px-6 py-4 text-center">Último REAP</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {filteredClients.map((client) => {
                                    const isProcessing = processingIds.includes(client.id);

                                    return (
                                        <tr
                                            key={client.id}
                                            onClick={() => toggleSelect(client.id)}
                                            className={`hover:bg-slate-800/30 transition-colors cursor-pointer ${selectedClients.includes(client.id) ? 'bg-gold-600/5' : ''}`}
                                        >
                                            <td className="px-6 py-4">
                                                <div className={`text-gold-500 transition-opacity ${selectedClients.includes(client.id) ? 'opacity-100' : 'opacity-30'}`}>
                                                    {selectedClients.includes(client.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="text-sm font-bold text-white leading-tight">{client.nome_completo}</p>
                                                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{client.cpf_cnpj}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {isProcessing ? (
                                                    <span className="px-2 py-0.5 rounded text-[9px] font-bold border text-gold-500 border-gold-500/20 bg-gold-500/10 flex items-center justify-center gap-1">
                                                        <Loader2 size={10} className="animate-spin" /> Processando...
                                                    </span>
                                                ) : (
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${client.rgp_status === 'Ativo' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10' :
                                                        client.rgp_status === 'Pendente' || !client.rgp_status ? 'text-amber-500 border-amber-500/20 bg-amber-500/10' :
                                                            'text-slate-500 border-slate-700 bg-slate-800'
                                                        }`}>
                                                        {client.rgp_status || 'Pendente'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {isProcessing ? (
                                                    <span className="text-gold-500 animate-pulse text-[10px]">Aguardando...</span>
                                                ) : (
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${client.reap_status === 'Regular' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10' :
                                                        client.reap_status === 'Pendente Anual' ? 'text-rose-500 border-rose-500/20 bg-rose-500/10' :
                                                            'text-slate-500 border-slate-800'
                                                        }`}>
                                                        {client.reap_status || '---'}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                        {filteredClients.length === 0 && (
                            <div className="py-12 flex flex-col items-center gap-3">
                                <Users className="text-slate-700" size={40} />
                                <p className="text-slate-500 text-sm">Nenhum cliente encontrado.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Robots;
