import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../services/supabaseClient';
import { Client, Case, Branch, CaseStatus, Captador, ClientDocument, TabConfig } from '../../types';
import {
    X, Camera, Edit2, Save, MapPin, Building2,
    MessageCircle, FileText, ChevronRight, AlertTriangle,
    CheckCircle2, Printer, ChevronDown, Check, Clock, Plus, Trash2, Share2, FileSpreadsheet,
    UploadCloud, Loader2, Eye, Download, Users, Lock, EyeOff, Square, CheckSquare, Shield, Gavel, Copy,
    LayoutDashboard, ChevronLeft, Fish
} from 'lucide-react';
import WhatsAppModal from './WhatsAppModal';
import { formatCPFOrCNPJ, formatPhone, formatCurrencyInput, parseCurrencyToNumber } from '../../services/formatters';
import { fetchAddressByCep } from '../../services/cepService';
import { printDocuments } from '../../utils/printGenerator';
import { printCustomTemplate } from '../../utils/templatePrinter';
import CustomSelect from '../ui/CustomSelect';
import { formatDateDisplay } from '../../utils/dateUtils';
import { uploadFileToR2, deleteFileFromR2 } from '../../services/storageService';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';
import ClientInfoTab from '../tabs/ClientInfoTab';
import ClientDocsTab from '../tabs/ClientDocsTab';
import ClientCredentialsTab from '../tabs/ClientCredentialsTab';
import ClientHistoryTab from '../tabs/ClientHistoryTab';
import ClientCnisTab from '../tabs/ClientCnisTab';
import ClientRgpTab from '../tabs/ClientRgpTab';
import { History as HistoryIcon, Calculator } from 'lucide-react';

// PENDING OPTIONS Constant
const PENDING_OPTIONS = [
    'Senha',
    'Duas Etapas',
    'Nível da Conta (Bronze)',
    'Pendência na Receita Federal',
    'Documentação Incompleta'
];

// BRANCH OPTIONS
const BRANCH_OPTIONS = Object.values(Branch).map(b => ({ label: b, value: b }));

interface ClientDetailsModalProps {
    client: Client;
    onClose: () => void;
    onSelectCase?: (caseItem: Case) => void;
    initialEditMode?: boolean;
    initialTab?: 'info' | 'docs' | 'credentials' | 'history' | 'cnis' | 'rgp';
}

