import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Check, Download, Loader2, History, Trash2, Calendar, User as UserIcon, ChevronDown, ChevronRight, MessageSquare, ArrowLeft } from 'lucide-react';
import ConfirmModal from '../ui/ConfirmModal';
import * as XLSX from 'xlsx';
import { Client, ClientNote, GeneratedReport } from '../../types';
import { fetchAllFilteredClientsData, fetchClientNotes } from '../../services/clientsService';
import { uploadReportToCloud, fetchUserReports, deleteReport as deleteReportService } from '../../services/reportsService';
import { formatDateDisplay } from '../../utils/dateUtils';
import { formatCPFOrCNPJ, formatPhone } from '../../services/formatters';
import { useApp } from '../../context/AppContext';

interface ExportClientsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentFilters: any;
    searchTerm: string;
    showToast: (type: 'success' | 'error', message: string) => void;
}

interface ClientWithNotes extends Client {
    notes: ClientNote[];
}

const REPORT_COLUMNS = [
    { id: 'nome_completo', label: 'Nome do Cliente', default: true },
    { id: 'cpf_cnpj', label: 'CPF / CNPJ', default: true },
    { id: 'contato', label: 'Contato (Telefone)', default: true },
    { id: 'email', label: 'Email', default: true },
    { id: 'anotacoes', label: 'Anotações (Histórico)', default: true },
    { id: 'nascimento', label: 'Nascimento / Idade', default: true },
    { id: 'endereco', label: 'Endereço Completo', default: false },
    { id: 'filial', label: 'Filial', default: true },
    { id: 'captador', label: 'Captador', default: true },
    { id: 'gps', label: 'Situação GPS', default: false },
    { id: 'profissao', label: 'Profissão', default: false },
    { id: 'reap_summary', label: 'Histórico REAP (Resumo)', default: false },
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

const ExportClientsModal: React.FC<ExportClientsModalProps> = ({
    isOpen,
    onClose,
    currentFilters,
    searchTerm,
    showToast
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
    const [clientsWithNotes, setClientsWithNotes] = useState<ClientWithNotes[]>([]);
    const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
    const [selectedNotes, setSelectedNotes] = useState<Record<string, Set<string>>>({}); // clientId -> Set of noteIds

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
            setClientsWithNotes([]);
            setExpandedClients(new Set());
            setSelectedNotes({});
        }
    }, [isOpen]);

    const loadReports = async () => {
        if (!user?.id) return;
        setIsLoadingReports(true);
        try {
            const data = await fetchUserReports(user.id);
            // Filtramos relatórios que começam com "Relatorio de clientes"
            setReports(data.filter(r => r.name.startsWith('Relatorio de clientes')));
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

        // Carrega os clientes com suas anotações
        setIsLoadingNotes(true);
        try {
            const allClients = await fetchAllFilteredClientsData(searchTerm, currentFilters);

            if (allClients.length === 0) {
                showToast('error', 'Nenhum cliente encontrado com os filtros atuais.');
                setIsLoadingNotes(false);
                return;
            }

            const clientsData = await Promise.all(
                allClients.map(async (c) => {
                    try {
                        const notes = await fetchClientNotes(c.id);
                        return { ...c, notes } as ClientWithNotes;
                    } catch {
                        return { ...c, notes: [] } as ClientWithNotes;
                    }
                })
            );

            setClientsWithNotes(clientsData);

            // Por padrão, todas as notas vão selecionadas
            const defaultSelection: Record<string, Set<string>> = {};
            clientsData.forEach(c => {
                if (c.notes.length > 0) {
                    defaultSelection[c.id] = new Set(c.notes.map(n => n.id));
                }
            });
            setSelectedNotes(defaultSelection);

            setStep(2);
        } catch (error) {
            console.error('Erro ao carregar anotações:', error);
            showToast('error', 'Erro ao carregar anotações dos clientes.');
        } finally {
            setIsLoadingNotes(false);
        }
    };

    const toggleClientExpanded = (clientId: string) => {
        setExpandedClients(prev => {
            const newSet = new Set(prev);
            if (newSet.has(clientId)) {
                newSet.delete(clientId);
            } else {
                newSet.add(clientId);
            }
            return newSet;
        });
    };

    const toggleNoteSelection = (clientId: string, noteId: string) => {
        setSelectedNotes(prev => {
            const clientNotes = prev[clientId] || new Set();
            const newClientNotes = new Set(clientNotes);
            if (newClientNotes.has(noteId)) {
                newClientNotes.delete(noteId);
            } else {
                newClientNotes.add(noteId);
            }
            return { ...prev, [clientId]: newClientNotes };
        });
    };

    const toggleAllNotesForClient = (clientId: string, notes: ClientNote[]) => {
        setSelectedNotes(prev => {
            const clientNotes = prev[clientId] || new Set();
            const allSelected = notes.every(n => clientNotes.has(n.id));

            if (allSelected) {
                return { ...prev, [clientId]: new Set() };
            } else {
                return { ...prev, [clientId]: new Set(notes.map(n => n.id)) };
            }
        });
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            let dataToExport: ClientWithNotes[];

            if (step === 2) {
                dataToExport = clientsWithNotes;
            } else {
                const allClients = await fetchAllFilteredClientsData(searchTerm, currentFilters);
                dataToExport = allClients.map(c => ({ ...c, notes: [] })) as ClientWithNotes[];
            }

            if (dataToExport.length === 0) {
                showToast('error', 'Nenhum cliente encontrado.');
                setIsExporting(false);
                return;
            }

            const exportData = dataToExport.map(c => {
                const row: any = {};
                selectedCols.forEach(colId => {
                    const colLabel = REPORT_COLUMNS.find(rc => rc.id === colId)?.label || colId;
                    let value: any = '';

                    switch (colId) {
                        case 'nome_completo': value = c.nome_completo || 'N/A'; break;
                        case 'cpf_cnpj': value = c.cpf_cnpj ? formatCPFOrCNPJ(c.cpf_cnpj) : 'N/A'; break;
                        case 'contato': value = c.telefone ? formatPhone(c.telefone) : 'N/A'; break;
                        case 'email': value = c.email || 'N/A'; break;
                        case 'anotacoes':
                            const clientSelectedNotes = selectedNotes[c.id] || new Set();
                            const selectedNoteTexts = c.notes
                                .filter(n => clientSelectedNotes.size === 0 || clientSelectedNotes.has(n.id))
                                .map(n => n.conteudo);
                            value = selectedNoteTexts.join(' | ');
                            break;
                        case 'nascimento': value = calculateAge(c.data_nascimento); break;
                        case 'endereco': value = `${c.endereco || ''}, ${c.bairro || ''}, ${c.cidade || ''} - ${c.uf || ''}`; break;
                        case 'filial': value = c.filial || 'N/A'; break;
                        case 'captador': value = c.captador || 'N/A'; break;
                        case 'gps':
                            value = c.gps_status_calculado === 'puxada' ? 'Puxada' :
                                c.gps_status_calculado === 'pendente' ? 'Pendente' :
                                    c.gps_status_calculado === 'regular' ? 'Regular' : 'N/A';
                            break;
                        case 'profissao': value = c.profissao || 'N/A'; break;
                        case 'reap_summary': {
                            const years = ['2021', '2022', '2023', '2024'];
                            const summary = years.map(y => `${y}: ${c.reap_history?.[y] ? 'OK' : 'Pendente'}`).join(' | ');
                            const m2025 = c.reap_history?.['2025'];
                            const summary2025 = Array.isArray(m2025) ? `2025: ${m2025.length} meses` : `2025: Pendente`;
                            value = `${summary} | ${summary2025}`;
                            break;
                        }
                        default: value = (c as any)[colId] || '';
                    }
                    row[colLabel] = value;
                });
                return row;
            });

            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const wscols = selectedCols.map(() => ({ wch: 20 }));
            worksheet['!cols'] = wscols;

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');

            const now = new Date();
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = now.getFullYear();
            const dateStr = `${day}/${month}/${year}`;

            const fileName = `Relatorio de clientes (${dateStr}).xlsx`;

            // 1. Download Local
            XLSX.writeFile(workbook, fileName);

            // 2. Upload para Nuvem
            if (user?.id) {
                try {
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

    const clientsWithAnyNotes = clientsWithNotes.filter(c => c.notes && c.notes.length > 0);

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

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl bg-[#0f1115] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col min-h-[500px]"
            >
                {/* Header */}
                <div className="border-b border-white/5 bg-gradient-to-r from-emerald-500/10 to-transparent flex flex-col">
                    <div className="p-6 pb-2 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-500/20 rounded-2xl text-emerald-500 border border-emerald-500/20">
                                <FileText size={20} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white font-serif tracking-tight">
                                    {step === 1 ? 'Relatórios de Clientes' : 'Selecionar Anotações'}
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
                                    {REPORT_COLUMNS.map(col => (
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
                                    ))}
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
                                        <p className="text-sm font-medium">Nenhum relatório de clientes salvo ainda.</p>
                                    </div>
                                ) : (
                                    reports.map(report => (
                                        <div key={report.id} className="group flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/[0.08] hover:border-white/10 transition-all">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <FileText size={14} className="text-emerald-500" />
                                                    <h4 className="text-sm font-bold text-white break-all">{report.name}</h4>
                                                </div>
                                                <div className="flex items-center gap-3 text-[10px] text-slate-500">
                                                    <div className="flex items-center gap-1">
                                                        <Calendar size={10} />
                                                        {new Date(report.created_at).toLocaleString('pt-BR')}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                                <a href={report.url} target="_blank" rel="noopener noreferrer" className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 rounded-xl transition-all">
                                                    <Download size={16} />
                                                </a>
                                                <button onClick={() => handleDeleteClick(report)} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl transition-all">
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
                                {clientsWithAnyNotes.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-center">
                                        <MessageSquare size={48} className="opacity-20 mb-4" />
                                        <p className="text-sm font-medium">Nenhuma anotação encontrada.</p>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-xs text-zinc-500 mb-4">Selecione quais anotações incluir. Se nenhuma for selecionada para um cliente, todas serão incluídas.</p>
                                        {clientsWithAnyNotes.map(c => {
                                            const isExpanded = expandedClients.has(c.id);
                                            const clientSelectedNotes = selectedNotes[c.id] || new Set();
                                            const allSelected = c.notes.every(n => clientSelectedNotes.has(n.id));
                                            const someSelected = c.notes.some(n => clientSelectedNotes.has(n.id));

                                            return (
                                                <div key={c.id} className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
                                                    <button onClick={() => toggleClientExpanded(c.id)} className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-all">
                                                        <div className="flex items-center gap-3">
                                                            {isExpanded ? <ChevronDown size={16} className="text-emerald-500" /> : <ChevronRight size={16} className="text-zinc-500" />}
                                                            <div className="text-left">
                                                                <p className="text-sm font-bold text-white">{c.nome_completo}</p>
                                                                <p className="text-[10px] text-zinc-500">{c.notes.length} anotação(ões)</p>
                                                            </div>
                                                        </div>
                                                        <span className={`text-[10px] px-2 py-1 rounded-lg ${allSelected ? 'bg-emerald-500/20 text-emerald-400' : someSelected ? 'bg-yellow-500/20 text-yellow-400' : 'bg-zinc-700 text-zinc-400'}`}>
                                                            {allSelected ? 'Todas' : someSelected ? `${clientSelectedNotes.size}/${c.notes.length}` : 'Nenhuma'}
                                                        </span>
                                                    </button>

                                                    {isExpanded && (
                                                        <div className="border-t border-white/5 p-4 space-y-2 bg-black/20">
                                                            <button onClick={() => toggleAllNotesForClient(c.id, c.notes)} className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 hover:text-emerald-400 mb-2">
                                                                {allSelected ? 'Desmarcar Todas' : 'Selecionar Todas'}
                                                            </button>
                                                            {c.notes.map(note => (
                                                                <button key={note.id} onClick={() => toggleNoteSelection(c.id, note.id)} className={`w-full text-left p-3 rounded-xl border transition-all ${selectedNotes[c.id]?.has(note.id) ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/5'}`}>
                                                                    <div className="flex justify-between gap-2">
                                                                        <p className="text-xs text-zinc-400">{note.conteudo}</p>
                                                                        <div className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center ${selectedNotes[c.id]?.has(note.id) ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-white/20'}`}>
                                                                            {selectedNotes[c.id]?.has(note.id) && <Check size={10} strokeWidth={4} />}
                                                                        </div>
                                                                    </div>
                                                                </button>
                                                            ))}
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
                <div className="p-6 border-t border-white/5 bg-white/5 flex gap-3">
                    {step === 1 && activeTab === 'generate' && (
                        <>
                            <button onClick={onClose} className="flex-1 h-12 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-widest transition-all">Cancelar</button>
                            <button onClick={handleNextStep} disabled={isLoadingNotes || selectedCols.length === 0} className="flex-[2] h-12 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2">
                                {isLoadingNotes ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                <span>{selectedCols.includes('anotacoes') ? 'Próximo' : 'Baixar Excel'}</span>
                            </button>
                        </>
                    )}
                    {step === 2 && (
                        <>
                            <button onClick={() => setStep(1)} className="flex-1 h-12 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"><ArrowLeft size={16} /> Voltar</button>
                            <button onClick={handleExport} disabled={isExporting} className="flex-[2] h-12 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2">
                                {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                <span>Baixar Excel</span>
                            </button>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default ExportClientsModal;
