import React, { useState, useEffect } from 'react';
import { Case, Client, GPS, CaseStatus, CaseType, CaseNote } from '../../../types';
import { User, ClipboardList, MapPin, Edit2, Check, AlertTriangle, Trash2, Plus, Info, Globe, DollarSign, Loader2, Send, Clock } from 'lucide-react';
import { formatCPFOrCNPJ, formatCurrencyInput, parseCurrencyToNumber } from '../../../services/formatters';
import { fetchCaseNotes, addCaseNote, deleteCaseNote } from '../../../services/casesService';
import CustomSelect from '../../ui/CustomSelect';
import ConfirmModal from '../../ui/ConfirmModal';

interface CaseInfoTabProps {
    caseItem: Case;
    client?: Client;
    isEditMode: boolean;
    onUpdateCase: (updatedCase: Case) => Promise<void>;
    onViewClient?: (clientId: string) => void;
    // Props específicos do InfoTab
    onAddGps: (competencia: string) => Promise<void>;
    onUpdateGps: (gpsId: string, currentStatus: string, currentValue: number) => Promise<void>;
    onDeleteGps: (gps: GPS) => Promise<void>;
    onSaveGpsValue: (gpsId: string, val: number) => Promise<void>;
    // Modality handling
    modalities: string[];
    onAddModality: (val: string) => Promise<void>;
    caseTypes: string[];
    onAddCaseType: (val: string) => Promise<void>;
    isLoadingClient?: boolean;
    // User info for notes
    userName?: string;
    userId?: string;
}

const COMMON_SYSTEMS = [
    { name: 'Meu INSS', url: 'https://meu.inss.gov.br/' },
    { name: 'Gov.br', url: 'https://www.gov.br/pt-br' },
    { name: 'PJe TRF-1', url: 'https://pje1g.trf1.jus.br/' },
    { name: 'PJe TRT', url: 'https://pje.trt16.jus.br/' },
    { name: 'Esaj TJMA', url: 'https://esaj.tjma.jus.br/' }
];

