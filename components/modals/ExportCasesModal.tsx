import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Check, Download, Loader2, History, Trash2, Calendar, User as UserIcon, ChevronDown, ChevronRight, MessageSquare, ArrowLeft } from 'lucide-react';
import ConfirmModal from '../ui/ConfirmModal';
import * as XLSX from 'xlsx';
import { Case, CaseStatus, CaseType, GeneratedReport, CaseNote, RetirementCandidate } from '../../types';
import { calculateRetirementProjection } from '../../utils/retirementUtils';
import { fetchAllFilteredCasesData, fetchCaseNotes } from '../../services/casesService';
import { uploadReportToCloud, fetchUserReports, deleteReport as deleteReportService } from '../../services/reportsService';
import { formatDateDisplay } from '../../utils/dateUtils';
import { formatCPFOrCNPJ } from '../../services/formatters';
import { useApp } from '../../context/AppContext';

interface ExportCasesModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentFilters: any;
    searchTerm: string;
    showToast: (type: 'success' | 'error', message: string) => void;
    retirementCandidates?: RetirementCandidate[];
}

interface CaseWithNotes extends Case {
    notes: CaseNote[];
}

const REPORT_COLUMNS = [
    { id: 'client_name', label: 'Nome do Cliente', default: true },
    { id: 'client_cpf', label: 'CPF', default: true },
    { id: 'numero_processo', label: 'Número de Protocolo', default: true },
    { id: 'status', label: 'Situação Processual', default: true },
    { id: 'anotacoes', label: 'Observações/Anotações', default: true },
    { id: 'data_nascimento', label: 'Ano de Nascimento / Idade', default: true },
    { id: 'cidade', label: 'Cidade', default: true },
    { id: 'filial', label: 'Filial', default: true },
    { id: 'captador', label: 'Captador', default: true },
    // Retirement specific
    { id: 'proj_tempo', label: 'Projeção (Tempo)', default: false },
    { id: 'proj_modalidade', label: 'Modalidade (Incluso no Card)', default: false },
];

const calculateAge = (birthDate: string | undefined): string => {
    if (!birthDate) return 'N/A';
    try {
        const birth = new Date(birthDate);
        if (isNaN(birth.getTime())) return 'N/A';

        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }

        const formattedDate = formatDateDisplay(birthDate);
        return `${formattedDate} - ${age} anos`;
    } catch (e) {
        return 'N/A';
    }
};

