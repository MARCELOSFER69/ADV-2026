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
import { Case, CaseStatus } from '../../types';
import CaseKanbanCard from '../CaseKanbanCard';
import { formatCurrency } from '../../services/formatters';
import { getStatusHeaderColor } from '../../utils/caseUtils';

interface CaseKanbanBoardProps {
    cases: Case[];
    columns: CaseStatus[];
    onCaseDrop: (caseId: string, newStatus: CaseStatus) => Promise<void>;
    onCardClick: (c: Case) => void;
    onArchiveClick: (c: Case) => void;
    columnWidth: number;
    setColumnWidth: (width: number) => void;
    cardScale: number;
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
    cardScale
}) => {
    const [activeDragCase, setActiveDragCase] = useState<Case | null>(null);

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
                        const columnCases = cases.filter(c => c.status === status);
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
                                <div className="mb-4 px-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-black text-slate-300 flex items-center gap-2 text-[10px] uppercase tracking-widest">
                                            <span className={`w-2 h-2 rounded-full ${getStatusHeaderColor(status)} shadow-[0_0_8px_currentColor]`} />
                                            {status}
                                        </h3>
                                        <span className="text-[10px] font-bold text-slate-400 bg-[#18181b] border border-white/10 px-2.5 py-1 rounded-lg">
                                            {columnCases.length}
                                        </span>
                                    </div>
                                    <div className="pl-4">
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
