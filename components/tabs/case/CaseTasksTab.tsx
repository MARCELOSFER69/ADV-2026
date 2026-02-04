import React, { useState } from 'react';
import { Task, CaseType } from '../../../types';
import { CheckCircle, Circle, Plus, Trash2, Maximize2, Minimize2, Check } from 'lucide-react';

interface CaseTasksTabProps {
    tasks: Task[];
    caseType: CaseType;
    onAddTask: (title: string, checklistTemplate?: string[]) => Promise<void>;
    onToggleTask: (id: string) => Promise<void>;
    onDeleteTask: (id: string) => Promise<void>;
}

const CHECKLIST_TEMPLATES: Record<CaseType, string[]> = {
    [CaseType.SEGURO_DEFESO]: ['RG e CPF do Pescador', 'Comprovante de Residência', 'Carteira de Pescador (RGP)', 'Guias de GPS (INSS)', 'Senha do GOV.BR'],
    [CaseType.SALARIO_MATERNIDADE]: ['Certidão de Nascimento da Criança', 'RG e CPF da Mãe', 'Comprovante de Residência Rural', 'Autodeclaração Rural', 'Carteirinha de Sindicato (se houver)'],
    [CaseType.APOSENTADORIA]: ['CNIS Completo', 'Carteira de Trabalho (CTPS)', 'Documentos Pessoais (RG/CPF)', 'Comprovante Rural (para segurado especial)', 'LTCAT/PPP (se especial)'],
    [CaseType.BPC_LOAS]: ['Cadastro Único (CadÚnico) Atualizado', 'RG e CPF de todos da casa', 'Laudos Médicos (Deficiência)', 'Receitas Médicas', 'Comprovante de Renda Familiar'],
    [CaseType.AUXILIO_DOENCA]: ['Laudo Médico Atualizado (< 30 dias)', 'Exames Complementares', 'Carteira de Trabalho', 'RG e CPF'],
    [CaseType.PENSAO_POR_MORTE]: ['Certidão de Óbito', 'Documentos do Falecido', 'Documentos do Requerente', 'Comprovante de Dependência'],
    [CaseType.AUXILIO_RECLUSAO]: ['Certidão de Cárcere', 'Documentos do Reeducando', 'Documentos do Dependente'],
    [CaseType.AUXILIO_ACIDENTE]: ['Laudo Médico', 'CAT (se houver)', 'Documentos Pessoais'],
    [CaseType.PENSAO_VITALICIA]: ['Provas de Dependência', 'Documentos Pessoais'],
    [CaseType.SALARIO_FAMILIA]: ['Certidão de Nascimento Filhos', 'Carteira de Vacinação', 'Comprovante Escolar'],
    [CaseType.AUXILIO_INCLUSAO]: ['Comprovante de Emprego', 'BPC Ativo', 'RG/CPF'],
    [CaseType.REVISAO]: ['Processo Administrativo', 'Novas Provas', 'Cálculo de Revisão'],
    [CaseType.CTC]: ['Requerimento CTC', 'Histórico Funcional'],
    [CaseType.RECURSO]: ['Cópia da Decisão', 'Razões do Recurso', 'Novas Provas'],
    [CaseType.TRABALHISTA]: ['Termo de Rescisão', 'Extrato FGTS', 'Contracheques'],
    [CaseType.CIVIL]: ['Procuração', 'Identidade e CPF', 'Comprovante de Residência'],
};

const CaseTasksTab: React.FC<CaseTasksTabProps> = ({ tasks, caseType, onAddTask, onToggleTask, onDeleteTask }) => {
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [isFullView, setIsFullView] = useState(false);

    const handleAdd = async () => {
        if (!newTaskTitle.trim()) return;
        await onAddTask(newTaskTitle.trim());
        setNewTaskTitle('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleAdd();
    };

    const handleApplyTemplate = async () => {
        const template = CHECKLIST_TEMPLATES[caseType] || [];
        if (template.length === 0) return;

        // Add items sequentially
        for (const item of template) {
            // Check if already exists to avoid duplicates (optional, but good UX)
            // For now, just add them as requested
            await onAddTask(item);
        }
    };

    const completedCount = tasks.filter(t => t.concluido).length;
    const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

    return (
        <div className={`space-y-4 transition-all duration-300 ${isFullView ? 'fixed inset-4 z-[99999] bg-[#131418] p-6 rounded-2xl border border-white/10 shadow-2xl overflow-y-auto' : ''}`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <CheckCircle size={20} className="text-gold-500" />
                        Checklist
                    </h3>
                    {tasks.length > 0 && (
                        <div className="flex items-center gap-2 bg-[#18181b] px-3 py-1 rounded-full border border-white/5">
                            <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-gold-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                            </div>
                            <span className="text-[10px] font-bold text-zinc-400">{Math.round(progress)}%</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {tasks.length === 0 && CHECKLIST_TEMPLATES[caseType] && (
                        <button
                            onClick={handleApplyTemplate}
                            className="text-xs text-gold-500 hover:text-gold-400 underline mr-2"
                        >
                            Usar Modelo Padrão
                        </button>
                    )}
                    <button onClick={() => setIsFullView(!isFullView)} className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors">
                        {isFullView ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>
                </div>
            </div>

            {/* Input de Nova Tarefa */}
            <div className="flex gap-2">
                <input
                    className="flex-1 bg-[#18181b] border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:border-gold-500 outline-none placeholder:text-zinc-600"
                    placeholder="Adicionar item ao checklist..."
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <button
                    onClick={handleAdd}
                    disabled={!newTaskTitle.trim()}
                    className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Plus size={20} />
                </button>
            </div>

            {/* Lista de Tarefas */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {tasks.length === 0 ? (
                    <div className="text-center py-8 text-zinc-600 italic text-sm">Nenhum item no checklist.</div>
                ) : tasks.map(task => (
                    <div
                        key={task.id}
                        className={`group flex items-center justify-between p-3 rounded-lg border transition-all ${task.concluido
                            ? 'bg-[#18181b]/50 border-white/5 opacity-60'
                            : 'bg-[#18181b] border-white/5 hover:border-gold-500/30'
                            }`}
                    >
                        <div
                            className="flex items-center gap-3 cursor-pointer flex-1"
                            onClick={() => onToggleTask(task.id)}
                        >
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${task.concluido
                                ? 'bg-gold-500 border-gold-500 text-black'
                                : 'border-zinc-600 group-hover:border-gold-500 text-transparent'
                                }`}>
                                <Check size={12} strokeWidth={3} />
                            </div>
                            <span className={`text-sm transition-all ${task.concluido ? 'text-zinc-500 line-through' : 'text-zinc-200'
                                }`}>
                                {task.titulo}
                            </span>
                        </div>
                        <button
                            onClick={() => onDeleteTask(task.id)}
                            className="p-1.5 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CaseTasksTab;
