import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
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
    queue?: Array<{ id: string; cpf: string; name: string; senha?: string }>;
    hideUI?: boolean;
    onError?: (msg: string) => void;
}

const BotExecutionModal: React.FC<BotExecutionModalProps> = ({
    isOpen, onClose, cpf, clientId, senha, headless, type, onSuccess, fishingData, queue, hideUI, onError
}) => {
    const [logs, setLogs] = useState<string[]>([]);
    const [status, setStatus] = useState<'connecting' | 'running' | 'success' | 'error' | 'queue_finished'>('connecting');
    const [finalMessage, setFinalMessage] = useState<string>('');
    const [currentIndex, setCurrentIndex] = useState(0);

    const logsEndRef = useRef<HTMLDivElement>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    // Determines current target based on queue or props
    const currentTarget = queue && queue.length > 0 ? queue[currentIndex] : { id: clientId, cpf, name: 'Cliente', senha };

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
            setCurrentIndex(0);
            return;
        }

        const runRobot = async () => {
            const baseUrl = type === 'rgp' ? '/api/stream-rgp' : '/api/stream-reap';
            const targetCpf = currentTarget.cpf.replace(/\D/g, '');
            let url = `http://localhost:3001${baseUrl}?id=${currentTarget.id}&cpf=${targetCpf}&headless=${headless}&t=${new Date().getTime()}`;

            if (type === 'reap' && currentTarget.senha) {
                url += `&senha=${encodeURIComponent(currentTarget.senha)}`;
            }

            if (type === 'reap' && fishingData && fishingData.length > 0) {
                url += `&fishing_data=${encodeURIComponent(JSON.stringify(fishingData))}`;
            }

            console.log("🔌 Conectando ao Stream:", url);
            const startMsg = queue
                ? `> [${currentIndex + 1}/${queue.length}] Iniciando ${type.toUpperCase()} para ${currentTarget.name}...`
                : `> Iniciando conexão com o robô ${type.toUpperCase()} (Modo ${headless ? 'Headless' : 'Visível'})...`;

            setLogs(prev => [...prev, startMsg]);
            setStatus('running');

            const es = new EventSource(url);
            eventSourceRef.current = es;

            es.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === 'log') {
                        setLogs(prev => [...prev, `> ${data.message}`]);
                    } else if (data.type === 'success') {
                        setLogs(prev => [...prev, `✅ SUCESSO: ${currentTarget.name} finalizado!`]);

                        // Proceed to next or finish
                        if (queue && currentIndex < queue.length - 1) {
                            setTimeout(() => {
                                setCurrentIndex(prev => prev + 1);
                            }, 2000);
                        } else {
                            setStatus('queue_finished');
                        }

                        if (onSuccess) onSuccess();
                        es.close();
                    } else if (data.type === 'error') {
                        setLogs(prev => [...prev, `❌ ERRO (${currentTarget.name}): ${data.message}`]);

                        // On error in queue, we might want to continue or stop. 
                        // For now, let's stop but allow next.
                        if (queue && currentIndex < queue.length - 1) {
                            setLogs(prev => [...prev, `⚠️ Pulando para o próximo devido a erro...`]);
                            setTimeout(() => {
                                setCurrentIndex(prev => prev + 1);
                            }, 3000);
                        } else {
                            setFinalMessage(data.message);
                            setStatus('error');
                        }
                        if (onError) onError(data.message);
                        es.close();
                    }
                } catch (e) {
                    console.error("Erro ao processar evento SSE:", e);
                }
            };

            es.onerror = (err) => {
                if (status !== 'success' && status !== 'error' && status !== 'queue_finished') {
                    setLogs(prev => [...prev, `⚠️ Conexão perdida para ${currentTarget.name}.`]);
                    if (queue && currentIndex < queue.length - 1) {
                        setTimeout(() => setCurrentIndex(prev => prev + 1), 3000);
                    } else {
                        setStatus('error');
                    }
                    es.close();
                }
            };
        };

        runRobot();

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, [isOpen, currentIndex, type, headless, fishingData]);

    // Auto-close if hidden
    useEffect(() => {
        if (hideUI && isOpen) {
            if (status === 'success' || status === 'queue_finished') {
                setTimeout(onClose, 500);
            } else if (status === 'error') {
                setTimeout(onClose, 2000); // Give time for parent to show toast? or just close.
            }
        }
    }, [status, hideUI, isOpen, onClose]);

    if (!isOpen || hideUI) return null;

    const progress = queue ? ((currentIndex + (status === 'queue_finished' ? 1 : 0)) / queue.length) * 100 : 100;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-[#0c0d10] border border-slate-800 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="bg-navy-900 px-5 py-4 border-b border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${status === 'running' ? 'bg-amber-500 animate-pulse' :
                            status === 'queue_finished' || status === 'success' ? 'bg-emerald-500' :
                                status === 'error' ? 'bg-red-500' : 'bg-slate-500'
                            }`} />
                        <div>
                            <h3 className="font-bold text-white text-sm uppercase tracking-wide">
                                {type === 'reap' ? 'Manutenção REAP' : 'Consulta RGP'}
                                {queue && ` (${currentIndex + 1}/${queue.length})`}
                            </h3>
                            {queue && (
                                <p className="text-[10px] text-slate-500 font-mono truncate max-w-[200px]">
                                    {status === 'queue_finished' ? 'Fila Processada' : `Atual: ${currentTarget.name}`}
                                </p>
                            )}
                        </div>
                    </div>
                    {(status !== 'running') && (
                        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Progress Bar (Queue only) */}
                {queue && (
                    <div className="w-full bg-slate-900 h-1">
                        <div
                            className="bg-gold-500 h-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}

                {/* Content - Log View */}
                <div className="flex-1 overflow-y-auto p-4 bg-black/40 font-mono text-[11px] space-y-1 custom-scrollbar min-h-[300px]">
                    {logs.map((log, i) => (
                        <div key={i} className={`${log.includes('✅') ? 'text-emerald-400' :
                            log.includes('❌') ? 'text-red-400' :
                                log.includes('🚀') ? 'text-gold-400 font-bold' :
                                    'text-slate-400'
                            }`}>
                            {log}
                        </div>
                    ))}
                    <div ref={logsEndRef} />
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-slate-800 bg-navy-900 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        {status === 'running' && (
                            <div className="flex items-center gap-2 text-gold-500 text-xs font-bold animate-pulse">
                                <Loader2 size={14} className="animate-spin" />
                                <span>EXECUTANDO...</span>
                            </div>
                        )}
                        {(status === 'queue_finished' || status === 'success') && (
                            <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold">
                                <CheckCircle2 size={14} />
                                <span>CONCLUÍDO</span>
                            </div>
                        )}
                        {status === 'error' && (
                            <div className="flex items-center gap-2 text-red-500 text-xs font-bold">
                                <AlertTriangle size={14} />
                                <span>ERRO NA FILA</span>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2">
                        {status === 'running' && (
                            <button
                                onClick={async () => {
                                    if (eventSourceRef.current) eventSourceRef.current.close();
                                    try {
                                        await fetch('http://localhost:3001/api/stop-reap', { method: 'POST' });
                                    } catch (e) { }
                                    setStatus('error');
                                    setFinalMessage('Cancelado pelo usuário.');
                                }}
                                className="bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 text-red-400 text-xs font-bold px-4 py-2 rounded-lg transition-all"
                            >
                                Parar Robô
                            </button>
                        )}
                        {status !== 'running' && (
                            <button
                                onClick={onClose}
                                className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-6 py-2 rounded-lg transition-colors"
                            >
                                Fechar
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default BotExecutionModal;