const ClientDetailsModal: React.FC<ClientDetailsModalProps> = ({ client, onClose, onSelectCase, initialEditMode = false, initialTab = 'info' }) => {
    const {
        cases, showToast, updateClient, captadores, addCaptador, deleteCaptador,
        clients: allClients, openNewCaseWithParams, updateCase,
        mergedPreferences, saveUserPreferences, saveGlobalPreferences, user
    } = useApp();

    const [isLayoutEditMode, setIsLayoutEditMode] = useState(false);
    const [tempLayout, setTempLayout] = useState<TabConfig[]>([]);

    // Ref for tabs container horizontal scroll
    const tabsContainerRef = useRef<HTMLDivElement>(null);

    const handleTabsWheel = (e: React.WheelEvent) => {
        if (tabsContainerRef.current) {
            // Prevent default vertical scrolling when hovering tabs
            // Note: In React proper prevention of passive wheel events can be tricky,
            // but for horizontal containers often just shifting scrollLeft is enough
            // if the container captures the scroll.
            tabsContainerRef.current.scrollLeft += e.deltaY;
        }
    };

    const defaultTabs: TabConfig[] = useMemo(() => [
        { id: 'info', label: 'Informações', visible: true, order: 0 },
        { id: 'docs', label: 'Documentos', visible: true, order: 1 },
        { id: 'credentials', label: 'Credenciais', visible: true, order: 2 },
        { id: 'history', label: 'Histórico', visible: true, order: 3 },
        { id: 'cnis', label: 'Dados CNIS', visible: true, order: 4 },
        { id: 'rgp', label: 'RGP', visible: true, order: 5 }
    ], []);

    const tabsConfig = useMemo(() => {
        const saved = mergedPreferences.clientDetailsLayout || [];
        const merged = [...defaultTabs];

        saved.forEach(s => {
            const idx = merged.findIndex(d => d.id === s.id);
            if (idx !== -1) merged[idx] = { ...merged[idx], ...s };
        });

        return merged.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }, [mergedPreferences.clientDetailsLayout, defaultTabs]);

    const [activeTab, setActiveTab] = useState<'info' | 'docs' | 'credentials' | 'history' | 'cnis' | 'rgp'>(initialTab);
    const [isEditMode, setIsEditMode] = useState(initialEditMode);
    const [editedClient, setEditedClient] = useState<Client>(client);
    const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

    const [isUploading, setIsUploading] = useState(false);



    // Printing & Templates State
    const [showDocMenu, setShowDocMenu] = useState(false);
    const [customTemplates, setCustomTemplates] = useState<any[]>([]);
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

    // Seleção Múltipla de Docs
    const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);



    useEffect(() => {
        const fetchTemplates = async () => {
            setIsLoadingTemplates(true);
            const { data, error } = await supabase.from('document_templates').select('*').order('titulo');
            if (!error && data) {
                setCustomTemplates(data);
            }
            setIsLoadingTemplates(false);
        };
        fetchTemplates();
    }, []);

    // Sincroniza editedClient se o client mudar externamente (ex: após sync de documentos)
    useEffect(() => {
        if (client.documentos !== editedClient.documentos) {
            setEditedClient(prev => ({ ...prev, documentos: client.documentos }));
        }
        // Sync RGP fields if they update externally (e.g. via robot)
        if (
            client.rgp_status !== editedClient.rgp_status ||
            client.rgp_localidade !== editedClient.rgp_localidade ||
            client.rgp_numero !== editedClient.rgp_numero ||
            client.rgp_data_primeiro !== editedClient.rgp_data_primeiro ||
            client.rgp_local_exercicio !== editedClient.rgp_local_exercicio
        ) {
            setEditedClient(prev => ({
                ...prev,
                rgp_status: client.rgp_status,
                rgp_localidade: client.rgp_localidade,
                rgp_numero: client.rgp_numero,
                rgp_data_primeiro: client.rgp_data_primeiro,
                rgp_local_exercicio: client.rgp_local_exercicio
            }));
        }
    }, [client.documentos, client.rgp_status, client.rgp_localidade, client.rgp_numero, client.rgp_data_primeiro, client.rgp_local_exercicio]);

    // Sincroniza aba inicial se mudar
    useEffect(() => {
        if (initialTab) setActiveTab(initialTab);
    }, [initialTab]);

    // Bloqueia rolagem do fundo quando modal abre
    useLockBodyScroll(true);

    // --- LISTA UNIFICADA DE DOCUMENTOS ---
    const allAvailableDocs = useMemo(() => {
        const standard: { id: string; type: 'standard' | 'custom'; title: string; templateData?: any }[] = [
            { id: 'std_declaracao', type: 'standard', title: 'Declaração de Residência' }
        ];

        const custom = customTemplates.map(t => ({
            id: t.id,
            type: 'custom' as const,
            title: t.titulo,
            templateData: t
        }));

        return [...standard, ...custom];
    }, [customTemplates]);

    // --- FUNÇÕES DE SELEÇÃO ---
    const toggleDocSelection = (id: string) => {
        setSelectedDocIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedDocIds.length === allAvailableDocs.length) {
            setSelectedDocIds([]);
        } else {
            setSelectedDocIds(allAvailableDocs.map(d => d.id));
        }
    };

    // --- IMPRESSÃO EM LOTE ---
    const handleBatchPrint = async () => {
        if (selectedDocIds.length === 0) {
            showToast('error', 'Selecione pelo menos um documento.');
            return;
        }

        setShowDocMenu(false);
        showToast('success', `Iniciando impressão de ${selectedDocIds.length} documento(s)...`);

        const docsToPrint = allAvailableDocs.filter(d => selectedDocIds.includes(d.id));

        for (const doc of docsToPrint) {
            try {
                if (doc.type === 'standard') {
                    if (doc.id === 'std_declaracao') {
                        printDocuments(editedClient, { declaracao: true, procuracao: false });
                    }
                } else if (doc.type === 'custom') {
                    await printCustomTemplate(doc.templateData, editedClient);
                }
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                console.error(`Erro ao imprimir ${doc.title}`, error);
                showToast('error', `Erro ao gerar ${doc.title}`);
            }
        }
    };



    const handleSaveEditedClient = async () => {
        if (!editedClient.nome_completo || !editedClient.cpf_cnpj) {
            showToast('error', 'Nome e CPF são obrigatórios.');
            return;
        }

        if (editedClient.interviewStatus === 'Agendada' && !editedClient.interviewDate) {
            showToast('error', 'Selecione a data da entrevista agendada.');
            return;
        }

        await updateClient(editedClient);
        setIsEditMode(false);
    };



    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditedClient({ ...editedClient, foto: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDocumentUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const cleanClientName = client.nome_completo.replace(/[^a-zA-Z0-9]/g, '-');
            const folderName = `${client.id}_${cleanClientName}`;
            const { url, path } = await uploadFileToR2(file, folderName);
            const newDoc: ClientDocument = {
                id: crypto.randomUUID(),
                nome: file.name,
                tipo: file.type.includes('pdf') ? 'PDF' : 'IMG',
                data_upload: new Date().toISOString(),
                url,
                path
            };
            const updatedDocs = [...(client.documentos || []), newDoc];
            const updatedClient = { ...client, documentos: updatedDocs };
            await updateClient(updatedClient);
            setEditedClient(prev => ({ ...prev, documentos: updatedDocs }));
            showToast('success', 'Documento anexado com sucesso!');
        } catch (error) {
            console.error(error);
            showToast('error', 'Erro ao fazer upload.');
        } finally {
            setIsUploading(false);
            e.target.value = '';
        }
    }, [client]);

    const handleDeleteDocument = useCallback(async (doc: ClientDocument) => {
        if (!confirm(`Deseja excluir o documento "${doc.nome}"?`)) return;
        try {
            if (doc.path) await deleteFileFromR2(doc.path);
            const updatedDocs = (client.documentos || []).filter(d => d.id !== doc.id);
            const updatedClient = { ...client, documentos: updatedDocs };
            await updateClient(updatedClient);
            setEditedClient(prev => ({ ...prev, documentos: updatedDocs }));
            showToast('success', 'Documento removido.');
        } catch (error) {
            console.error(error);
            showToast('error', 'Erro ao excluir documento.');
        }
    }, [client]);

    const duplicateClient = isEditMode && editedClient.cpf_cnpj
        ? allClients.find(c => c.cpf_cnpj === editedClient.cpf_cnpj && c.id !== editedClient.id)
        : null;



    return (
        <>
            <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm overscroll-contain">
                <div className="bg-[#131418] rounded-xl max-w-4xl w-full h-[90vh] flex flex-col shadow-2xl border border-white/10 animate-in fade-in zoom-in duration-200 ring-1 ring-white/5">

                    {/* Header */}
                    <div className="p-6 border-b border-white/5 flex justify-between items-start bg-[#131418] rounded-t-xl shrink-0 relative overflow-visible z-50">
                        {/* Ambient Background Effect */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gold-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                        <div className="flex items-center gap-4 relative z-10">
                            <div className="relative group">
                                {editedClient.foto ? (
                                    <img src={editedClient.foto} alt={editedClient.nome_completo} className="w-16 h-16 rounded-full border-2 border-slate-700 object-cover" />
                                ) : (
                                    <div className={`w-16 h-16 rounded-full border-2 border-white/10 flex items-center justify-center text-2xl font-bold shadow-lg ${editedClient.pendencias && editedClient.pendencias.length > 0 ? 'bg-red-600 text-white ring-4 ring-red-600/20' : 'bg-zinc-700 text-zinc-300'}`}>
                                        {String(editedClient.nome_completo || '').substring(0, 2).toUpperCase()}
                                    </div>
                                )}
                                {isEditMode && <label className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"><Camera size={20} className="text-white" /><input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} /></label>}
                            </div>
                            <div className="flex-1">
                                {isEditMode ? (
                                    <>
                                        <input className="bg-[#18181b] border border-white/5 rounded px-2 py-1 text-xl font-bold text-white mb-1 w-full outline-none focus:border-gold-500 font-serif" value={editedClient.nome_completo} onChange={(e) => setEditedClient({ ...editedClient, nome_completo: e.target.value })} />
                                        <div className="relative">
                                            <input className={`bg-[#18181b] border rounded px-2 py-0.5 text-sm w-full outline-none ${duplicateClient ? 'border-red-500 text-red-400' : 'border-white/5 text-slate-400 focus:border-gold-500/50'}`} value={editedClient.cpf_cnpj} onChange={(e) => setEditedClient({ ...editedClient, cpf_cnpj: formatCPFOrCNPJ(e.target.value) })} />
                                            {duplicateClient && <p className="text-[10px] text-red-500 mt-1 absolute left-0 top-full">CPF já pertence a: <strong>{duplicateClient.nome_completo}</strong></p>}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2 group/name relative">
                                            <h2 className="text-2xl font-bold text-white font-serif">{String(client.nome_completo)}</h2>
                                            <button
                                                onClick={() => { navigator.clipboard.writeText(client.nome_completo || ''); showToast('success', 'Nome copiado!'); }}
                                                className="opacity-0 group-hover/name:opacity-100 transition-opacity text-slate-500 hover:text-white p-1"
                                                title="Copiar Nome"
                                            >
                                                <Copy size={16} />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2 group/cpf relative w-fit">
                                            <p className="text-slate-400 text-sm">{String(client.cpf_cnpj)}</p>
                                            <button
                                                onClick={() => { navigator.clipboard.writeText(client.cpf_cnpj || ''); showToast('success', 'CPF copiado!'); }}
                                                className="opacity-0 group-hover/cpf:opacity-100 transition-opacity text-slate-500 hover:text-white p-1"
                                                title="Copiar CPF"
                                            >
                                                <Copy size={14} />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <button
                                    onClick={() => setShowDocMenu(!showDocMenu)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${showDocMenu ? 'bg-gold-600 border-gold-600 text-white' : 'bg-[#18181b] border-white/5 text-slate-300 hover:text-white hover:border-white/20'}`}
                                >
                                    <Printer size={18} /> Docs <ChevronDown size={14} />
                                </button>

                                {showDocMenu && (
                                    <div className="absolute right-0 top-full mt-2 w-80 bg-[#18181b] border border-white/10 rounded-xl shadow-2xl z-50 p-3 animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-2 max-h-[400px] overflow-y-auto custom-scrollbar ring-1 ring-black">
                                        <button
                                            onClick={toggleSelectAll}
                                            className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-white/5 text-xs text-slate-400 hover:text-white mb-1"
                                        >
                                            <span>{selectedDocIds.length === allAvailableDocs.length ? 'Desmarcar Todos' : 'Selecionar Todos'}</span>
                                            <div className="text-gold-500">
                                                {selectedDocIds.length === allAvailableDocs.length ? <CheckSquare size={14} /> : <Square size={14} />}
                                            </div>
                                        </button>
                                        <div className="border-t border-white/5"></div>
                                        <div className="flex flex-col gap-1 mt-1">
                                            {allAvailableDocs.length === 0 && <p className="text-xs text-slate-500 text-center py-2">Nenhum documento disponível.</p>}
                                            {allAvailableDocs.map(doc => {
                                                const isSelected = selectedDocIds.includes(doc.id);
                                                return (
                                                    <div
                                                        key={doc.id}
                                                        onClick={() => toggleDocSelection(doc.id)}
                                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors border ${isSelected ? 'bg-gold-600/20 border-gold-600/50' : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/10'}`}
                                                    >
                                                        <div className={`text-gold-500 ${isSelected ? 'opacity-100' : 'opacity-40'}`}>
                                                            {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                                                        </div>
                                                        <span className={`text-sm flex-1 truncate ${isSelected ? 'text-white font-medium' : 'text-slate-300'}`}>
                                                            {doc.title}
                                                        </span>
                                                        {doc.type === 'custom' && <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-slate-400 uppercase">Mod</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="sticky bottom-0 bg-[#18181b] pt-2 mt-2 border-t border-white/5">
                                            <button
                                                onClick={handleBatchPrint}
                                                disabled={selectedDocIds.length === 0}
                                                className="w-full bg-gold-600 hover:bg-gold-500 disabled:bg-[#131418] disabled:text-slate-500 disabled:cursor-not-allowed text-white py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-gold-500/20"
                                            >
                                                <Printer size={14} /> Imprimir {selectedDocIds.length > 0 ? `(${selectedDocIds.length})` : ''}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="w-px h-8 bg-slate-800 mx-1"></div>
                            {isEditMode ? (
                                <button onClick={handleSaveEditedClient} disabled={!!duplicateClient} className="text-emerald-500 hover:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"><Save size={18} /> Salvar</button>
                            ) : (
                                <button onClick={() => setIsEditMode(true)} className="text-gold-500 hover:text-gold-400 bg-gold-500/10 hover:bg-gold-500/20 p-2 rounded-lg transition-colors" title="Editar"><Edit2 size={20} /></button>
                            )}
                            <div className="w-px h-8 bg-slate-800 mx-1"></div>

                            <button onClick={onClose} className="text-slate-500 hover:text-white p-2 hover:bg-slate-800 rounded-full transition-colors"><X size={24} /></button>
                        </div>
                    </div>

                    <div
                        ref={tabsContainerRef}
                        onWheel={handleTabsWheel}
                        className="flex border-b border-white/5 px-6 bg-[#131418] overflow-x-auto custom-scrollbar no-scrollbar shrink-0"
                    >
                        {tabsConfig.map((tab) => {
                            const Icon = tab.id === 'info' ? FileText :
                                tab.id === 'docs' ? UploadCloud :
                                    tab.id === 'credentials' ? Lock :
                                        tab.id === 'history' ? HistoryIcon :
                                            tab.id === 'cnis' ? Calculator :
                                                tab.id === 'rgp' ? Fish : FileText;

                            if (!tab.visible) return null;

                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-all shrink-0 whitespace-nowrap outline-none
                                        ${activeTab === tab.id
                                            ? 'border-gold-500 text-gold-500'
                                            : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'}`}
                                >
                                    <Icon size={16} /> {tab.label}
                                    {tab.id === 'docs' && (editedClient.documentos?.length || 0) > 0 && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1 ${activeTab === tab.id ? 'bg-gold-500/10 text-gold-500' : 'bg-slate-800 text-slate-400'}`}>
                                            {editedClient.documentos.length}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 bg-[#131418] custom-scrollbar relative z-10">
                        {activeTab === 'info' && (
                            <>
                                <ClientInfoTab
                                    client={client}
                                    editedClient={editedClient}
                                    isEditMode={isEditMode}
                                    setEditedClient={setEditedClient}
                                    setIsWhatsAppModalOpen={setIsWhatsAppModalOpen}
                                    cases={cases}
                                    onSelectCase={onSelectCase}
                                    openNewCaseWithParams={openNewCaseWithParams}
                                    onClose={onClose}
                                />
                            </>
                        )}

                        {activeTab === 'docs' && (
                            <ClientDocsTab
                                client={editedClient}
                                activeTab={activeTab}
                                isUploading={isUploading}
                                handleDocumentUpload={handleDocumentUpload}
                                handleDeleteDocument={handleDeleteDocument}
                            />
                        )}

                        {activeTab === 'credentials' && (
                            <ClientCredentialsTab
                                client={client}
                                activeTab={activeTab}
                                isEditMode={isEditMode}
                                editedClient={editedClient}
                                setEditedClient={setEditedClient}
                                showToast={showToast}
                            />
                        )}

                        {activeTab === 'history' && (
                            <ClientHistoryTab client={client} />
                        )}

                        {activeTab === 'cnis' && (
                            <ClientCnisTab client={client} onUpdate={updateClient} />
                        )}

                        {activeTab === 'rgp' && (
                            <ClientRgpTab
                                client={editedClient}
                                onUpdate={updateClient}
                                setEditedClient={setEditedClient}
                            />
                        )}
                    </div>

                    <div className="p-4 border-t border-white/5 bg-[#131418] flex justify-end items-center rounded-b-xl relative z-20">
                        <button onClick={onClose} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors text-sm">Voltar</button>
                    </div>
                </div>
            </div>



            {isWhatsAppModalOpen && client.telefone && (
                <WhatsAppModal
                    isOpen={isWhatsAppModalOpen}
                    onClose={() => setIsWhatsAppModalOpen(false)}
                    clientName={client.nome_completo}
                    phone={client.telefone}
                />
            )}
        </>
    );
};

export default ClientDetailsModal;