const ExportCasesModal: React.FC<ExportCasesModalProps> = ({
    isOpen,
    onClose,
    currentFilters,
    searchTerm,
    showToast,
    retirementCandidates
}) => {
    const { user } = useApp();
    const [activeTab, setActiveTab] = useState<'generate' | 'history'>('generate');
    const [selectedCols, setSelectedCols] = useState<string[]>(REPORT_COLUMNS.filter(c => c.default).map(c => c.id));
    const [isExporting, setIsExporting] = useState(false);
    const [reports, setReports] = useState<GeneratedReport[]>([]);
    const [isLoadingReports, setIsLoadingReports] = useState(false);

    // Multi-step flow states
    const [step, setStep] = useState<1 | 2>(1);
    const [isLoadingNotes, setIsLoadingNotes] = useState(false);
    const [casesWithNotes, setCasesWithNotes] = useState<CaseWithNotes[]>([]);
    const [expandedCases, setExpandedCases] = useState<Set<string>>(new Set());
    const [selectedNotes, setSelectedNotes] = useState<Record<string, Set<string>>>({}); // caseId -> Set of noteIds

    // Delete Confirmation State
    const [reportToDelete, setReportToDelete] = useState<GeneratedReport | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Carregar histórico quando mudar para a aba de histórico
    React.useEffect(() => {
        if (activeTab === 'history' && user?.id) {
            loadReports();
        }
    }, [activeTab, user?.id]);

    // Reset step when closing/opening
    React.useEffect(() => {
        if (!isOpen) {
            setStep(1);
            setCasesWithNotes([]);
            setExpandedCases(new Set());
            setSelectedNotes({});
        }
    }, [isOpen]);

    const loadReports = async () => {
        if (!user?.id) return;
        setIsLoadingReports(true);
        try {
            const data = await fetchUserReports(user.id);
            setReports(data);
        } catch (error) {
            console.error('Erro ao carregar relatórios:', error);
            showToast('error', 'Erro ao carregar histórico de relatórios.');
        } finally {
            setIsLoadingReports(false);
        }
    };

    const handleDeleteClick = (report: GeneratedReport) => {
        setReportToDelete(report);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteReport = async () => {
        if (!reportToDelete) return;

        try {
            await deleteReportService(reportToDelete);
            setReports(prev => prev.filter(r => r.id !== reportToDelete.id));
            showToast('success', 'Relatório excluído com sucesso.');
        } catch (error) {
            console.error('Erro ao excluir relatório:', error);
            showToast('error', 'Erro ao excluir relatório.');
        } finally {
            setIsDeleteModalOpen(false);
            setReportToDelete(null);
        }
    };

    const handleToggleCol = (id: string) => {
        setSelectedCols(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
    };

    const handleSelectAll = () => {
        if (selectedCols.length === REPORT_COLUMNS.length) {
            setSelectedCols([]);
        } else {
            setSelectedCols(REPORT_COLUMNS.map(c => c.id));
        }
    };

    const handleNextStep = async () => {
        if (selectedCols.length === 0) {
            showToast('error', 'Selecione pelo menos uma coluna.');
            return;
        }

        // Se anotações não está selecionado, vai direto para export
        if (!selectedCols.includes('anotacoes')) {
            handleExport();
            return;
        }

        // Carrega os cases com suas anotações
        setIsLoadingNotes(true);
        try {
            const allCases = await fetchAllFilteredCasesData(searchTerm, currentFilters);

            if (allCases.length === 0) {
                showToast('error', 'Nenhum processo encontrado com os filtros atuais.');
                setIsLoadingNotes(false);
                return;
            }

            const casesData = await Promise.all(
                allCases.map(async (c) => {
                    try {
                        const notes = await fetchCaseNotes(c.id);
                        return { ...c, notes } as CaseWithNotes;
                    } catch {
                        return { ...c, notes: [] } as CaseWithNotes;
                    }
                })
            );

            // Filtra só os que têm anotações
            const casesWithAnyNotes = casesData.filter(c => c.notes.length > 0);

            if (casesWithAnyNotes.length === 0) {
                showToast('error', 'Nenhuma anotação encontrada nos processos filtrados.');
                // Mesmo sem anotações, permite continuar
            }

            setCasesWithNotes(casesData);

            // Por padrão, todas as notas vão selecionadas
            const defaultSelection: Record<string, Set<string>> = {};
            casesData.forEach(c => {
                if (c.notes.length > 0) {
                    defaultSelection[c.id] = new Set(c.notes.map(n => n.id));
                }
            });
            setSelectedNotes(defaultSelection);

            setStep(2);
        } catch (error) {
            console.error('Erro ao carregar anotações:', error);
            showToast('error', 'Erro ao carregar anotações dos processos.');
        } finally {
            setIsLoadingNotes(false);
        }
    };

    const toggleCaseExpanded = (caseId: string) => {
        setExpandedCases(prev => {
            const newSet = new Set(prev);
            if (newSet.has(caseId)) {
                newSet.delete(caseId);
            } else {
                newSet.add(caseId);
            }
            return newSet;
        });
    };

    const toggleNoteSelection = (caseId: string, noteId: string) => {
        setSelectedNotes(prev => {
            const caseNotes = prev[caseId] || new Set();
            const newCaseNotes = new Set(caseNotes);
            if (newCaseNotes.has(noteId)) {
                newCaseNotes.delete(noteId);
            } else {
                newCaseNotes.add(noteId);
            }
            return { ...prev, [caseId]: newCaseNotes };
        });
    };

    const toggleAllNotesForCase = (caseId: string, notes: CaseNote[]) => {
        setSelectedNotes(prev => {
            const caseNotes = prev[caseId] || new Set();
            const allSelected = notes.every(n => caseNotes.has(n.id));

            if (allSelected) {
                // Deseleciona todas
                return { ...prev, [caseId]: new Set() };
            } else {
                // Seleciona todas
                return { ...prev, [caseId]: new Set(notes.map(n => n.id)) };
            }
        });
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            let dataToExport: CaseWithNotes[];

            if (retirementCandidates && retirementCandidates.length > 0) {
                // Exportando candidatos a aposentadoria (projeções)
                dataToExport = retirementCandidates.map(rc => ({
                    ...rc.client,
                    id: rc.client.id,
                    client_id: rc.client.id,
                    client_name: rc.client.nome_completo,
                    client_cpf: rc.client.cpf_cnpj,
                    client_birth_date: rc.client.data_nascimento,
                    client_sexo: rc.client.sexo,
                    filial: rc.client.filial,
                    captador: rc.client.captador,
                    // Garante que a modalidade usada no card seja exportada
                    aposentadoria_modalidade: rc.client.aposentadoria_modalidade || rc.bestChance,
                    notes: []
                })) as any;
            } else if (step === 2) {
                // Usa os dados já carregados
                dataToExport = casesWithNotes;
            } else {
                // Busca os dados novamente (caso não tenha passado pelo step 2)
                const allCases = await fetchAllFilteredCasesData(searchTerm, currentFilters);
                dataToExport = allCases.map(c => ({ ...c, notes: [] })) as CaseWithNotes[];
            }

            if (dataToExport.length === 0) {
                showToast('error', 'Nenhum processo encontrado.');
                setIsExporting(false);
                return;
            }

            const exportData = dataToExport.map(c => {
                const row: any = {};
                selectedCols.forEach(colId => {
                    const colLabel = REPORT_COLUMNS.find(rc => rc.id === colId)?.label || colId;
                    let value: any = '';

                    switch (colId) {
                        case 'client_name': value = c.client_name || 'N/A'; break;
                        case 'client_cpf': value = c.client_cpf ? formatCPFOrCNPJ(c.client_cpf) : 'N/A'; break;
                        case 'numero_processo': value = c.numero_processo || 'N/A'; break;
                        case 'status': value = c.status || 'N/A'; break;
                        case 'anotacoes':
                            // Pega só as anotações selecionadas, só o conteúdo (sem data/usuário)
                            const caseSelectedNotes = selectedNotes[c.id] || new Set();
                            const selectedNoteTexts = c.notes
                                .filter(n => caseSelectedNotes.size === 0 || caseSelectedNotes.has(n.id))
                                .map(n => n.conteudo);
                            value = selectedNoteTexts.join(' | ');
                            break;
                        case 'data_nascimento': value = calculateAge(c.client_birth_date); break;
                        case 'cidade': value = c.client_city || 'N/A'; break;
                        case 'filial': value = c.filial || 'N/A'; break;
                        case 'captador': value = c.captador || 'N/A'; break;
                        // Simplified Retirement Specific
                        case 'proj_tempo': {
                            const birthDate = c.client_birth_date || (c as any).data_nascimento;
                            const sexo = c.client_sexo || (c as any).sexo;
                            const mod = (c as any).modalidade || (c as any).aposentadoria_modalidade;
                            if (!birthDate || !sexo) { value = 'N/A'; break; }
                            const proj = calculateRetirementProjection(birthDate, sexo as any, mod);
                            if (!proj) { value = 'N/A'; break; }

                            const remaining = proj.yearsRemaining;
                            if (remaining <= 0) {
                                value = 'Elegível';
                            } else {
                                const y = Math.floor(remaining);
                                const m = Math.floor((remaining - y) * 12);
                                value = y > 0 ? `${y}a ${m}m` : `${m}m`;
                            }
                            break;
                        }
                        case 'proj_modalidade': {
                            const mod = (c as any).modalidade || (c as any).aposentadoria_modalidade;
                            if (mod) {
                                value = mod;
                            } else {
                                // Se não tem modalidade fixa, tenta pegar a best chance do cálculo
                                const birthDate = c.client_birth_date || (c as any).data_nascimento;
                                const sexo = c.client_sexo || (c as any).sexo;
                                if (birthDate && sexo) {
                                    const proj = calculateRetirementProjection(birthDate, sexo as any);
                                    value = proj?.bestChance || 'N/A';
                                } else {
                                    value = 'N/A';
                                }
                            }
                            break;
                        }
                        default: value = (c as any)[colId] || '';
                    }
                    row[colLabel] = value;
                });
                return row;
            });

            const worksheet = XLSX.utils.json_to_sheet(exportData);

            // Ajuste básico de largura de colunas
            const wscols = selectedCols.map(() => ({ wch: 20 }));
            worksheet['!cols'] = wscols;

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Processos');

            // Gerar nome dinâmico para o arquivo
            const { category, tipo } = currentFilters;
            const now = new Date();
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = now.getFullYear();
            const dateStr = `${day}/${month}/${year}`;

            let contextLabel = '';
            if (category === 'Seguro Defeso') {
                contextLabel = 'Seguro Defeso';
            } else {
                const tipoLabel = (tipo && tipo !== 'all' && tipo !== 'Todos') ? tipo : 'Todos';
                const catLabel = category || 'Geral';
                contextLabel = `${tipoLabel} - ${catLabel}`;
            }

            const fileName = `Relatorio de processos (${contextLabel}) (${dateStr}).xlsx`;

            // 1. Download Local
            XLSX.writeFile(workbook, fileName);

            // 2. Upload para Nuvem (Automático)
            if (user?.id) {
                try {
                    // Converter para Blob para upload
                    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
                    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                    await uploadReportToCloud(blob, fileName, user.id);
                } catch (cloudError) {
                    console.error('Erro ao salvar na nuvem:', cloudError);
                }
            }

            showToast('success', 'Relatório gerado com sucesso!');
            onClose();
        } catch (error) {
            console.error('Erro ao exportar:', error);
            showToast('error', 'Erro ao gerar o relatório Excel.');
        } finally {
            setIsExporting(false);
        }
    };

    const casesWithAnyNotes = casesWithNotes.filter(c => c.notes.length > 0);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDeleteReport}
                title="Excluir Relatório"
                message={`Deseja realmente excluir o relatório "${reportToDelete?.name}" da nuvem? Esta ação não pode ser desfeita.`}
                confirmLabel="Excluir"
                variant="danger"
            />

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDeleteReport}
                title="Excluir Relatório"
                message={`Deseja realmente excluir o relatório "${reportToDelete?.name}" da nuvem? Esta ação não pode ser desfeita.`}
                confirmLabel="Excluir"
                variant="danger"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl bg-[#0f1115] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col min-h-[500px]"
            >
                {/* Header com Abas */}
                <div className="border-b border-white/5 bg-gradient-to-r from-emerald-500/10 to-transparent flex flex-col">
                    <div className="p-6 pb-2 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-500/20 rounded-2xl text-emerald-500 border border-emerald-500/20">
                                <FileText size={20} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white font-serif tracking-tight">
                                    {step === 1 ? 'Relatórios de Processos' : 'Selecionar Anotações'}
                                </h2>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {step === 1 ? 'Gerencie e exporte dados em Excel.' : 'Escolha quais anotações incluir no relatório.'}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {step === 1 && (
                        <div className="flex px-6">
                            <button
                                onClick={() => setActiveTab('generate')}
                                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === 'generate'
                                    ? 'border-emerald-500 text-white'
                                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                                    }`}
                            >
                                <Download size={14} />
                                Gerar Novo
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === 'history'
                                    ? 'border-emerald-500 text-white'
                                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                                    }`}
                            >
                                <History size={14} />
                                Histórico Nuvem
                            </button>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar flex-1">
                    <AnimatePresence mode="wait">
                        {step === 1 && activeTab === 'generate' && (
                            <motion.div
                                key="generate"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Colunas Disponíveis</span>
                                    <button
                                        onClick={handleSelectAll}
                                        className="text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:text-emerald-400 transition-colors"
                                    >
                                        {selectedCols.length === REPORT_COLUMNS.length ? 'Desmarcar Tudo' : 'Selecionar Tudo'}
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 gap-2">
                                    {REPORT_COLUMNS.map(col => {
                                        // Conditional visibility for retirement columns
                                        const isRetirementCol = col.id === 'proj_tempo' || col.id === 'proj_modalidade';
                                        if (isRetirementCol) {
                                            const isRetirementType = currentFilters?.tipo === 'Aposentadoria';
                                            const isExportingProjections = retirementCandidates && retirementCandidates.length > 0;
                                            if (!isRetirementType && !isExportingProjections) return null;
                                        }

                                        return (
                                            <button
                                                key={col.id}
                                                onClick={() => handleToggleCol(col.id)}
                                                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-300 ${selectedCols.includes(col.id)
                                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                                    : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/10'
                                                    }`}
                                            >
                                                <span className={`text-sm font-medium ${selectedCols.includes(col.id) ? 'text-white' : ''}`}>
                                                    {col.label}
                                                </span>
                                                <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${selectedCols.includes(col.id)
                                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                                    : 'bg-transparent border-white/10'
                                                    }`}>
                                                    {selectedCols.includes(col.id) && <Check size={12} strokeWidth={4} />}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}

                        {step === 1 && activeTab === 'history' && (
                            <motion.div
                                key="history"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-3"
                            >
                                {isLoadingReports ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                                        <Loader2 size={32} className="animate-spin mb-4 text-emerald-500" />
                                        <p className="text-sm font-medium">Carregando histórico...</p>
                                    </div>
                                ) : reports.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-center">
                                        <History size={48} className="opacity-20 mb-4" />
                                        <p className="text-sm font-medium">Nenhum relatório salvo ainda.</p>
                                        <p className="text-xs mt-1">Os relatórios gerados por você aparecerão aqui.</p>
                                    </div>
                                ) : (
                                    reports.map(report => (
                                        <div key={report.id} className="group flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/[0.08] hover:border-white/10 transition-all">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <FileText size={14} className="text-emerald-500" />
                                                    <h4 className="text-sm font-bold text-white break-all" title={report.name}>
                                                        {report.name}
                                                    </h4>
                                                </div>
                                                <div className="flex items-center gap-3 text-[10px] text-slate-500">
                                                    <div className="flex items-center gap-1">
                                                        <Calendar size={10} />
                                                        {new Date(report.created_at).toLocaleString('pt-BR')}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <UserIcon size={10} />
                                                        Você
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                                <a
                                                    href={report.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 rounded-xl transition-all"
                                                    title="Baixar Relatório"
                                                >
                                                    <Download size={16} />
                                                </a>
                                                <button
                                                    onClick={() => handleDeleteClick(report)}
                                                    className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl transition-all"
                                                    title="Excluir da Nuvem"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="selectNotes"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-3"
                            >
                                {casesWithAnyNotes.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-center">
                                        <MessageSquare size={48} className="opacity-20 mb-4" />
                                        <p className="text-sm font-medium">Nenhuma anotação encontrada.</p>
                                        <p className="text-xs mt-1">Os processos filtrados não possuem anotações.</p>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-xs text-zinc-500 mb-4">
                                            Clique em um cliente para expandir e selecionar as anotações. Se não selecionar nada, todas serão incluídas.
                                        </p>
                                        {casesWithAnyNotes.map(c => {
                                            const isExpanded = expandedCases.has(c.id);
                                            const caseSelectedNotes = selectedNotes[c.id] || new Set();
                                            const allSelected = c.notes.every(n => caseSelectedNotes.has(n.id));
                                            const someSelected = c.notes.some(n => caseSelectedNotes.has(n.id));

                                            return (
                                                <div key={c.id} className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
                                                    <button
                                                        onClick={() => toggleCaseExpanded(c.id)}
                                                        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-all"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            {isExpanded ? <ChevronDown size={16} className="text-emerald-500" /> : <ChevronRight size={16} className="text-zinc-500" />}
                                                            <div className="text-left">
                                                                <p className="text-sm font-bold text-white">{c.client_name}</p>
                                                                <p className="text-[10px] text-zinc-500">{c.notes.length} anotação(ões)</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[10px] px-2 py-1 rounded-lg ${allSelected ? 'bg-emerald-500/20 text-emerald-400' : someSelected ? 'bg-yellow-500/20 text-yellow-400' : 'bg-zinc-700 text-zinc-400'}`}>
                                                                {allSelected ? 'Todas' : someSelected ? `${caseSelectedNotes.size}/${c.notes.length}` : 'Nenhuma'}
                                                            </span>
                                                        </div>
                                                    </button>

                                                    {isExpanded && (
                                                        <div className="border-t border-white/5 p-4 space-y-2 bg-black/20">
                                                            <button
                                                                onClick={() => toggleAllNotesForCase(c.id, c.notes)}
                                                                className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 hover:text-emerald-400 mb-2"
                                                            >
                                                                {allSelected ? 'Desmarcar Todas' : 'Selecionar Todas'}
                                                            </button>

                                                            {c.notes.map(note => {
                                                                const isSelected = caseSelectedNotes.has(note.id);
                                                                return (
                                                                    <button
                                                                        key={note.id}
                                                                        onClick={() => toggleNoteSelection(c.id, note.id)}
                                                                        className={`w-full text-left p-3 rounded-xl border transition-all ${isSelected
                                                                            ? 'bg-emerald-500/10 border-emerald-500/30'
                                                                            : 'bg-white/5 border-white/5 hover:border-white/10'
                                                                            }`}
                                                                    >
                                                                        <div className="flex items-start justify-between gap-2">
                                                                            <p className={`text-xs flex-1 ${isSelected ? 'text-white' : 'text-zinc-400'}`} style={{ wordBreak: 'break-all' }}>
                                                                                {note.conteudo.length > 100 ? note.conteudo.slice(0, 100) + '...' : note.conteudo}
                                                                            </p>
                                                                            <div className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${isSelected
                                                                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                                                                : 'border-white/20'
                                                                                }`}>
                                                                                {isSelected && <Check size={10} strokeWidth={4} />}
                                                                            </div>
                                                                        </div>
                                                                        <p className="text-[10px] text-zinc-600 mt-1">
                                                                            {note.user_name} • {new Date(note.created_at).toLocaleDateString('pt-BR')}
                                                                        </p>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                {step === 1 && activeTab === 'generate' && (
                    <div className="p-6 border-t border-white/5 bg-white/5 flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 h-12 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-widest transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleNextStep}
                            disabled={isLoadingNotes || selectedCols.length === 0}
                            className="flex-[2] h-12 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2"
                        >
                            {isLoadingNotes ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Carregando...</span>
                                </>
                            ) : (
                                <>
                                    <Download size={16} />
                                    <span>{selectedCols.includes('anotacoes') ? 'Próximo' : 'Baixar Excel'}</span>
                                </>
                            )}
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="p-6 border-t border-white/5 bg-white/5 flex gap-3">
                        <button
                            onClick={() => setStep(1)}
                            className="flex-1 h-12 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                            <ArrowLeft size={16} />
                            <span>Voltar</span>
                        </button>
                        <button
                            onClick={handleExport}
                            disabled={isExporting}
                            className="flex-[2] h-12 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2"
                        >
                            {isExporting ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Gerando...</span>
                                </>
                            ) : (
                                <>
                                    <Download size={16} />
                                    <span>Baixar Excel</span>
                                </>
                            )}
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default ExportCasesModal;
