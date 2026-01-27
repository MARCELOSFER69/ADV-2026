import React, { useEffect, useState, useRef } from 'react';
import { Terminal, X, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

interface BotExecutionModalProps {
    isOpen: boolean;
    onClose: () => void;
    cpf: string;
    clientId: string;
    senha?: string;
    headless: boolean;
    type: 'rgp' | 'reap';
    onSuccess?: () => void;
    fishingData?: any[];
}

const BotExecutionModal: React.FC<BotExecutionModalProps> = ({
    isOpen, onClose, cpf, clientId, senha, headless, type, onSuccess, fishingData
}) => {
    const [logs, setLogs] = useState<string[]>([]);
    const [status, setStatus] = useState<'connecting' | 'running' | 'success' | 'error'>('connecting');
    const [finalMessage, setFinalMessage] = useState<string>('');

    const logsEndRef = useRef<HTMLDivElement>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    useEffect(() => {
        if (!isOpen) {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
            setLogs([]);
            setStatus('connecting');
            return;
        }

        const baseUrl = type === 'rgp' ? '/api/stream-rgp' : '/api/stream-reap';
        let url = `http://localhost:3001${baseUrl}?id=${clientId}&cpf=${cpf}&headless=${headless}&t=${new Date().getTime()}`;

        if (type === 'reap' && senha) {
            url += `&senha=${encodeURIComponent(senha)}`;
        }

        // Adiciona fishing_data para REAP
        if (type === 'reap' && fishingData && fishingData.length > 0) {
            url += `&fishing_data=${encodeURIComponent(JSON.stringify(fishingData))}`;
        }

        console.log("🔌 Conectando ao Stream:", url);
        setLogs([`> Iniciando conexão com o robô ${type.toUpperCase()} (Modo ${headless ? 'Headless' : 'Visível'})...`]);
        setStatus('running');

        const es = new EventSource(url);
        eventSourceRef.current = es;

        es.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'log') {
                    setLogs(prev => [...prev, `> ${data.message}`]);
                } else if (data.type === 'success') {
                    setLogs(prev => [...prev, `✅ SUCESSO: Operação finalizada com sucesso!`]);
                    setStatus('success');
                    if (onSuccess) onSuccess();
                    es.close();
                } else if (data.type === 'error') {
                    setLogs(prev => [...prev, `❌ ERRO: ${data.message}`]);
                    setFinalMessage(data.message);
                    setStatus('error');
                    es.close();
                }
            } catch (e) {
                console.error("Erro ao processar evento SSE:", e);
            }
        };

        es.onerror = (err) => {
            if (status !== 'success' && status !== 'error') {
                if (es.readyState === 2) {
                    // Closed by server
                } else {
                    setLogs(prev => [...prev, `⚠️ Conexão perdida. O robô pode ter parado ou terminado.`]);
                    setStatus('error');
                    es.close();
                }
            }
        };

        return () => {
            if (es) es.close();
        };
    }, [isOpen, clientId, cpf, headless, type, senha]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-[#0c0d10] border border-slate-800 w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-navy-900 px-5 py-4 border-b border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${status === 'running' ? 'bg-amber-500 animate-pulse' :
                            status === 'success' ? 'bg-emerald-500' :
                                status === 'error' ? 'bg-red-500' : 'bg-slate-500'
                            }`} />
                        <h3 className="font-bold text-white text-sm uppercase tracking-wide">
                            {type === 'reap' ? 'Manutenção REAP' : 'Consulta RGP'}
                        </h3>
                    </div>
                    {status !== 'running' && (
                        <button
                            onClick={onClose}
                            className="text-slate-500 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Content - Clean Loading State */}
                <div className="p-8 flex flex-col items-center justify-center gap-4">
                    {status === 'running' && (
                        <>
                            <div className="relative">
                                <Loader2 size={48} className="text-gold-500 animate-spin" />
                            </div>
                            <div className="text-center">
                                <p className="text-white font-bold text-lg">Processando...</p>
                                <p className="text-slate-500 text-sm mt-1">
                                    {type === 'reap' ? 'Realizando manutenção anual do cliente.' : 'Consultando dados do RGP.'}
                                </p>
                            </div>
                            <button
                                onClick={async () => {
                                    // Primeiro fecha a conexão SSE
                                    if (eventSourceRef.current) {
                                        eventSourceRef.current.close();
                                        eventSourceRef.current = null;
                                    }
                                    // Depois manda matar o processo no backend
                                    try {
                                        await fetch('http://localhost:3001/api/stop-reap', { method: 'POST' });
                                    } catch (e) {
                                        console.warn('Erro ao chamar stop-reap:', e);
                                    }
                                    setStatus('error');
                                    setFinalMessage('Operação cancelada pelo usuário.');
                                }}
                                className="mt-4 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 text-red-400 hover:text-red-300 text-sm font-bold px-6 py-2 rounded-lg transition-all flex items-center gap-2"
                            >
                                <X size={16} />
                                Cancelar Operação
                            </button>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <CheckCircle2 size={56} className="text-emerald-500" />
                            <div className="text-center">
                                <p className="text-white font-bold text-lg">Concluído com Sucesso!</p>
                                <p className="text-slate-500 text-sm mt-1">
                                    {type === 'reap' ? 'Manutenção REAP finalizada.' : 'Consulta RGP finalizada.'}
                                </p>
                            </div>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <AlertTriangle size={56} className="text-red-500" />
                            <div className="text-center">
                                <p className="text-white font-bold text-lg">Ocorreu um Erro</p>
                                <p className="text-slate-500 text-sm mt-1">
                                    {finalMessage || 'O robô encontrou um problema durante a execução.'}
                                </p>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                {status !== 'running' && (
                    <div className={`px-5 py-4 border-t border-slate-800 flex justify-end ${status === 'success' ? 'bg-emerald-500/5' :
                        status === 'error' ? 'bg-red-500/5' : ''
                        }`}>
                        <button
                            onClick={onClose}
                            className={`text-white text-sm font-bold px-6 py-2 rounded-lg transition-colors ${status === 'success' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-slate-700 hover:bg-slate-600'
                                }`}
                        >
                            Fechar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BotExecutionModal;
