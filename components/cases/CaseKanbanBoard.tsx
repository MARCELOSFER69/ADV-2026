// Kanban Board para gestão de processos jurídicos
import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
    DndContext,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
    defaultDropAnimationSideEffects,
    useDroppable,
    closestCorners,
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Case, CaseStatus, CaseType, RetirementCandidate, Client } from '../../types';
import CaseKanbanCard from '../CaseKanbanCard';
import { formatCurrency } from '../../services/formatters';
import { getStatusHeaderColor } from '../../utils/caseUtils';
import { calculateRetirementProjection } from '../../utils/retirementUtils';

interface CaseKanbanBoardProps {
    cases: Case[];
    columns: CaseStatus[];
    onCaseDrop: (caseId: string, newStatus: CaseStatus) => Promise<void>;
    onCardClick: (c: Case) => void;
    onArchiveClick: (c: Case) => void;
    columnWidth: number;
    setColumnWidth: (width: number) => void;
    cardScale: number;
    onProjectionClick?: (candidate: RetirementCandidate) => void;
    onUpdateClient?: (updatedClient: Client) => Promise<void>;
    onUpdateCase?: (updatedCase: Case) => Promise<void>;
    situationFilters?: string[];
    activeTypeFilter?: string;
}

const KanbanColumn: React.FC<{
    status: CaseStatus;
    columnWidth: number;
    onColumnResizeDown: (e: React.MouseEvent) => void;
    children: React.ReactNode;
}> = ({ status, columnWidth, onColumnResizeDown, children }) => {
    const { setNodeRef } = useDroppable({
        id: status,
    });

    return (
        <div
            ref={setNodeRef}
            className="flex-shrink-0 flex flex-col h-full relative group/col"
            style={{ width: `${columnWidth}px` }}
        >
            {children}
            {/* Resize Handle */}
            <div
                onMouseDown={onColumnResizeDown}
                className="absolute right-[-12px] top-0 bottom-0 w-[6px] cursor-col-resize hover:bg-gold-500/50 transition-colors z-20 group-hover/col:bg-zinc-800/50 flex items-center justify-center"
                title="Arraste para redimensionar coluna"
            >
                <div className="w-[1px] h-10 bg-zinc-700 group-hover:bg-gold-500/50" />
            </div>
        </div>
    );
};