const CaseInfoTab: React.FC<CaseInfoTabProps> = ({
    caseItem,
    client,
    isEditMode,
    onUpdateCase,
    onViewClient,
    onAddGps,
    onUpdateGps,
    onDeleteGps,
    onSaveGpsValue,
    modalities,
    onAddModality,
    caseTypes,
    onAddCaseType,
    isLoadingClient = false,
    userName = 'Usuário',
    userId
}) => {
    // Local state for GPS inputs
    const [newGpsMonth, setNewGpsMonth] = useState('');
    const [newGpsYear, setNewGpsYear] = useState('');
    const [isAddingGps, setIsAddingGps] = useState(false);
    const [editingGpsId, setEditingGpsId] = useState<string | null>(null);
    const [editingGpsValue, setEditingGpsValue] = useState('');

    // Notes state
    const [notes, setNotes] = useState<CaseNote[]>([]);
    const [newNoteContent, setNewNoteContent] = useState('');
    const [isLoadingNotes, setIsLoadingNotes] = useState(true);
    const [isAddingNote, setIsAddingNote] = useState(false);
    const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

    const MONTH_OPTIONS = [
        { label: 'JAN', value: '01' }, { label: 'FEV', value: '02' }, { label: 'MAR', value: '03' },
        { label: 'ABR', value: '04' }, { label: 'MAI', value: '05' }, { label: 'JUN', value: '06' },
        { label: 'JUL', value: '07' }, { label: 'AGO', value: '08' }, { label: 'SET', value: '09' },
        { label: 'OUT', value: '10' }, { label: 'NOV', value: '11' }, { label: 'DEZ', value: '12' }
    ];

    const currentYear = new Date().getFullYear();
    const YEAR_OPTIONS = Array.from({ length: 11 }, (_, i) => {
        const y = (currentYear - 5 + i).toString();
        return { label: y, value: y };
    });

    // Local state for dynamic selects
    const [showNewModalityInput, setShowNewModalityInput] = useState(false);
    const [newModalityValue, setNewModalityValue] = useState('');
    const [showNewTypeInput, setShowNewTypeInput] = useState(false);
    const [newTypeValue, setNewTypeValue] = useState('');

    // Load notes on mount
    useEffect(() => {
        const loadNotes = async () => {
            try {
                setIsLoadingNotes(true);
                const data = await fetchCaseNotes(caseItem.id);
                setNotes(data);
            } catch (error) {
                console.error('Erro ao carregar anotações:', error);
            } finally {
                setIsLoadingNotes(false);
            }
        };
        loadNotes();
    }, [caseItem.id]);

    // Handlers
    const handleAddGpsClick = () => {
        if (!newGpsMonth || !newGpsYear) return;
        onAddGps(`${newGpsMonth}/${newGpsYear}`);
        setNewGpsMonth('');
        setNewGpsYear('');
        setIsAddingGps(false);
    };

    const handleSaveGpsValClick = () => {
        if (!editingGpsId) return;
        const val = parseCurrencyToNumber(editingGpsValue);
        onSaveGpsValue(editingGpsId, val);
        setEditingGpsId(null);
    };

    const handleAddModalityClick = () => {
        if (!newModalityValue.trim()) return;
        onAddModality(newModalityValue);
        setShowNewModalityInput(false);
        setNewModalityValue('');
    };

    const handleAddTypeClick = () => {
        if (!newTypeValue.trim()) return;
        onAddCaseType(newTypeValue);
        setShowNewTypeInput(false);
        setNewTypeValue('');
    };

    const handleAddNote = async () => {
        if (!newNoteContent.trim()) return;
        setIsAddingNote(true);
        try {
            const newNote = await addCaseNote(caseItem.id, newNoteContent.trim(), userName, userId);
            setNotes(prev => [newNote, ...prev]);
            setNewNoteContent('');
        } catch (error) {
            console.error('Erro ao adicionar anotação:', error);
        } finally {
            setIsAddingNote(false);
        }
    };

    const handleDeleteNote = async (noteId: string) => {
        try {
            await deleteCaseNote(noteId);
            setNotes(prev => prev.filter(n => n.id !== noteId));
            setNoteToDelete(null);
        } catch (error) {
            console.error('Erro ao excluir anotação:', error);
        }
    };

    const formatNoteDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* COLUNA 1: DADOS DO PROCESSO */}
            <div className="lg:col-span-2 space-y-6">
                {/* 1. VINCULO CLIENTE */}
                <div className="bg-[#18181b] p-6 rounded-xl border border-white/5 relative group hover:border-gold-500/20 transition-all">
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <User size={16} /> Cliente Vinculado
                    </h3>
                    {isLoadingClient ? (
                        <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/5">
                            <Loader2 className="animate-spin text-gold-500" size={20} />
                            <span className="text-sm text-zinc-400">Buscando informações do cliente...</span>
                        </div>
                    ) : client ? (
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-zinc-800 to-black border border-white/10 flex items-center justify-center text-lg font-serif text-gold-500">
                                {client.nome_completo.charAt(0)}
                            </div>
                            <div className="flex-1">
                                <h4 className="text-xl font-medium text-white group-hover:text-gold-500 transition-colors cursor-pointer" onClick={() => onViewClient?.(client.id)}>
                                    {client.nome_completo}
                                </h4>
                                <div className="text-sm text-zinc-500 mt-1 flex gap-4">
                                    <span>CPF: {formatCPFOrCNPJ(client.cpf_cnpj)}</span>
                                    {client.cidade && <span>{client.cidade} - {client.uf}</span>}
                                </div>
                                {client.captador && (
                                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800 text-zinc-100 rounded text-[10px] font-black uppercase tracking-tight shadow-sm border border-white/5">
                                        <User size={10} className="text-zinc-500" />
                                        Captador: {client.captador}
                                    </div>
                                )}
                            </div>
                            <button onClick={() => onViewClient?.(client.id)} className="p-2 bg-[#131418] border border-white/10 rounded-lg text-zinc-400 hover:text-white hover:border-gold-500/50 transition-all">
                                <ClipboardList size={18} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-red-400 bg-red-400/10 p-3 rounded">
                            <AlertTriangle size={16} /> Cliente não encontrado
                        </div>
                    )}
                </div>

                {/* 2. DADOS CADASTRAIS */}
                <div className="bg-[#18181b] p-6 rounded-xl border border-white/5 relative">
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Info size={16} /> Dados Cadastrais
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* TIPO E MODALIDADE */}
                        <div>
                            <label className="text-xs text-slate-500 uppercase font-bold block mb-1">Tipo de Ação</label>
                            {isEditMode ? (
                                <div>
                                    <CustomSelect
                                        label="Tipo de Ação"
                                        options={[...caseTypes.map(t => ({ label: t, value: t })), { label: 'Novo Tipo...', value: 'Novo Tipo...' }]}
                                        value={caseItem.tipo}
                                        onChange={(val) => {
                                            if (val === 'Novo Tipo...') setShowNewTypeInput(true);
                                            else onUpdateCase({ ...caseItem, tipo: val as any, modalidade: undefined });
                                        }}
                                    />
                                    {showNewTypeInput && (
                                        <div className="flex gap-2 mt-2">
                                            <input
                                                className="flex-1 bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white"
                                                placeholder="Nome do Tipo"
                                                value={newTypeValue}
                                                onChange={e => setNewTypeValue(e.target.value)}
                                            />
                                            <button onClick={handleAddTypeClick} className="bg-gold-500 text-black px-2 rounded font-bold"><Check size={14} /></button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-white font-medium">{caseItem.tipo}</div>
                            )}
                        </div>

                        <div>
                            <label className="text-xs text-slate-500 uppercase font-bold block mb-1">Modalidade</label>
                            {isEditMode ? (
                                <div>
                                    <CustomSelect
                                        label="Modalidade"
                                        options={[...modalities.map(m => ({ label: m, value: m })), { label: 'Nova Modalidade...', value: 'Nova Modalidade...' }]}
                                        value={caseItem.modalidade || ''}
                                        onChange={(val) => {
                                            if (val === 'Nova Modalidade...') setShowNewModalityInput(true);
                                            else onUpdateCase({ ...caseItem, modalidade: val });
                                        }}
                                        placeholder="Selecione..."
                                    />
                                    {showNewModalityInput && (
                                        <div className="flex gap-2 mt-2">
                                            <input
                                                className="flex-1 bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white"
                                                placeholder="Nome da Modalidade"
                                                value={newModalityValue}
                                                onChange={e => setNewModalityValue(e.target.value)}
                                            />
                                            <button onClick={handleAddModalityClick} className="bg-gold-500 text-black px-2 rounded font-bold"><Check size={14} /></button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-white font-medium">{caseItem.modalidade || '-'}</div>
                            )}
                        </div>

                        <div className="md:col-span-2">
                            <label className="text-xs text-slate-500 uppercase font-bold block mb-1">Número do Processo (CNJ)</label>
                            {isEditMode ? (
                                <input
                                    className="w-full bg-[#131418] border border-white/10 rounded px-3 py-2 text-white font-mono"
                                    value={caseItem.numero_processo || ''}
                                    onChange={e => onUpdateCase({ ...caseItem, numero_processo: e.target.value })} // TODO: Add mask
                                    placeholder="0000000-00.0000.0.00.0000"
                                />
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span className="text-white font-mono text-lg">{caseItem.numero_processo || 'Não informado'}</span>
                                    {caseItem.numero_processo && (
                                        <button className="text-zinc-500 hover:text-gold-500" onClick={() => navigator.clipboard.writeText(caseItem.numero_processo || '')}>
                                            <ClipboardList size={14} />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="text-xs text-slate-500 uppercase font-bold block mb-1">Status Atual</label>
                            {isEditMode ? (
                                <CustomSelect
                                    label="Status do Processo"
                                    options={Object.values(CaseStatus).map(s => ({ label: s, value: s }))}
                                    value={caseItem.status}
                                    onChange={val => onUpdateCase({ ...caseItem, status: val as any })}
                                />
                            ) : (
                                <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase ${caseItem.status === CaseStatus.CONCLUIDO_CONCEDIDO ? 'bg-green-500/10 text-green-500' :
                                    caseItem.status === CaseStatus.CONCLUIDO_INDEFERIDO ? 'bg-red-500/10 text-red-500' :
                                        'bg-yellow-500/10 text-yellow-500'
                                    }`}>
                                    {caseItem.status}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="text-xs text-slate-500 uppercase font-bold block mb-1">Valor da Causa</label>
                            {isEditMode ? (
                                <input
                                    className="w-full bg-[#131418] border border-white/10 rounded px-3 py-2 text-white"
                                    value={formatCurrencyInput((caseItem.valor_causa || 0).toFixed(2))}
                                    onChange={e => onUpdateCase({ ...caseItem, valor_causa: parseCurrencyToNumber(e.target.value) })}
                                />
                            ) : (
                                <div className="text-white font-medium">{(caseItem.valor_causa || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. GUIAS GPS (Se aplicável) */}
                {(caseItem.tipo === CaseType.SEGURO_DEFESO || caseItem.tipo === CaseType.APOSENTADORIA) && (
                    <div className="bg-[#18181b] p-6 rounded-xl border border-white/5 relative">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                <Globe size={16} /> Guias de Recolhimento (GPS)
                            </h3>
                            <button onClick={() => setIsAddingGps(true)} className="text-xs text-gold-500 hover:text-gold-400 font-bold uppercase flex items-center gap-1">
                                <Plus size={12} /> Adicionar
                            </button>
                        </div>

                        {isAddingGps && (
                            <div className="flex gap-2 mb-4 animate-in fade-in slide-in-from-top-2">
                                <div className="w-28">
                                    <CustomSelect
                                        label=""
                                        options={MONTH_OPTIONS}
                                        value={newGpsMonth}
                                        onChange={setNewGpsMonth}
                                        placeholder="Mês"
                                    />
                                </div>
                                <div className="w-24">
                                    <CustomSelect
                                        label=""
                                        options={YEAR_OPTIONS}
                                        value={newGpsYear}
                                        onChange={setNewGpsYear}
                                        placeholder="Ano"
                                    />
                                </div>
                                <button onClick={handleAddGpsClick} className="bg-gold-500 text-black px-4 rounded font-bold text-xs h-[38px] mt-0.5">Salvar</button>
                                <button onClick={() => setIsAddingGps(false)} className="text-zinc-500 px-2"><Trash2 size={14} /></button>
                            </div>
                        )}

                        <div className="space-y-2">
                            {(caseItem.gps_lista || []).length === 0 ? (
                                <div className="text-zinc-600 italic text-sm text-center py-4">Nenhuma GPS cadastrada.</div>
                            ) : (
                                (caseItem.gps_lista || []).map(gps => (
                                    <div key={gps.id} className="flex items-center justify-between p-3 bg-[#131418] rounded-lg border border-white/5 hover:border-gold-500/20 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-2 h-2 rounded-full ${gps.status === 'Paga' ? 'bg-green-500' : gps.status === 'Puxada' ? 'bg-blue-500' : 'bg-red-500'}`} />
                                            <div>
                                                <div className="text-sm font-bold text-white">Comp: {gps.competencia}</div>
                                                <div className="text-xs text-zinc-500">{gps.status}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {editingGpsId === gps.id ? (
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        className="w-24 bg-black/20 border border-white/10 rounded px-1 text-sm text-white text-right"
                                                        value={editingGpsValue}
                                                        onChange={e => setEditingGpsValue(formatCurrencyInput(e.target.value))}
                                                        autoFocus
                                                    />
                                                    <button onClick={handleSaveGpsValClick} className="text-green-500"><Check size={14} /></button>
                                                </div>
                                            ) : (
                                                <div className="text-sm font-mono text-zinc-300">
                                                    {gps.valor > 0 ? gps.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}
                                                </div>
                                            )}

                                            <div className="flex gap-1">
                                                {gps.status !== 'Paga' && (
                                                    <button
                                                        onClick={() => {
                                                            if (gps.status === 'Pendente') {
                                                                setEditingGpsId(gps.id);
                                                                setEditingGpsValue(formatCurrencyInput(gps.valor.toFixed(2)));
                                                            } else {
                                                                onUpdateGps(gps.id, gps.status, gps.valor);
                                                            }
                                                        }}
                                                        className={`p-1.5 rounded hover:bg-white/10 ${gps.status === 'Pendente' ? 'text-zinc-500' : 'text-green-500'}`}
                                                        title={gps.status === 'Pendente' ? "Definir Valor" : "Pagar"}
                                                    >
                                                        {gps.status === 'Pendente' ? <Edit2 size={14} /> : <DollarSign size={14} />}
                                                    </button>
                                                )}
                                                <button onClick={() => onDeleteGps(gps)} className="p-1.5 text-zinc-600 hover:text-red-500 rounded hover:bg-white/10">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* COLUNA 2: MENUS RÁPIDOS */}
            <div className="space-y-6">
                {/* LINKS ÚTEIS */}
                <div className="bg-[#18181b] p-6 rounded-xl border border-white/5">
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Acesso Rápido</h3>
                    <div className="space-y-2">
                        {COMMON_SYSTEMS.map(sys => (
                            <a
                                key={sys.name}
                                href={sys.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-between p-3 bg-[#131418] rounded-lg border border-white/5 hover:border-gold-500/30 text-zinc-400 hover:text-white transition-all group"
                            >
                                <span className="text-sm">{sys.name}</span>
                                <Globe size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-gold-500" />
                            </a>
                        ))}
                    </div>
                </div>

                {/* ANOTAÇÕES */}
                <div className="bg-[#18181b] p-6 rounded-xl border border-white/5 flex flex-col">
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Anotações</h3>

                    {/* Formulário de nova anotação */}
                    <div className="flex gap-2 mb-4">
                        <input
                            className="flex-1 bg-[#131418] border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-300 outline-none focus:border-gold-500 placeholder:text-zinc-600"
                            placeholder="Adicionar anotação..."
                            value={newNoteContent}
                            onChange={e => setNewNoteContent(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAddNote()}
                            disabled={isAddingNote}
                        />
                        <button
                            onClick={handleAddNote}
                            disabled={!newNoteContent.trim() || isAddingNote}
                            className="p-2 bg-gold-500 text-black rounded-lg hover:bg-gold-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isAddingNote ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        </button>
                    </div>

                    {/* Lista de anotações */}
                    <div className="flex-1 overflow-y-auto max-h-[300px] space-y-3 custom-scrollbar">
                        {isLoadingNotes ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="animate-spin text-gold-500" size={24} />
                            </div>
                        ) : notes.length === 0 ? (
                            <div className="text-center py-8 text-zinc-600 text-sm italic">
                                Nenhuma anotação registrada.
                            </div>
                        ) : (
                            notes.map(note => (
                                <div key={note.id} className="p-3 bg-[#131418] rounded-lg border border-white/5 group hover:border-white/10 transition-all">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-sm text-zinc-300 flex-1 whitespace-pre-wrap">{note.conteudo}</p>
                                        <button
                                            onClick={() => setNoteToDelete(note.id)}
                                            className="p-1 text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                                            title="Excluir anotação"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2 text-[10px] text-zinc-500">
                                        <User size={10} />
                                        <span className="font-medium">{note.user_name}</span>
                                        <span className="text-zinc-700">•</span>
                                        <Clock size={10} />
                                        <span>{formatNoteDate(note.created_at)}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de Confirmação para Excluir Anotação */}
            <ConfirmModal
                isOpen={!!noteToDelete}
                onClose={() => setNoteToDelete(null)}
                onConfirm={() => noteToDelete && handleDeleteNote(noteToDelete)}
                title="Excluir Anotação"
                message="Tem certeza que deseja excluir esta anotação? Esta ação não pode ser desfeita."
                confirmLabel="Excluir"
                cancelLabel="Cancelar"
                variant="danger"
            />
        </div>
    );
};

export default CaseInfoTab;
