import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Case, CaseStatus } from '../types';
import { AlertCircle, CheckCircle2, Circle, Clock, FileText, X } from 'lucide-react';
import { formatCurrencyInput } from '../services/formatters';

// Mapeamento de Cores e Ícones por Status
const STATUS_CONFIG: Record<string, { color: string, border: string, bg: string, icon: any }> = {
    [CaseStatus.ANALISE]: { color: 'text-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-500/10', icon: Circle },
    [CaseStatus.EXIGENCIA]: { color: 'text-orange-400', border: 'border-orange-500/30', bg: 'bg-orange-500/10', icon: AlertCircle },
    [CaseStatus.AGUARDANDO_AUDIENCIA]: { color: 'text-yellow-400', border: 'border-yellow-500/30', bg: 'bg-yellow-500/10', icon: Clock },
    [CaseStatus.EM_RECURSO]: { color: 'text-purple-400', border: 'border-purple-500/30', bg: 'bg-purple-500/10', icon: FileText },
    [CaseStatus.CONCLUIDO_CONCEDIDO]: { color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', icon: CheckCircle2 },
    [CaseStatus.CONCLUIDO_INDEFERIDO]: { color: 'text-red-400', border: 'border-red-500/30', bg: 'bg-red-500/10', icon: X },
};

// Colunas que queremos exibir no Kanban (nessa ordem)
const KANBAN_COLUMNS = [
    CaseStatus.ANALISE,
    CaseStatus.EXIGENCIA,
    CaseStatus.AGUARDANDO_AUDIENCIA,
    CaseStatus.EM_RECURSO,
    CaseStatus.CONCLUIDO_CONCEDIDO
];

interface KanbanBoardProps {
    onCaseClick: (c: Case) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ onCaseClick }) => {
    const { cases, clients, updateCase, showToast } = useApp();
    
    // Estado para Drag and Drop
    const [draggedCaseId, setDraggedCaseId] = useState<string | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

    // Estado para Confirmação
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [pendingMove, setPendingMove] = useState<{ caseId: string, newStatus: CaseStatus } | null>(null);

    // Organiza os processos nas colunas
    const columns = useMemo(() => {
        const cols: Record<string, Case[]> = {};
        KANBAN_COLUMNS.forEach(status => cols[status] = []);
        
        // Adiciona "Outros" para status que não estão nas colunas principais (opcional)
        // cols['OUTROS'] = [];

        cases.forEach(c => {
            if (KANBAN_COLUMNS.includes(c.status)) {
                cols[c.status].push(c);
            }
            // Se quiser exibir arquivados ou indeferidos, adicione lógica aqui
        });
        return cols;
    }, [cases]);

    // --- HANDLERS DE DRAG AND DROP ---

    const handleDragStart = (e: React.DragEvent, caseId: string) => {
        setDraggedCaseId(caseId);
        e.dataTransfer.effectAllowed = 'move';
        // Hack para esconder a imagem fantasma padrão se quiser customizar, ou deixar padrão
    };

    const handleDragOver = (e: React.DragEvent, status: string) => {
        e.preventDefault(); // Necessário para permitir o Drop
        setDragOverColumn(status);
    };

    const handleDrop = (e: React.DragEvent, newStatus: CaseStatus) => {
        e.preventDefault();
        setDragOverColumn(null);
        
        if (!draggedCaseId) return;

        const caseItem = cases.find(c => c.id === draggedCaseId);
        if (caseItem && caseItem.status !== newStatus) {
            // Abre Modal de Confirmação
            setPendingMove({ caseId: draggedCaseId, newStatus });
            setConfirmModalOpen(true);
        }
        setDraggedCaseId(null);
    };

    const confirmMove = async () => {
        if (pendingMove) {
            const caseItem = cases.find(c => c.id === pendingMove.caseId);
            if (caseItem) {
                await updateCase({ ...caseItem, status: pendingMove.newStatus }, `Status alterado via Kanban para ${pendingMove.newStatus}`);
                showToast('success', `Movido para ${pendingMove.newStatus}`);
            }
        }
        setConfirmModalOpen(false);
        setPendingMove(null);
    };

    return (
        <div className="h-full overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-[1200px] h-full"> {/* Container Largo */}
                
                {KANBAN_COLUMNS.map(status => {
                    const config = STATUS_CONFIG[status] || STATUS_CONFIG[CaseStatus.ANALISE];
                    const Icon = config.icon;
                    const items = columns[status] || [];
                    const isOver = dragOverColumn === status;

                    return (
                        <div 
                            key={status}
                            onDragOver={(e) => handleDragOver(e, status)}
                            onDrop={(e) => handleDrop(e, status as CaseStatus)}
                            className={`flex-1 min-w-[280px] flex flex-col rounded-xl border transition-colors duration-200 ${isOver ? 'bg-zinc-800/80 border-yellow-600/50' : 'bg-[#0f1014] border-zinc-800'}`}
                        >
                            {/* Header da Coluna */}
                            <div className={`p-3 border-b border-zinc-800 flex justify-between items-center ${config.bg} rounded-t-xl`}>
                                <div className="flex items-center gap-2">
                                    <Icon size={16} className={config.color} />
                                    <h3 className={`text-xs font-bold uppercase tracking-wider ${config.color}`}>{status}</h3>
                                </div>
                                <span className="bg-black/30 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{items.length}</span>
                            </div>

                            {/* Área de Cards */}
                            <div className="flex-1 p-2 overflow-y-auto custom-scrollbar space-y-2">
                                {items.map(c => {
                                    const client = clients.find(cli => cli.id === c.client_id);
                                    return (
                                        <div
                                            key={c.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, c.id)}
                                            onClick={() => onCaseClick(c)}
                                            className="bg-zinc-900 p-3 rounded-lg border border-zinc-700 hover:border-yellow-600 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all group"
                                        >
                                            <h4 className="text-sm font-bold text-zinc-200 mb-1 group-hover:text-white line-clamp-2 leading-tight">{c.titulo}</h4>
                                            <p className="text-xs text-zinc-500 mb-2">{client?.nome_completo || 'Cliente Desconhecido'}</p>
                                            
                                            <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
                                                <span className="text-[10px] font-mono text-zinc-600 bg-black/40 px-1.5 py-0.5 rounded">{c.numero_processo || 'S/N'}</span>
                                                {c.valor_causa > 0 && (
                                                    <span className="text-[10px] font-bold text-emerald-600">
                                                        R$ {c.valor_causa.toLocaleString('pt-BR', { notation: 'compact' })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                {items.length === 0 && (
                                    <div className="h-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                        <p className="text-[10px] text-zinc-600 uppercase font-bold border-2 border-dashed border-zinc-800 p-4 rounded-lg">Arraste aqui</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* MODAL DE CONFIRMAÇÃO */}
            {confirmModalOpen && pendingMove && (
                <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
                    <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-xl max-w-sm w-full shadow-2xl">
                        <h3 className="text-lg font-bold text-white mb-2">Confirmar Movimentação</h3>
                        <p className="text-zinc-400 text-sm mb-6">
                            Deseja mover este processo para <strong>{pendingMove.newStatus}</strong>?
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button 
                                onClick={() => setConfirmModalOpen(false)} 
                                className="px-4 py-2 text-zinc-300 hover:text-white text-sm font-medium"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={confirmMove} 
                                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-bold shadow-lg"
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KanbanBoard;
