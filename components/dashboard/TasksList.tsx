import React from 'react';
import { CheckSquare, Square } from 'lucide-react';

interface TasksListProps {
    title: string;
    tasks: any[];
    cases: any[];
    onToggleTask: (taskId: string) => void;
}

const TasksList: React.FC<TasksListProps> = ({ title, tasks, cases, onToggleTask }) => {
    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-white font-serif flex items-center gap-2">
                    <CheckSquare size={16} className="text-yellow-500" />{title}
                </h3>
            </div>
            <div className="space-y-2 overflow-y-auto custom-scrollbar flex-1 max-h-[300px] pr-1">
                {tasks.length > 0 ? tasks.map(t => {
                    const caseInfo = cases.find(c => c.id === t.case_id);
                    return (
                        <div
                            key={t.id}
                            className="flex items-start gap-3 p-3 bg-black/20 border border-white/5 rounded-xl hover:border-yellow-500/30 hover:bg-black/30 transition-colors group cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); onToggleTask(t.id); }}
                        >
                            <div className="mt-0.5 text-zinc-500 group-hover:text-yellow-500 transition-colors">
                                {t.concluido ? <CheckSquare size={16} /> : <Square size={16} />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-xs transition-all ${t.concluido ? 'text-emerald-500 line-through' : 'text-zinc-200 group-hover:text-white'}`}>
                                    {t.titulo}
                                </p>
                                {caseInfo && <p className="text-[10px] text-zinc-500 mt-1 truncate">{caseInfo.titulo}</p>}
                            </div>
                        </div>
                    );
                }) : <div className="text-center py-8 text-zinc-500 border border-dashed border-zinc-800 rounded-xl"><p className="text-xs">Todas as tarefas concluídas!</p></div>}
            </div>
        </div>
    );
};

export default React.memo(TasksList);
