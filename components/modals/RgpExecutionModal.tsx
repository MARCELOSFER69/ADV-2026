import React, { useEffect, useState, useRef } from 'react';
import { Terminal, X, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

interface RgpExecutionModalProps {
    isOpen: boolean;
    onClose: () => void;
    cpf: string;
    clientId: string;
    headless: boolean;
    onSuccess?: () => void;
}

const RgpExecutionModal: React.FC<RgpExecutionModalProps> = ({ isOpen, onClose, cpf, clientId, headless, onSuccess }) => {
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

        // Inicia conexão SSE
        // Inicia conexão SSE
        // Usa timestamp para evitar cache e envia estado headless explícito
        const url = `http://localhost:3001/api/stream-rgp?id=${clientId}&cpf=${cpf}&headless=${headless}&t=${new Date().getTime()}`;

        console.log("🔌 Conectando ao Stream:", url);
        setLogs([`> Iniciando conexão com o robô (Modo ${headless ? 'Headless' : 'Visível'})...`]);
        setStatus('running');

        const es = new EventSource(url);
        eventSourceRef.current = es;

        es.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'log') {
                    setLogs(prev => [...prev, `> ${data.message}`]);
                } else if (data.type === 'success') {
                    setLogs(prev => [...prev, `✅ SUCESSO: Dados extraídos e salvos!`]);
                    setStatus('success');
                    if (onSuccess) onSuccess(); // Dispara atualização
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
            console.error("Erro na conexão SSE:", err);
            // Se o status já for success/error, ignorar erros de fechamento
            if (status !== 'success' && status !== 'error') {
                // Tenta reconectar ou finaliza com erro se for persistente?
                // EventSource tenta reconectar automaticamente, mas se o servidor fechar, ele para.
                // Mas o servidor fecha com res.end(), o que dispara readyState 2 (CLOSED).
                if (es.readyState === 2) {
                    // Fechamento normal do server-side
                } else {
                    setLogs(prev => [...prev, `⚠️ Conexão perdida. Verifique se o robô está rodando.`]);
                    setStatus('error');
                    es.close();
                }
            }
        };

        return () => {
            if (es) es.close();
        };
    }, [isOpen, clientId, cpf, headless]); // Dependências do efeito

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-[#0c0d10] border border-slate-800 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="bg-navy-900 px-4 py-3 border-b border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${status === 'running' ? 'bg-amber-500 animate-pulse' :
                            status === 'success' ? 'bg-emerald-500' :
                                status === 'error' ? 'bg-red-500' : 'bg-slate-500'
                            }`} />
                        <h3 className="font-mono text-sm font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2">
                            <Terminal size={16} />
                            {status === 'running' ? 'Executando Robô RGP...' :
                                status === 'success' ? 'Consulta Finalizada' :
                                    status === 'error' ? 'Falha na Execução' : 'Conectando...'}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={status === 'running'}
                        className="text-slate-500 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Terminal Window */}
                <div className="flex-1 p-6 overflow-y-auto font-mono text-xs space-y-1 bg-black/50 custom-scrollbar">
                    {logs.map((log, i) => (
                        <div key={i} className={`break-words ${log.includes('❌') || log.includes('ERRO') ? 'text-red-400 font-bold' :
                            log.includes('✅') || log.includes('SUCESSO') ? 'text-emerald-400 font-bold' :
                                log.includes('⚠️') ? 'text-amber-400' :
                                    'text-emerald-500/80'
                            }`}>
                            {log}
                        </div>
                    ))}
                    {status === 'running' && (
                        <div className="flex items-center gap-2 text-slate-500 mt-2">
                            <Loader2 size={12} className="animate-spin" />
                            <span className="italic">Aguardando output...</span>
                        </div>
                    )}
                    <div ref={logsEndRef} />
                </div>

                {/* Footer Status */}
                <div className={`px-4 py-3 border-t border-slate-800 flex justify-between items-center ${status === 'success' ? 'bg-emerald-500/10' :
                    status === 'error' ? 'bg-red-500/10' : 'bg-navy-900'
                    }`}>
                    <div className="flex items-center gap-2">
                        {status === 'success' && <CheckCircle2 className="text-emerald-500" size={18} />}
                        {status === 'error' && <AlertTriangle className="text-red-500" size={18} />}
                        <span className={`text-xs font-bold ${status === 'success' ? 'text-emerald-500' :
                            status === 'error' ? 'text-red-500' : 'text-slate-400'
                            }`}>
                            {status === 'success' ? 'Operação concluída com sucesso.' :
                                status === 'error' ? 'O robô encontrou um erro.' :
                                    'Mantenha esta janela aberta.'}
                        </span>
                    </div>
                    {status !== 'running' && (
                        <button
                            onClick={onClose}
                            className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors border border-slate-700"
                        >
                            Fechar
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RgpExecutionModal;