const CaseKanbanBoard: React.FC<CaseKanbanBoardProps> = ({
    cases,
    columns,
    // clients, // REMOVED
    onCaseDrop,
    onCardClick,
    onArchiveClick,
    columnWidth,
    setColumnWidth,
    cardScale,
    onProjectionClick,
    onUpdateClient,
    onUpdateCase,
    situationFilters = [],
    activeTypeFilter = 'all'
}) => {
    const [activeDragCase, setActiveDragCase] = useState<Case | null>(null);
    const [protocolarFilter, setProtocolarFilter] = useState<{ eligible: boolean, notEligible: boolean }>({
        eligible: true,
        notEligible: true
    });

    // --- REMOVED: Client Lookup Map (Now using case fields directly) ---
    // const clientMap = useMemo(...);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const kanbanContainerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [isResizing, setIsResizing] = useState(false);

    // --- SCROLLING LOGIC ---
    useEffect(() => {
        const container = kanbanContainerRef.current;
        if (!container) return;

        const handleNativeWheel = (e: WheelEvent) => {
            const isInsideColumn = (e.target as HTMLElement).closest('.kanban-column-scroll');
            if (isInsideColumn) {
                const column = isInsideColumn as HTMLElement;
                if (column.scrollHeight > column.clientHeight) return;
            }
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                e.preventDefault();
                container.scrollLeft += e.deltaY;
            }
        };

        container.addEventListener('wheel', handleNativeWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleNativeWheel);
    }, []);

    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('.kanban-card')) return;
        setIsDragging(true);
        setStartX(e.pageX - (kanbanContainerRef.current?.offsetLeft || 0));
        setScrollLeft(kanbanContainerRef.current?.scrollLeft || 0);
    };

    const handleMouseLeave = () => setIsDragging(false);
    const handleMouseUp = () => setIsDragging(false);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !kanbanContainerRef.current) return;
        e.preventDefault();
        const x = e.pageX - (kanbanContainerRef.current.offsetLeft || 0);
        const walk = (x - startX) * 2;
        kanbanContainerRef.current.scrollLeft = scrollLeft - walk;
    };

    // --- RESIZE LOGIC ---
    const handleColumnResizeDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
        const startX = e.pageX;
        const startWidth = columnWidth;

        const handleMouseMoveResize = (moveEvent: MouseEvent) => {
            const currentX = moveEvent.pageX;
            const newWidth = Math.max(250, Math.min(600, startWidth + (currentX - startX)));
            setColumnWidth(newWidth);
        };

        const handleMouseUpResize = () => {
            setIsResizing(false);
            window.removeEventListener('mousemove', handleMouseMoveResize);
            window.removeEventListener('mouseup', handleMouseUpResize);
        };

        window.addEventListener('mousemove', handleMouseMoveResize);
        window.addEventListener('mouseup', handleMouseUpResize);
    };


    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const caseItem = active.data.current?.caseItem;
        if (caseItem) setActiveDragCase(caseItem);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragCase(null);

        if (!over) return;

        const caseId = active.id as string;

        // Se soltar sobre outro card, o 'over.id' é o ID do card.
        // Precisamos pegar o container (coluna) desse card.
        // O dnd-kit fornece isso em data.current.sortable.containerId
        const newStatus = (over.data.current?.sortable?.containerId || over.id) as CaseStatus;

        const draggedCase = cases.find(c => c.id === caseId);
        if (draggedCase && draggedCase.status !== newStatus) {
            await onCaseDrop(caseId, newStatus);
        }
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div
                ref={kanbanContainerRef}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                className={`flex-1 overflow-x-auto pb-4 custom-scrollbar select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                style={{ '--kanban-card-scale': cardScale } as any}
            >
                <div className="flex gap-6 min-w-max h-full px-2">
                    {columns.map((status) => {
                        let columnCases = cases.filter(c => c.status === status);

                        // Aplica filtro específico para "A Protocolar"
                        if (status === CaseStatus.PROTOCOLAR) {
                            columnCases = columnCases.filter(c => {
                                const isApos = String(c.tipo).toLowerCase().includes('aposentadoria') || c.tipo === CaseType.APOSENTADORIA;
                                if (!isApos) return true; // Não filtra casos que não são aposentadoria

                                const proj = calculateRetirementProjection(c.client_birth_date, c.client_sexo, (c.modalidade || (c as any).aposentadoria_modalidade) as any);
                                const isEligible = proj?.isEligible || false;
                                const yearsRemaining = proj?.yearsRemaining || 999;



                                // 1. Filtro antigo de botões (Mantido por compatibilidade ou removido se não for usar)
                                if (protocolarFilter.eligible && protocolarFilter.notEligible && situationFilters.length === 0) return true;

                                // 2. Novo Filtro de Situação (Múltipla Escolha)
                                if (situationFilters.length > 0) {
                                    let matchSituation = false;
                                    // Broaden check: Match if yearsRemaining is ~0 OR if generally eligible (isEligible flag)
                                    if (situationFilters.includes('Já elegível') && (yearsRemaining <= 0.001 || isEligible)) matchSituation = true;
                                    if (situationFilters.includes('Menos de 1 ano') && yearsRemaining <= 1 && yearsRemaining > 0.001) matchSituation = true;
                                    if (situationFilters.includes('Menos de 2 anos') && yearsRemaining <= 2 && yearsRemaining > 0.001) matchSituation = true;
                                    if (situationFilters.includes('Menos de 3 anos') && yearsRemaining <= 3 && yearsRemaining > 0.001) matchSituation = true;
                                    if (situationFilters.includes('Menos de 4 anos') && yearsRemaining <= 4 && yearsRemaining > 0.001) matchSituation = true;
                                    if (situationFilters.includes('Menos de 5 anos') && yearsRemaining <= 5 && yearsRemaining > 0.001) matchSituation = true;

                                    return matchSituation;
                                }

                                // Fallback para o filtro antigo se nada selecionado no novo
                                if (protocolarFilter.eligible && isEligible) return true;
                                if (protocolarFilter.notEligible && !isEligible) return true;
                                return false;
                            });
                        }

                        // Custom sorting for "A Protocolar" column: Retirement projections first
                        if (status === CaseStatus.PROTOCOLAR) {
                            columnCases = [...columnCases].sort((a, b) => {
                                const isAposA = String(a.tipo).toLowerCase().includes('aposentadoria') || a.tipo === CaseType.APOSENTADORIA;
                                const isAposB = String(b.tipo).toLowerCase().includes('aposentadoria') || b.tipo === CaseType.APOSENTADORIA;

                                if (isAposA && isAposB) {
                                    const projA = calculateRetirementProjection(a.client_birth_date, a.client_sexo, (a.modalidade || (a as any).aposentadoria_modalidade) as any);
                                    const projB = calculateRetirementProjection(b.client_birth_date, b.client_sexo, (b.modalidade || (b as any).aposentadoria_modalidade) as any);
                                    const valA = projA ? projA.yearsRemaining : 999;
                                    const valB = projB ? projB.yearsRemaining : 999;
                                    return valA - valB;
                                }
                                if (isAposA) return -1;
                                if (isAposB) return 1;
                                return 0;
                            });
                        }

                        const totalColumnValue = columnCases.reduce((acc, curr) => acc + curr.valor_causa, 0);

                        // Performance optimization: limit rendered cards to 50
                        const RENDER_LIMIT = 50;
                        const visibleCases = columnCases.slice(0, RENDER_LIMIT);

                        return (
                            <KanbanColumn
                                key={status}
                                status={status}
                                columnWidth={columnWidth}
                                onColumnResizeDown={handleColumnResizeDown}
                            >
                                {/* PREMIUM HEADER */}
                                <div className="mb-4 px-1 relative group/header">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-black text-slate-300 flex items-center gap-2 text-[10px] uppercase tracking-widest">
                                                <span className={`w-2 h-2 rounded-full ${getStatusHeaderColor(status)} shadow-[0_0_8px_currentColor]`} />
                                                {status}
                                            </h3>

                                            {/* Filter Toggle (Protocolar only) */}
                                            {status === CaseStatus.PROTOCOLAR && activeTypeFilter === 'Aposentadoria' && (
                                                <div className="flex items-center gap-1 opacity-0 group-hover/header:opacity-100 transition-all duration-300 ml-2 scale-90 origin-left">
                                                    <button
                                                        onClick={() => setProtocolarFilter(prev => {
                                                            const next = !prev.eligible;
                                                            if (!next && !prev.notEligible) return prev;
                                                            return { ...prev, eligible: next };
                                                        })}
                                                        className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter transition-all ${protocolarFilter.eligible ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                                                    >
                                                        Elegível
                                                    </button>
                                                    <button
                                                        onClick={() => setProtocolarFilter(prev => {
                                                            const next = !prev.notEligible;
                                                            if (!next && !prev.eligible) return prev;
                                                            return { ...prev, notEligible: next };
                                                        })}
                                                        className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter transition-all ${protocolarFilter.notEligible ? 'bg-gold-500 text-black' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                                                    >
                                                        Restante
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 bg-[#18181b] border border-white/10 px-2.5 py-1 rounded-lg">
                                            {columnCases.length}
                                        </span>
                                    </div>
                                    <div className="pl-4 text-left">
                                        <p className={`text-xs font-bold ${totalColumnValue > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>
                                            {totalColumnValue > 0 ? formatCurrency(totalColumnValue) : 'R$ 0,00'}
                                            {totalColumnValue > 0 && <span className="text-[9px] text-slate-500 ml-1 font-normal uppercase tracking-wider">Potencial</span>}
                                        </p>
                                    </div>
                                </div>

                                <SortableContext
                                    id={status}
                                    items={columnCases.map(c => c.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div
                                        className={`kanban-column-scroll bg-zinc-900/20 p-2 rounded-xl flex-1 border border-dashed border-zinc-800 overflow-y-auto max-h-[calc(100vh-220px)] custom-scrollbar`}
                                        style={{ zoom: cardScale }}
                                    >
                                        <div className="space-y-3 min-h-[100px]">
                                            {visibleCases.map(caseItem => {
                                                // Real client data from view_cases_dashboard
                                                const client = {
                                                    id: caseItem.client_id,
                                                    nome_completo: caseItem.client_name || 'Desconhecido'
                                                } as any;
                                                return (
                                                    <CaseKanbanCard
                                                        key={caseItem.id}
                                                        caseItem={caseItem}
                                                        client={client}
                                                        onClick={onCardClick}
                                                        onArchiveClick={onArchiveClick}
                                                        onProjectionClick={onProjectionClick}
                                                        onUpdateClient={onUpdateClient}
                                                        onUpdateCase={onUpdateCase}
                                                    />
                                                );
                                            })}
                                            {columnCases.length > RENDER_LIMIT && (
                                                <div className="text-center py-4 text-zinc-500 text-[10px] uppercase tracking-widest opacity-60">
                                                    + {columnCases.length - RENDER_LIMIT} processos ocultos (vistos na Lista)
                                                </div>
                                            )}
                                            {columnCases.length === 0 && <div className="text-center py-12 text-zinc-600 text-xs italic opacity-50">Sem processos</div>}
                                        </div>
                                    </div>
                                </SortableContext>
                            </KanbanColumn>
                        );
                    })}
                </div>
            </div>

            <DragOverlay dropAnimation={{
                sideEffects: defaultDropAnimationSideEffects({
                    styles: {
                        active: {
                            opacity: '0.5',
                        },
                    },
                }),
            }}>
                {activeDragCase ? (
                    <CaseKanbanCard
                        caseItem={activeDragCase}
                        client={{ id: activeDragCase.client_id, nome_completo: activeDragCase.client_name || '...' } as any}
                        onClick={() => { }}
                        onArchiveClick={() => { }}
                    />
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};

export default CaseKanbanBoard;
