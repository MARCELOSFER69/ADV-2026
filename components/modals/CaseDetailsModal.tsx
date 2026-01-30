import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Case, EventType, CaseStatus, CaseType, SystemAccess, CaseHistory, FinancialType, Event, CaseInstallment, FinancialRecord, GPS, ColumnConfig, TabConfig, SectionConfig } from '../../types';
import { Plus, Trash2, Calendar, FileText, CheckCircle, AlertTriangle, X, DollarSign, ArchiveRestore, Lock as LockIcon, Lock, ExternalLink, Copy, Eye, EyeOff, Globe, Edit2, Info, ChevronDown, ClipboardList, User, Clock, Check, FileSpreadsheet, HandCoins, Wallet, Circle, Save, Archive, CreditCard, LayoutDashboard, ChevronLeft, ChevronRight, MessageCircle, MapPin, Loader2, Shield, Gavel, History } from 'lucide-react';
import CustomSelect from '../ui/CustomSelect';
import { formatCurrencyInput, formatProcessNumber, parseCurrencyToNumber, formatCPFOrCNPJ } from '../../services/formatters';
import WhatsAppModal from './WhatsAppModal';
import { formatDateDisplay, formatDateForDB, getTodayBrasilia } from '../../utils/dateUtils';
import ProcessStepper from '../ui/ProcessStepper';
import { motion, AnimatePresence } from 'framer-motion';

interface CaseDetailsModalProps {
    caseItem: Case;
    onClose: () => void;
    onSelectCase?: (caseItem: Case) => void;
    onViewClient?: (clientId: string) => void;
    initialEditMode?: boolean;
}

import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';
import CaseHistoryTab from '../tabs/CaseHistoryTab';

const CHECKLIST_TEMPLATES: Record<CaseType, string[]> = {
    [CaseType.SEGURO_DEFESO]: ['RG e CPF do Pescador', 'Comprovante de Residência', 'Carteira de Pescador (RGP)', 'Guias de GPS (INSS)', 'Senha do GOV.BR'],
    [CaseType.SALARIO_MATERNIDADE]: ['Certidão de Nascimento da Criança', 'RG e CPF da Mãe', 'Comprovante de Residência Rural', 'Autodeclaração Rural', 'Carteirinha de Sindicato (se houver)'],
    [CaseType.APOSENTADORIA]: ['CNIS Completo', 'Carteira de Trabalho (CTPS)', 'Documentos Pessoais (RG/CPF)', 'Comprovante Rural (para segurado especial)', 'LTCAT/PPP (se especial)'],
    [CaseType.BPC_LOAS]: ['Cadastro Único (CadÚnico) Atualizado', 'RG e CPF de todos da casa', 'Laudos Médicos (Deficiência)', 'Receitas Médicas', 'Comprovante de Renda Familiar'],
    [CaseType.AUXILIO_DOENCA]: ['Laudo Médico Atualizado (< 30 dias)', 'Exames Complementares', 'Carteira de Trabalho', 'RG e CPF'],
    [CaseType.TRABALHISTA]: ['Termo de Rescisão', 'Extrato FGTS', 'Contracheques'],
    [CaseType.CIVIL]: ['Procuração', 'Identidade e CPF', 'Comprovante de Residência'],
};

const SAFE_APOSENTADORIA = 'Aposentadoria';
const SAFE_MATERNIDADE = 'Salário Maternidade';
const SAFE_BPC = 'BPC/LOAS';

const MODALITY_OPTIONS: Record<string, string[]> = {
    [SAFE_APOSENTADORIA]: ['Rural', 'Urbana', 'Híbrida'],
    [SAFE_MATERNIDADE]: ['Rural', 'Urbana', 'Outros'],
    [SAFE_BPC]: ['Deficiente', 'Idoso'],
    ['Auxílio Doença']: ['Previdenciário', 'Acidentário']
};

const COMMON_SYSTEMS = [
    { name: 'Meu INSS', url: 'https://meu.inss.gov.br/' },
    { name: 'Gov.br', url: 'https://www.gov.br/pt-br' },
    { name: 'PJe TRF-1', url: 'https://pje1g.trf1.jus.br/' },
    { name: 'PJe TRT', url: 'https://pje.trt16.jus.br/' },
    { name: 'Esaj TJMA', url: 'https://esaj.tjma.jus.br/' }
];

const BENEFIT_FIELDS: Record<string, { label: string, key: string, placeholder: string, type?: string }[]> = {
    [SAFE_APOSENTADORIA]: [
        { label: 'NIT', key: 'nit', placeholder: '000.00000.00-0' },
        { label: 'DER (Data de Entrada)', key: 'der', placeholder: '', type: 'date' }
    ],
    [SAFE_MATERNIDADE]: [
        { label: 'Data do Parto / Atestado', key: 'data_parto', placeholder: '', type: 'date' },
        { label: 'NIT', key: 'nit', placeholder: '000.00000.00-0' }
    ],
    [SAFE_BPC]: [
        { label: 'NIS / CadÚnico', key: 'nis', placeholder: '000.00000.00-0' },
        { label: 'Renda Familiar Est.', key: 'renda_familiar', placeholder: 'R$ 0,00' }
    ],
    ['Auxílio Doença']: [
        { label: 'NIT', key: 'nit', placeholder: '000.00000.00-0' },
        { label: 'CID (Opcional)', key: 'cid', placeholder: 'Ex: M54.5' },
        { label: 'Data Início Incapacidade', key: 'data_incapacidade', placeholder: '', type: 'date' }
    ]
};

const CaseDetailsModal: React.FC<CaseDetailsModalProps> = ({ caseItem, onClose, onSelectCase, onViewClient, initialEditMode = false }) => {
    const {
        clients, cases, updateCase, deleteCase,
        financial, addFinancialRecord, deleteFinancialRecord,
        events, addEvent, updateEvent, deleteEvent,
        tasks, toggleTask, addTask, deleteTask,

        showToast,
        getInstallments, generateInstallments, updateInstallment, toggleInstallmentPaid,
        updateGPS, officeExpenses,
        user, saveUserPreferences, saveGlobalPreferences, mergedPreferences
    } = useApp();

    const [activeTab, setActiveTab] = useState<'details' | 'checklist' | 'access' | 'history'>('details');

    useLockBodyScroll(true);
    const [isEditMode, setIsEditMode] = useState(initialEditMode);

    const [isLayoutEditMode, setIsLayoutEditMode] = useState(false);
    const [tempTabLayout, setTempTabLayout] = useState<TabConfig[]>([]);
    const [tempSectionLayout, setTempSectionLayout] = useState<SectionConfig[]>([]);

    const defaultTabs: TabConfig[] = useMemo(() => [
        { id: 'details', label: 'Detalhes', visible: true, order: 0 },
        { id: 'checklist', label: 'Checklist', visible: true, order: 1 },
        { id: 'access', label: 'Acessos', visible: true, order: 2 },
        { id: 'history', label: 'Histórico', visible: true, order: 3 },
    ], []);

    const tabsConfig = useMemo(() => {
        const saved = mergedPreferences.caseDetailsLayout?.tabs || [];
        const merged = [...defaultTabs];
        saved.forEach(s => {
            const idx = merged.findIndex(d => d.id === s.id);
            if (idx !== -1) merged[idx] = { ...merged[idx], ...s };
        });
        return merged.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }, [mergedPreferences.caseDetailsLayout?.tabs, defaultTabs]);

    const defaultSections: SectionConfig[] = useMemo(() => [
        { id: 'process_data', label: 'Dados do Processo', visible: true, order: 0 },
        { id: 'fees', label: 'Honorários & Valores', visible: true, order: 1 },
        { id: 'installments', label: 'Cronograma do Seguro', visible: true, order: 2 },
        { id: 'sla', label: 'Prazo Fatal (SLA)', visible: true, order: 3 },
        { id: 'gps', label: 'Guias GPS', visible: true, order: 4 },
        { id: 'events', label: 'Próximos Eventos', visible: true, order: 5 },
        { id: 'financials', label: 'Movimentações Financeiras', visible: true, order: 6 },
        { id: 'contact', label: 'Contato Rápido', visible: true, order: 7 },
    ], []);

    const sectionsConfig = useMemo(() => {
        const saved = mergedPreferences.caseDetailsLayout?.sections || [];
        const merged = [...defaultSections];
        saved.forEach(s => {
            const idx = merged.findIndex(d => d.id === s.id);
            if (idx !== -1) merged[idx] = { ...merged[idx], ...s };
        });
        return merged.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }, [mergedPreferences.caseDetailsLayout?.sections, defaultSections]);

    // Dados do Caso Ativo (Sempre atualizado do contexto)
    const liveCase = cases.find(c => c.id === caseItem.id) || caseItem;
    const client = clients.find(c => c.id === caseItem.client_id);

    // Form States
    const [editedCase, setEditedCase] = useState<Case>(liveCase);
    const [currencyInput, setCurrencyInput] = useState(formatCurrencyInput((liveCase.valor_causa || 0).toFixed(2)));
    const [honorariosInput, setHonorariosInput] = useState(formatCurrencyInput((liveCase.valor_honorarios_pagos || 0).toFixed(2)));



    // Financial State
    const [newFinancial, setNewFinancial] = useState<{ desc: string, type: FinancialType, val: string, date: string, isHonorary: boolean }>({
        desc: '',
        type: FinancialType.DESPESA,
        val: '',
        date: new Date().toISOString().substring(0, 10),
        isHonorary: false
    });
    const [isAddingFinancial, setIsAddingFinancial] = useState(false);
    const [captadorCommission, setCaptadorCommission] = useState<string | null>(null);

    // GPS State
    const [newGpsCompetencia, setNewGpsCompetencia] = useState('');
    const [isAddingGps, setIsAddingGps] = useState(false);
    const [editingGpsId, setEditingGpsId] = useState<string | null>(null);
    const [editingGpsValue, setEditingGpsValue] = useState('');

    const [showNewModalityInput, setShowNewModalityInput] = useState(false);
    const [newModalityValue, setNewModalityValue] = useState('');

    const [showNewTypeInput, setShowNewTypeInput] = useState(false);
    const [newTypeValue, setNewTypeValue] = useState('');

    // Other Modal States
    const [isAddingEvent, setIsAddingEvent] = useState(false);
    const [newEvent, setNewEvent] = useState<Partial<Event>>({ data_hora: new Date().toISOString().substring(0, 16), tipo: EventType.PERICIA });
    const [isCustomEventType, setIsCustomEventType] = useState(false);
    const [customEventType, setCustomEventType] = useState('');
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);
    const [isCustomEditEventType, setIsCustomEditEventType] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [isAddingAccess, setIsAddingAccess] = useState(false);
    const [newAccess, setNewAccess] = useState<Partial<SystemAccess>>({});
    const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
    const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
    const [restoreReason, setRestoreReason] = useState('');
    const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

    // Installments State
    const [installments, setInstallments] = useState<CaseInstallment[]>([]);
    const [isGeneratingInstallments, setIsGeneratingInstallments] = useState(false);
    const [installmentStartDate, setInstallmentStartDate] = useState(formatDateForDB(new Date()) || '');

    // ==================================================================================
    // ESTADOS DOS MODAIS DE PAGAMENTO
    // ==================================================================================

    // 1. Pagamento de Parcelas (Seguro Defeso)
    const [installmentToPay, setInstallmentToPay] = useState<CaseInstallment | null>(null);
    const [instPayData, setInstPayData] = useState({
        method: 'Conta' as 'Especie' | 'Conta',
        receiver: '',
        accType: 'PJ' as 'PJ' | 'PF',
        account: '',
        isAddingReceiver: false,
        isAddingAccount: false
    });

    // 2. Pagamento de GPS
    const [gpsToPay, setGpsToPay] = useState<GPS | null>(null);
    const [gpsPayData, setGpsPayData] = useState({
        method: 'Pix' as 'Boleto' | 'Pix',
        payer: '',
        isAddingPayer: false,
        accType: 'PJ' as 'PJ' | 'PF',
        account: '',
        isAddingAccount: false
    });

    // 3. Pagamento de Honorários (Status do Processo)
    const [isConfirmingHonorarios, setIsConfirmingHonorarios] = useState(false);
    const [honorariosData, setHonorariosData] = useState({
        method: 'Conta' as 'Especie' | 'Conta',
        receiver: '',
        accType: 'PJ' as 'PJ' | 'PF',
        account: '',
        isAddingReceiver: false,
        isAddingAccount: false
    });

    // ==================================================================================
    // CALCULATED VALUES
    // ==================================================================================

    const caseFinancials = financial.filter(f => f.case_id === caseItem.id).sort((a, b) => new Date(b.data_vencimento || '').getTime() - new Date(a.data_vencimento || '').getTime());
    const caseEvents = events.filter(e => e.case_id === caseItem.id);
    const caseTasks = tasks.filter(t => t.case_id === caseItem.id);

    const isSeguroDefeso = liveCase.tipo === CaseType.SEGURO_DEFESO;
    const isSeguroDefesoFinished = isSeguroDefeso && liveCase.status === CaseStatus.CONCLUIDO_CONCEDIDO;

    const totalHonorariosFromFinancials = useMemo(() => {
        if (isSeguroDefeso) return liveCase.valor_honorarios_pagos || 0;
        return caseFinancials
            .filter(f => f.is_honorary)
            .reduce((acc, curr) => acc + (curr.valor || 0), 0);
    }, [caseFinancials, isSeguroDefeso, liveCase.valor_honorarios_pagos]);

    const availableStatuses = useMemo(() => {
        const administrativeTypes = [CaseType.SEGURO_DEFESO, CaseType.APOSENTADORIA, CaseType.SALARIO_MATERNIDADE, CaseType.BPC_LOAS, CaseType.AUXILIO_DOENCA];
        if (editedCase.tipo && administrativeTypes.includes(editedCase.tipo as CaseType)) {
            return [CaseStatus.ANALISE, CaseStatus.EXIGENCIA, CaseStatus.CONCLUIDO_CONCEDIDO, CaseStatus.CONCLUIDO_INDEFERIDO];
        }
        return Object.values(CaseStatus);
    }, [editedCase.tipo]);

    const currentModalityOptions = useMemo(() => {
        const type = editedCase.tipo as string;
        if (!type) return [];
        const baseOptions = MODALITY_OPTIONS[type] || [];
        const customOptions = user?.preferences?.customModalities?.[type] || [];
        return Array.from(new Set([...baseOptions, ...customOptions]));
    }, [editedCase.tipo, user?.preferences?.customModalities]);

    // Listas para Sugestão (Dropdowns)
    const existingReceivers = useMemo(() => {
        const fromFin = financial.map(f => f.captador_nome).filter(Boolean);
        const fromExp = officeExpenses.map(e => e.pagador).filter(Boolean);
        return Array.from(new Set([...fromFin, ...fromExp]));
    }, [financial, officeExpenses]);

    const existingAccounts = useMemo(() => {
        return Array.from(new Set(officeExpenses.map(e => e.conta).filter(Boolean)));
    }, [officeExpenses]);

    // ==================================================================================
    // EFFECTS
    // ==================================================================================

    useEffect(() => {
        if (!isEditMode) {
            setEditedCase(liveCase);
            setCurrencyInput(formatCurrencyInput((liveCase.valor_causa || 0).toFixed(2)));
            setHonorariosInput(formatCurrencyInput((liveCase.valor_honorarios_pagos || 0).toFixed(2)));
        }
    }, [liveCase, isEditMode]);

    // Bloqueia rolagem do fundo quando modal abre
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    useEffect(() => {
        setTempTabLayout(tabsConfig);
        setTempSectionLayout(sectionsConfig);
    }, [tabsConfig, sectionsConfig]);

    useEffect(() => {
        if (isSeguroDefesoFinished) {
            const fetchInst = async () => {
                const data = await getInstallments(liveCase.id);
                setInstallments(data);
            };
            fetchInst();
        }
    }, [liveCase.id, isSeguroDefesoFinished]);

    useEffect(() => {
        if (newFinancial.type === FinancialType.COMISSAO && client?.captador) {
            setCaptadorCommission(client.captador);
            if (!newFinancial.desc) {
                setNewFinancial(prev => ({ ...prev, desc: `Comissão - ${client.captador}` }));
            }
        } else {
            setCaptadorCommission(null);
        }
    }, [newFinancial.type, client]);

    useEffect(() => {
        setTempTabLayout(tabsConfig);
        setTempSectionLayout(sectionsConfig);
    }, [tabsConfig, sectionsConfig]);

    // ==================================================================================
    // HANDLERS
    // ==================================================================================



    const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => { const val = e.target.value; const formatted = formatCurrencyInput(val); setCurrencyInput(formatted); setEditedCase({ ...editedCase, valor_causa: parseCurrencyToNumber(formatted) }); };
    const handleHonorariosChange = (e: React.ChangeEvent<HTMLInputElement>) => { const val = e.target.value; const formatted = formatCurrencyInput(val); setHonorariosInput(formatted); setEditedCase({ ...editedCase, valor_honorarios_pagos: parseCurrencyToNumber(formatted) }); };

    const handleWhatsAppClick = () => {
        if (!client?.telefone) { showToast('error', 'Cliente sem telefone.'); return; }
        setIsWhatsAppModalOpen(true);
    };

    const handleCopySummary = () => {
        const summary = `📋 *RESUMO DO PROCESSO*\n*Cliente:* ${client?.nome_completo}\n*Ação:* ${liveCase.titulo}\n*Número:* ${liveCase.numero_processo}\n*Status:* ${liveCase.status}\n*Tribunal:* ${liveCase.tribunal}`.trim();
        navigator.clipboard.writeText(summary);
        showToast('success', 'Copiado!');
    };

    const confirmRestore = async () => {
        if (!restoreReason.trim()) { showToast('error', 'Informe o motivo.'); return; }
        await updateCase({ ...liveCase, status: CaseStatus.ANALISE, motivo_arquivamento: undefined }, `Motivo da Restauração: ${restoreReason}`);
        setIsRestoreModalOpen(false); setRestoreReason(''); showToast('success', 'Processo restaurado.');
    };

    // --- SAVE CASE & HONORÁRIOS ---
    const handleStatusPagamentoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value;
        setEditedCase({ ...editedCase, status_pagamento: newStatus as any });
    };

    const handleSave = async () => {
        // Validação: Só permite salvar como "Pago" se estiver Concluído (Concedido)
        if (editedCase.status_pagamento === 'Pago' && editedCase.status !== CaseStatus.CONCLUIDO_CONCEDIDO) {
            showToast('error', 'Honorários só podem ser pagos se o status for Concluído (Concedido).');
            return;
        }

        // Se for "Pago", abre modal de confirmação
        if (editedCase.status_pagamento === 'Pago') {
            setIsConfirmingHonorarios(true);
            setHonorariosData({
                method: 'Conta',
                receiver: existingReceivers[0] || '',
                accType: 'PJ',
                account: existingAccounts[0] || '',
                isAddingReceiver: false,
                isAddingAccount: false
            });
            return;
        }

        // Se não for pago, salva normalmente
        await updateCase(editedCase);
        setIsEditMode(false);
    };

    const finalizeSaveWithHonorarios = async () => {
        const payload = { ...editedCase };

        payload.honorarios_forma_pagamento = honorariosData.method;

        if (honorariosData.method === 'Conta') {
            payload.honorarios_recebedor = honorariosData.receiver;
            payload.honorarios_tipo_conta = honorariosData.accType;
            payload.honorarios_conta = honorariosData.account;
        } else {
            payload.honorarios_recebedor = undefined;
            payload.honorarios_tipo_conta = undefined;
            payload.honorarios_conta = undefined;
        }

        await updateCase(payload);

        setIsEditMode(false);
        setIsConfirmingHonorarios(false);
    };

    const handleAddNewModality = async () => {
        const type = editedCase.tipo as string;
        if (!type || !newModalityValue.trim()) return;

        const val = newModalityValue.trim();
        const currentCustom = user?.preferences?.customModalities || {};
        const typeCustom = currentCustom[type] || [];

        if (typeCustom.includes(val) || (MODALITY_OPTIONS[type] || []).includes(val)) {
            showToast('error', 'Esta modalidade já existe.');
            return;
        }

        const updatedCustom = {
            ...currentCustom,
            [type]: [...typeCustom, val]
        };

        await saveUserPreferences({ customModalities: updatedCustom });
        setEditedCase(prev => ({ ...prev, modalidade: val }));
        setShowNewModalityInput(false);
        setNewModalityValue('');
        showToast('success', 'Nova modalidade adicionada!');
    };

    const handleAddNewType = async () => {
        if (!newTypeValue.trim()) return;
        const val = newTypeValue.trim();
        const currentCustom = user?.preferences?.customCaseTypes || [];

        if (Object.values(CaseType).includes(val as any) || currentCustom.includes(val)) {
            showToast('error', 'Este tipo já existe.');
            return;
        }

        const updatedCustom = [...currentCustom, val];
        await saveUserPreferences({ customCaseTypes: updatedCustom });

        setEditedCase(prev => ({
            ...prev,
            tipo: val,
            modalidade: undefined // Reset modality for new type
        }));
        setShowNewTypeInput(false);
        setNewTypeValue('');
        showToast('success', 'Novo tipo adicionado!');
    };

    // --- GPS LOGIC ---
    const handleAddGps = async () => {
        if (!newGpsCompetencia) { showToast('error', 'Informe a competência.'); return; }
        let formattedCompetencia = newGpsCompetencia;
        if (newGpsCompetencia.includes('-')) {
            const [year, month] = newGpsCompetencia.split('-');
            formattedCompetencia = `${month}/${year}`;
        }
        const newGps: GPS = { id: crypto.randomUUID(), competencia: formattedCompetencia, valor: 0, status: 'Pendente' };
        const updatedList = [...(liveCase.gps_lista || []), newGps];
        await updateCase({ ...liveCase, gps_lista: updatedList });
        setIsAddingGps(false); setNewGpsCompetencia(''); showToast('success', 'GPS adicionada.');
    };

    const handleChangeGpsStatus = async (gpsId: string, currentStatus: string, currentValue: number) => {
        const gps = liveCase.gps_lista?.find(g => g.id === gpsId);
        if (!gps) return;

        if (currentStatus === 'Pendente') {
            setEditingGpsId(gpsId);
            setEditingGpsValue(formatCurrencyInput(currentValue.toFixed(2)));
        } else if (currentStatus === 'Puxada') {
            setGpsToPay(gps);
            setGpsPayData({
                method: 'Pix',
                payer: existingReceivers[0] || '',
                isAddingPayer: false,
                accType: 'PJ',
                account: existingAccounts[0] || '',
                isAddingAccount: false
            });
        }
    };

    const confirmGPSPayment = async () => {
        if (!gpsToPay || !liveCase.gps_lista) return;

        const updatedGps: GPS = {
            ...gpsToPay,
            status: 'Paga',
            data_pagamento: new Date().toISOString(),
            forma_pagamento: gpsPayData.method,
            pagador: gpsPayData.payer
        };

        const updatedList = liveCase.gps_lista.map(g => g.id === gpsToPay.id ? updatedGps : g);
        await updateCase({ ...liveCase, gps_lista: updatedList });

        await addFinancialRecord({
            id: crypto.randomUUID(),
            case_id: liveCase.id,
            descricao: `GPS Competência ${updatedGps.competencia} (${client?.nome_completo})`,
            tipo: FinancialType.DESPESA,
            valor: updatedGps.valor,
            data_vencimento: getTodayBrasilia(),
            status_pagamento: true,
            tipo_movimentacao: 'GPS',
            forma_pagamento: gpsPayData.method,
            recebedor: gpsPayData.payer,
            tipo_conta: gpsPayData.accType,
            conta: gpsPayData.account
        });

        setGpsToPay(null);
        showToast('success', 'GPS Paga e Despesa Lançada!');
    };

    const handleSaveGpsValue = async (gpsId: string) => {
        const val = parseCurrencyToNumber(editingGpsValue);
        const updatedList = (liveCase.gps_lista || []).map(g => {
            if (g.id === gpsId) return { ...g, valor: val, status: 'Puxada' as 'Puxada' };
            return g;
        });
        await updateCase({ ...liveCase, gps_lista: updatedList });
        setEditingGpsId(null);
        showToast('success', 'Valor definido.');
    };

    const handleDeleteGps = async (gps: GPS) => {
        if (!window.confirm(`Excluir GPS da competência ${gps.competencia}?`)) return;
        const updatedList = (liveCase.gps_lista || []).filter(g => g.id !== gps.id);
        await updateCase({ ...liveCase, gps_lista: updatedList });
        showToast('success', 'GPS excluída.');
    };

    // --- INSTALLMENT HANDLERS (SEGURO DEFESO) ---
    const handleGenerateInstallments = async () => {
        setIsGeneratingInstallments(true);
        await generateInstallments(liveCase.id, installmentStartDate);
        const data = await getInstallments(liveCase.id);
        setInstallments(data);
        setIsGeneratingInstallments(false);
    };

    const handleInstallmentChange = async (index: number, field: 'data_vencimento' | 'valor' | 'destino', value: string) => {
        const updatedInstallments = [...installments];
        const inst = { ...updatedInstallments[index] };

        if (field === 'data_vencimento') inst.data_vencimento = value;
        if (field === 'valor') inst.valor = parseFloat(value);
        if (field === 'destino') inst.destino = value as 'Escritório' | 'Cliente';

        updatedInstallments[index] = inst;
        setInstallments(updatedInstallments);

        if (field === 'destino') {
            await updateInstallment(inst, client?.nome_completo || 'Cliente');
        }
    };

    const handleInstallmentSave = async (inst: CaseInstallment) => {
        await updateInstallment(inst, client?.nome_completo || 'Cliente');
    };

    const handleToggleInstallmentPaid = async (inst: CaseInstallment) => {
        if (inst.pago) {
            await toggleInstallmentPaid(inst, client?.nome_completo || 'Cliente');
            const data = await getInstallments(liveCase.id);
            setInstallments(data);
        } else {
            if (inst.destino === 'Escritório') {
                setInstallmentToPay(inst);
                setInstPayData({
                    method: 'Conta',
                    receiver: existingReceivers[0] || '',
                    accType: 'PJ',
                    account: existingAccounts[0] || '',
                    isAddingReceiver: false,
                    isAddingAccount: false
                });
            } else {
                await toggleInstallmentPaid(inst, client?.nome_completo || 'Cliente');
                const data = await getInstallments(liveCase.id);
                setInstallments(data);
            }
        }
    };

    const confirmInstallmentPayment = async () => {
        if (!installmentToPay || !client) return;

        const details = {
            forma_pagamento: instPayData.method,
            recebedor: instPayData.method === 'Conta' ? instPayData.receiver : null,
            tipo_conta: instPayData.method === 'Conta' ? instPayData.accType : null,
            conta: instPayData.method === 'Conta' ? instPayData.account : null
        };

        await toggleInstallmentPaid(installmentToPay, client.nome_completo, details);
        const data = await getInstallments(liveCase.id);
        setInstallments(data);
        setInstallmentToPay(null);
    };

    // --- SECTION HANDLERS ---
    const toggleSection = (sectionId: string) => {
        const newLayout = tempSectionLayout.map(s => s.id === sectionId ? { ...s, visible: !s.visible } : s);
        setTempSectionLayout(newLayout);
    };

    const moveSection = (sectionId: string, direction: -1 | 1) => {
        const idx = tempSectionLayout.findIndex(s => s.id === sectionId);
        if (idx === -1) return;
        const newIdx = idx + direction;
        if (newIdx < 0 || newIdx >= tempSectionLayout.length) return;

        const newLayout = [...tempSectionLayout];
        [newLayout[idx], newLayout[newIdx]] = [newLayout[newIdx], newLayout[idx]];
        newLayout.forEach((s, i) => s.order = i); // Re-index order
        setTempSectionLayout(newLayout);
    };

    // --- FINANCIAL RECORD (AVULSO) ---
    const handleAddFinancial = async () => {
        if (!newFinancial.val) { showToast('error', 'Digite um valor!'); return; }
        const isCommission = newFinancial.type === FinancialType.COMISSAO;
        const captadorNome = isCommission ? (client?.captador || null) : null;
        if (isCommission && !captadorNome) { showToast('error', 'Sem captador vinculado.'); return; }

        const newRecord: FinancialRecord = {
            id: crypto.randomUUID(),
            case_id: liveCase.id,
            client_id: liveCase.client_id,
            descricao: newFinancial.desc || (isCommission ? `Pagamento de Comissão - ${captadorNome}` : (newFinancial.type === FinancialType.RECEITA ? (newFinancial.isHonorary ? 'Honorários' : 'Receita Avulsa') : 'Despesa Avulsa')),
            tipo: isCommission ? FinancialType.DESPESA : newFinancial.type,
            tipo_movimentacao: isCommission ? 'Comissao' : (newFinancial.isHonorary ? 'Honorários' : 'Outros'),
            valor: parseCurrencyToNumber(newFinancial.val),
            data_vencimento: newFinancial.date ? new Date(newFinancial.date).toISOString() : new Date().toISOString(),
            status_pagamento: true,
            captador_nome: captadorNome || undefined,
            is_honorary: newFinancial.isHonorary
        };

        try {
            await addFinancialRecord(newRecord);
            setNewFinancial({ desc: '', type: FinancialType.DESPESA, val: '', date: new Date().toISOString().substring(0, 10), isHonorary: false });
            setIsAddingFinancial(false);
        } catch (err: any) {
            showToast('error', 'Erro ao adicionar.');
        }
    };

    // --- EVENTS, TASKS, ACCESS ---
    const handleAddEvent = async () => {
        if (!newEvent.titulo || !newEvent.data_hora) { showToast('error', 'Preencha título e data.'); return; }

        const finalTipo = isCustomEventType ? customEventType : newEvent.tipo;
        if (isCustomEventType && !customEventType.trim()) {
            showToast('error', 'Digite o tipo do evento.');
            return;
        }

        await addEvent({
            id: crypto.randomUUID(),
            case_id: liveCase.id,
            titulo: newEvent.titulo,
            data_hora: new Date(newEvent.data_hora).toISOString(),
            tipo: finalTipo as EventType,
            cidade: newEvent.cidade
        });

        setIsAddingEvent(false);
        setNewEvent({ tipo: EventType.PERICIA, data_hora: new Date().toISOString().slice(0, 16) });
        setIsCustomEventType(false);
        setCustomEventType('');
    };
    const handleAddAccess = async () => { if (!newAccess.nome_sistema || !newAccess.url) { showToast('error', 'Nome e URL obrigatórios.'); return; } const updatedAccess = [...(liveCase.acessos || []), { id: crypto.randomUUID(), nome_sistema: newAccess.nome_sistema!, url: newAccess.url!, login: newAccess.login || '', senha: newAccess.senha || '' }]; await updateCase({ ...liveCase, acessos: updatedAccess }); setNewAccess({}); setIsAddingAccess(false); showToast('success', 'Acesso salvo!'); };
    const handleDeleteAccess = async (accessId: string) => { const updatedAccess = (liveCase.acessos || []).filter(a => a.id !== accessId); await updateCase({ ...liveCase, acessos: updatedAccess }); showToast('success', 'Acesso removido.'); };
    const handleRemoveEvent = async (id: string) => {
        if (!window.confirm('Tem certeza que deseja remover este evento?')) return;
        await deleteEvent(id);
    };

    const handleEditEvent = (event: Event) => {
        setEditingEvent({ ...event, data_hora: new Date(event.data_hora).toISOString().substring(0, 16) });
        setIsCustomEditEventType(false);
    };

    const handleUpdateEventLocal = async () => {
        if (!editingEvent) return;
        await updateEvent({
            ...editingEvent,
            tipo: isCustomEditEventType ? (customEventType as EventType) : editingEvent.tipo,
            data_hora: new Date(editingEvent.data_hora).toISOString()
        });
        setEditingEvent(null);
    };

    const handleAddTask = async () => {
        if (!newTaskTitle.trim()) return;
        await addTask({
            id: crypto.randomUUID(),
            case_id: liveCase.id,
            titulo: newTaskTitle.trim(),
            concluido: false
        });
        setNewTaskTitle('');
    };

    const handleToggleTask = async (id: string) => {
        await toggleTask(id);
    };

    const handleDeleteTask = async (id: string) => {
        if (window.confirm('Excluir item do checklist?')) {
            await deleteTask(id);
        }
    };
    const togglePasswordVisibility = (id: string) => { setShowPassword(prev => ({ ...prev, [id]: !prev[id] })); };
    const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); showToast('success', 'Copiado!'); };


    // ==================================================================================
    // RENDER
    // ==================================================================================

    const isHonorariosLocked = editedCase.status !== CaseStatus.CONCLUIDO_CONCEDIDO;

    return (
        <>
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                <div className="w-full max-w-6xl h-[90vh] bg-[#131418] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-500 ring-1 ring-white/5">
                    <div className="flex flex-col h-full bg-[#131418]">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[#131418] shrink-0 relative overflow-visible z-50">
                            {/* Ambient Background Effect */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-gold-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                            <div className="flex-1 min-w-0 relative z-10">
                                <div className="flex items-center gap-3 text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">
                                    <span>{liveCase.tipo}</span>
                                    <span className="text-zinc-700">•</span>
                                    <span className="text-gold-500">{liveCase.modalidade || 'Processo'}</span>
                                </div>
                                {isEditMode ? (
                                    <input
                                        className="text-2xl font-serif bg-[#18181b] border border-white/5 rounded px-2 py-1 text-white w-full max-w-lg outline-none focus:border-gold-500"
                                        value={editedCase.titulo}
                                        onChange={e => setEditedCase({ ...editedCase, titulo: e.target.value })}
                                    />
                                ) : (
                                    <h2 className="text-2xl font-serif text-white truncate max-w-md">{liveCase.titulo}</h2>
                                )}
                                <div className="flex items-center gap-2 mt-1 text-sm text-slate-400 group/client">
                                    {client && (
                                        <>
                                            <User size={14} className="text-gold-500/70" />
                                            <span className="font-medium hover:text-gold-500 cursor-pointer transition-colors" onClick={() => onViewClient?.(client.id)}>{client.nome_completo}</span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigator.clipboard.writeText(client?.nome_completo || '');
                                                    showToast('success', 'Nome copiado!');
                                                }}
                                                className="text-zinc-500 hover:text-white p-0.5 ml-1 transition-opacity opacity-0 group-hover/client:opacity-100"
                                                title="Copiar Nome"
                                            >
                                                <Copy size={12} />
                                            </button>
                                            <span className="text-zinc-700 mx-1">•</span>
                                            <span className="flex items-center gap-1 group/cpf cursor-default">
                                                {formatCPFOrCNPJ(client.cpf_cnpj || '')}
                                                <button
                                                    onClick={() => { navigator.clipboard.writeText(client.cpf_cnpj || ''); showToast('success', 'CPF copiado!'); }}
                                                    className="opacity-0 group-hover/cpf:opacity-100 transition-opacity text-zinc-500 hover:text-white p-0.5 ml-1"
                                                    title="Copiar CPF"
                                                >
                                                    <Copy size={12} />
                                                </button>
                                            </span>
                                        </>
                                    )}
                                </div>
                                {liveCase.status === CaseStatus.ARQUIVADO && (
                                    <div className="mt-3 bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 rounded-lg text-sm flex items-center gap-2 w-fit">
                                        <Archive size={16} />
                                        <span><strong>Arquivado:</strong> {liveCase.motivo_arquivamento || 'Sem motivo informado.'}</span>
                                        <button
                                            onClick={() => { setIsRestoreModalOpen(true); setRestoreReason(''); }}
                                            className="ml-4 text-xs bg-red-500/20 hover:bg-red-500/30 px-2 py-1 rounded flex items-center gap-1 transition-colors active-scale"
                                        >
                                            <ArchiveRestore size={12} /> Restaurar
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-start gap-2 ml-4">
                                <button onClick={handleCopySummary} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)] rounded-lg transition-colors active-scale" title="Copiar Resumo"><Copy size={18} /></button>
                                <AnimatePresence mode="wait">
                                    {!isEditMode ? (
                                        <motion.button
                                            key="edit-btn"
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => setIsEditMode(true)}
                                            className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors font-medium text-sm shadow-lg shadow-yellow-900/20 active-scale"
                                        >
                                            <Edit2 size={16} /> Editar
                                        </motion.button>
                                    ) : (
                                        <motion.button
                                            key="save-btn"
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={handleSave}
                                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium text-sm shadow-lg shadow-emerald-900/20 active-scale"
                                        >
                                            <Save size={16} /> Salvar
                                        </motion.button>
                                    )}
                                </AnimatePresence>
                                <div className="w-px h-8 bg-[var(--border-main)] mx-1"></div>
                                <button onClick={onClose} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)] rounded-lg transition-colors active-scale"><X size={20} /></button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-white/5 px-6 bg-[#131418] overflow-x-auto custom-scrollbar no-scrollbar shrink-0">
                            {tabsConfig.map((tab) => {
                                const Icon = tab.id === 'details' ? FileText :
                                    tab.id === 'checklist' ? ClipboardList :
                                        tab.id === 'access' ? LockIcon :
                                            tab.id === 'history' ? History : FileText;

                                if (!tab.visible) return null;

                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors shrink-0 whitespace-nowrap active-scale ${activeTab === tab.id ? 'border-gold-500 text-gold-500' : 'border-transparent text-slate-400 hover:text-white'}`}
                                    >
                                        <Icon size={16} /> {tab.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#131418]">

                            {/* DETAILS TAB */}
                            {
                                activeTab === 'details' && (
                                    <div className="flex flex-col gap-6">
                                        <div className="bg-[#18181b] border border-white/5 rounded-2xl p-4 shadow-inner overflow-hidden">
                                            <ProcessStepper
                                                currentStatus={liveCase.status || ''}
                                                caseType={liveCase.tipo}
                                                events={caseEvents}
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                            {/* Left Column: Basic Info & Financial */}
                                            <div className="lg:col-span-2 space-y-8">
                                                {/* 1. Dados do Processo */}
                                                <div className="bg-[#18181b] border border-white/5 rounded-xl p-6 shadow-sm">
                                                    <h3 className="text-sm font-bold text-slate-400 uppercase mb-5 flex items-center gap-2 tracking-wider"><FileText size={16} className="text-gold-500" /> Dados do Processo</h3>
                                                    <div className="grid grid-cols-2 gap-6">
                                                        <div className="space-y-1">
                                                            <label className="block text-xs font-bold text-slate-500 mb-1">Número</label>
                                                            <AnimatePresence mode="wait">
                                                                {isEditMode ? (
                                                                    <motion.div
                                                                        key="edit-numero"
                                                                        initial={{ opacity: 0, y: -10 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        exit={{ opacity: 0, y: 10 }}
                                                                        transition={{ duration: 0.2 }}
                                                                    >
                                                                        <input
                                                                            className="w-full bg-[#131418] border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:border-gold-500 outline-none transition-all"
                                                                            value={editedCase.numero_processo}
                                                                            onChange={e => setEditedCase({ ...editedCase, numero_processo: formatProcessNumber(e.target.value) })}
                                                                        />
                                                                    </motion.div>
                                                                ) : (
                                                                    <motion.p
                                                                        key="view-numero"
                                                                        initial={{ opacity: 0, y: 10 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        exit={{ opacity: 0, y: -10 }}
                                                                        transition={{ duration: 0.2 }}
                                                                        className="text-[var(--text-main)] font-mono text-base font-semibold"
                                                                    >
                                                                        {liveCase.numero_processo || 'S/N'}
                                                                    </motion.p>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5 flex justify-between">
                                                                Tipo
                                                                {isEditMode && !showNewTypeInput && (
                                                                    <button type="button" onClick={() => setShowNewTypeInput(true)} className="text-gold-500 hover:text-gold-400 lowercase text-[9px] font-black tracking-widest bg-gold-500/5 px-2 py-0.5 rounded-full border border-gold-500/20 transition-all">+ adicionar</button>
                                                                )}
                                                            </label>
                                                            <AnimatePresence mode="wait">
                                                                {isEditMode ? (
                                                                    <motion.div
                                                                        key="edit-tipo"
                                                                        initial={{ opacity: 0, scale: 0.98 }}
                                                                        animate={{ opacity: 1, scale: 1 }}
                                                                        exit={{ opacity: 0, scale: 0.98 }}
                                                                        transition={{ duration: 0.15 }}
                                                                    >
                                                                        {showNewTypeInput ? (
                                                                            <div className="flex gap-2">
                                                                                <input
                                                                                    type="text"
                                                                                    autoFocus
                                                                                    className="flex-1 bg-[var(--bg-base)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-gold-500 transition-all"
                                                                                    placeholder="Novo tipo..."
                                                                                    value={newTypeValue}
                                                                                    onChange={(e) => setNewTypeValue(e.target.value)}
                                                                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddNewType())}
                                                                                />
                                                                                <button type="button" onClick={() => setShowNewTypeInput(false)} className="px-2 text-[var(--text-muted)] hover:text-white transition-colors"><X size={14} /></button>
                                                                                <button type="button" onClick={handleAddNewType} className="bg-gold-600 hover:bg-gold-500 text-white px-3 py-1 rounded-lg text-xs font-black border border-gold-500/50 shadow-lg shadow-gold-900/20 transition-all">Add</button>
                                                                            </div>
                                                                        ) : (
                                                                            <CustomSelect
                                                                                label=""
                                                                                value={editedCase.tipo}
                                                                                onChange={(val) => {
                                                                                    const nextType = val;
                                                                                    setEditedCase({
                                                                                        ...editedCase,
                                                                                        tipo: nextType as CaseType,
                                                                                        modalidade: (MODALITY_OPTIONS[nextType] || user?.preferences?.customModalities?.[nextType] || [])[0] || undefined
                                                                                    });
                                                                                }}
                                                                                options={[...Object.values(CaseType), ...(user?.preferences?.customCaseTypes || [])].map(t => ({ label: t, value: t }))}
                                                                                placeholder="Selecione o Tipo"
                                                                            />
                                                                        )}
                                                                    </motion.div>
                                                                ) : (
                                                                    <motion.p
                                                                        key="view-tipo"
                                                                        initial={{ opacity: 0, scale: 0.98 }}
                                                                        animate={{ opacity: 1, scale: 1 }}
                                                                        exit={{ opacity: 0, scale: 0.98 }}
                                                                        className="text-[var(--text-main)] font-medium text-base"
                                                                    >
                                                                        {liveCase.tipo}
                                                                    </motion.p>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>

                                                        {/* MODALIDADE DYNAMIC FIELD */}
                                                        {(currentModalityOptions.length > 0 || liveCase.modalidade) && (
                                                            <div className="space-y-1">
                                                                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5 flex justify-between">
                                                                    Modalidade
                                                                    {isEditMode && !showNewModalityInput && currentModalityOptions.length > 0 && (
                                                                        <button type="button" onClick={() => setShowNewModalityInput(true)} className="text-gold-500 hover:text-gold-400 lowercase text-[9px] font-black tracking-widest bg-gold-500/5 px-2 py-0.5 rounded-full border border-gold-500/20 transition-all">+ adicionar</button>
                                                                    )}
                                                                </label>
                                                                <AnimatePresence mode="wait">
                                                                    {isEditMode ? (
                                                                        <motion.div
                                                                            key="edit-modality"
                                                                            initial={{ opacity: 0, scale: 0.98 }}
                                                                            animate={{ opacity: 1, scale: 1 }}
                                                                            exit={{ opacity: 0, scale: 0.98 }}
                                                                            transition={{ duration: 0.15 }}
                                                                        >
                                                                            {!showNewModalityInput ? (
                                                                                <CustomSelect
                                                                                    label=""
                                                                                    value={editedCase.modalidade || ''}
                                                                                    onChange={(val) => setEditedCase({ ...editedCase, modalidade: val })}
                                                                                    options={currentModalityOptions.map(m => ({ label: m, value: m }))}
                                                                                    placeholder="Selecione a Modalidade"
                                                                                />
                                                                            ) : (
                                                                                <div className="flex gap-2">
                                                                                    <input
                                                                                        type="text"
                                                                                        autoFocus
                                                                                        className="flex-1 bg-[#131418] border border-white/5 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-gold-500 transition-all font-medium"
                                                                                        placeholder="Nova modalidade..."
                                                                                        value={newModalityValue}
                                                                                        onChange={(e) => setNewModalityValue(e.target.value)}
                                                                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddNewModality())}
                                                                                    />
                                                                                    <button type="button" onClick={() => setShowNewModalityInput(false)} className="px-2 text-[var(--text-muted)] hover:text-white transition-colors"><X size={14} /></button>
                                                                                    <button type="button" onClick={handleAddNewModality} className="bg-gold-600 hover:bg-gold-500 text-white px-3 py-1 rounded-lg text-xs font-black border border-gold-500/50 shadow-lg shadow-gold-900/20 transition-all">Add</button>
                                                                                </div>
                                                                            )}
                                                                        </motion.div>
                                                                    ) : (
                                                                        <motion.p
                                                                            key="view-modality"
                                                                            initial={{ opacity: 0, scale: 0.98 }}
                                                                            animate={{ opacity: 1, scale: 1 }}
                                                                            exit={{ opacity: 0, scale: 0.98 }}
                                                                            className="text-[var(--text-main)] font-medium text-base"
                                                                        >
                                                                            {liveCase.modalidade || '-'}
                                                                        </motion.p>
                                                                    )}
                                                                </AnimatePresence>
                                                            </div>
                                                        )}

                                                        <div className="space-y-1">
                                                            <label className="block text-xs font-bold text-slate-500 mb-1">Tribunal</label>
                                                            <AnimatePresence mode="wait">
                                                                {isEditMode ? (
                                                                    <motion.div
                                                                        key="edit-tribunal"
                                                                        initial={{ opacity: 0, x: -10 }}
                                                                        animate={{ opacity: 1, x: 0 }}
                                                                        exit={{ opacity: 0, x: 10 }}
                                                                        transition={{ duration: 0.15 }}
                                                                    >
                                                                        <input
                                                                            className="w-full bg-[#131418] border border-white/5 rounded-lg px-3 py-2.5 text-sm text-white focus:border-gold-500 outline-none transition-all"
                                                                            value={editedCase.tribunal}
                                                                            onChange={e => setEditedCase({ ...editedCase, tribunal: e.target.value })}
                                                                        />
                                                                    </motion.div>
                                                                ) : (
                                                                    <motion.p
                                                                        key="view-tribunal"
                                                                        initial={{ opacity: 0, x: 10 }}
                                                                        animate={{ opacity: 1, x: 0 }}
                                                                        exit={{ opacity: 0, x: -10 }}
                                                                        className="text-[var(--text-main)] font-medium text-base"
                                                                    >
                                                                        {liveCase.tribunal}
                                                                    </motion.p>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="block text-xs font-bold text-slate-500 mb-1">Status</label>
                                                            <AnimatePresence mode="wait">
                                                                {isEditMode ? (
                                                                    <motion.div
                                                                        key="edit-status"
                                                                        initial={{ opacity: 0, x: -10 }}
                                                                        animate={{ opacity: 1, x: 0 }}
                                                                        exit={{ opacity: 0, x: 10 }}
                                                                        transition={{ duration: 0.15 }}
                                                                    >
                                                                        <CustomSelect
                                                                            label=""
                                                                            value={editedCase.status}
                                                                            onChange={(val) => setEditedCase({ ...editedCase, status: val as CaseStatus })}
                                                                            options={availableStatuses.map(s => ({ label: s, value: s }))}
                                                                            placeholder="Selecione o Status"
                                                                        />
                                                                    </motion.div>
                                                                ) : (
                                                                    <motion.div
                                                                        key="view-status"
                                                                        initial={{ opacity: 0, x: 10 }}
                                                                        animate={{ opacity: 1, x: 0 }}
                                                                        exit={{ opacity: 0, x: -10 }}
                                                                    >
                                                                        <span className={`inline-flex items-center px-4 py-1.5 rounded-lg text-xs font-bold uppercase border transition-all ${liveCase.status === CaseStatus.CONCLUIDO_CONCEDIDO ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'}`}>
                                                                            {liveCase.status}
                                                                        </span>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    </div>

                                                    {/* SMART FORM METADATA - VIEW/EDIT */}
                                                    {BENEFIT_FIELDS[editedCase.tipo as string] && (
                                                        <div className="mt-8 pt-8 border-t border-slate-800">
                                                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Informações Específicas do Benefício</h4>
                                                            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                                                {BENEFIT_FIELDS[editedCase.tipo as string].map(field => (
                                                                    <div key={field.key} className="space-y-1">
                                                                        <label className="block text-xs font-bold text-slate-500 mb-1">{field.label}</label>
                                                                        <AnimatePresence mode="wait">
                                                                            {isEditMode ? (
                                                                                <motion.div
                                                                                    key={`edit-${field.key}`}
                                                                                    initial={{ opacity: 0, y: -5 }}
                                                                                    animate={{ opacity: 1, y: 0 }}
                                                                                    exit={{ opacity: 0, y: 5 }}
                                                                                    transition={{ duration: 0.15 }}
                                                                                >
                                                                                    <input
                                                                                        type={field.type || 'text'}
                                                                                        className="w-full bg-[#131418] border border-white/5 rounded-lg px-3 py-2.5 text-sm text-white focus:border-gold-500 outline-none transition-all [color-scheme:dark]"
                                                                                        placeholder={field.placeholder}
                                                                                        value={editedCase.metadata?.[field.key] || ''}
                                                                                        onChange={e => setEditedCase({
                                                                                            ...editedCase,
                                                                                            metadata: {
                                                                                                ...(editedCase.metadata || {}),
                                                                                                [field.key]: e.target.value
                                                                                            }
                                                                                        })}
                                                                                    />
                                                                                </motion.div>
                                                                            ) : (
                                                                                <motion.p
                                                                                    key={`view-${field.key}`}
                                                                                    initial={{ opacity: 0, y: 5 }}
                                                                                    animate={{ opacity: 1, y: 0 }}
                                                                                    exit={{ opacity: 0, y: -5 }}
                                                                                    className="text-[var(--text-main)] font-semibold text-base"
                                                                                >
                                                                                    {field.type === 'date' && liveCase.metadata?.[field.key]
                                                                                        ? formatDateDisplay(liveCase.metadata?.[field.key])
                                                                                        : (liveCase.metadata?.[field.key] || '-')}
                                                                                </motion.p>
                                                                            )}
                                                                        </AnimatePresence>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* 2. Seguro Defeso Installments */}
                                                {isSeguroDefesoFinished && (
                                                    <div className="bg-[#18181b] border border-white/5 rounded-xl p-6 shadow-sm">
                                                        <h3 className="text-sm font-bold text-slate-400 uppercase mb-5 flex items-center gap-2 tracking-wider">
                                                            <DollarSign size={16} className="text-gold-500" /> Cronograma do Seguro
                                                        </h3>

                                                        {installments.length === 0 ? (
                                                            <div className="text-center py-8 bg-[#131418] rounded-xl border border-dashed border-white/10">
                                                                <p className="text-sm text-zinc-400 mb-4">Nenhum cronograma gerado para este benefício.</p>
                                                                <div className="flex items-center justify-center gap-3">
                                                                    <input
                                                                        type="date"
                                                                        className="bg-[#18181b] border border-white/10 rounded-lg px-3 py-2 text-sm text-white [color-scheme:dark] outline-none focus:border-gold-500"
                                                                        value={installmentStartDate}
                                                                        onChange={(e) => setInstallmentStartDate(e.target.value)}
                                                                    />
                                                                    <button
                                                                        onClick={handleGenerateInstallments}
                                                                        disabled={isGeneratingInstallments}
                                                                        className="bg-gold-600 hover:bg-gold-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-gold-900/20 disabled:opacity-50 transition-all"
                                                                    >
                                                                        {isGeneratingInstallments ? 'Gerando...' : 'Gerar 4 Parcelas'}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-left">
                                                                    <thead className="bg-[#131418] text-xs text-zinc-500 uppercase font-bold border-b border-white/5">
                                                                        <tr>
                                                                            <th className="px-4 py-3 rounded-tl-lg">#</th>
                                                                            <th className="px-4 py-3">Vencimento</th>
                                                                            <th className="px-4 py-3">Valor</th>
                                                                            <th className="px-4 py-3">Destino</th>
                                                                            <th className="px-4 py-3 text-center rounded-tr-lg">Status</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="text-sm divide-y divide-white/5">
                                                                        {installments.map((inst, idx) => (
                                                                            <tr key={inst.id} className="hover:bg-white/5 transition-colors">
                                                                                <td className="px-4 py-3 text-zinc-500 font-mono font-bold">{inst.parcela_numero}</td>
                                                                                <td className="px-4 py-3 text-zinc-300">
                                                                                    {!isEditMode && formatDateDisplay(inst.data_vencimento)}
                                                                                    {isEditMode && (
                                                                                        <input
                                                                                            type="date"
                                                                                            className="bg-transparent border-b border-white/10 focus:border-gold-500 outline-none text-white w-32 [color-scheme:dark]"
                                                                                            value={inst.data_vencimento}
                                                                                            onChange={(e) => handleInstallmentChange(idx, 'data_vencimento', e.target.value)}
                                                                                            onBlur={() => handleInstallmentSave(installments[idx])}
                                                                                        />
                                                                                    )}
                                                                                </td>
                                                                                <td className="px-4 py-3">
                                                                                    <div className="flex items-center text-emerald-500 font-bold">
                                                                                        <span className="mr-1 text-xs opacity-70">R$</span>
                                                                                        <input
                                                                                            className="bg-transparent border-b border-transparent focus:border-emerald-500 outline-none w-20 text-emerald-500"
                                                                                            value={inst.valor}
                                                                                            onChange={(e) => handleInstallmentChange(idx, 'valor', e.target.value)}
                                                                                            onBlur={() => handleInstallmentSave(installments[idx])}
                                                                                        />
                                                                                    </div>
                                                                                </td>
                                                                                <td className="px-4 py-3">
                                                                                    <button
                                                                                        onClick={() => handleInstallmentChange(idx, 'destino', inst.destino === 'Cliente' ? 'Escritório' : 'Cliente')}
                                                                                        className={`px-2 py-1 rounded text-xs font-bold uppercase border transition-all ${inst.destino === 'Cliente' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30 hover:bg-purple-500/20' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'}`}
                                                                                    >
                                                                                        {inst.destino || 'Escritório'}
                                                                                    </button>
                                                                                </td>
                                                                                <td className="px-4 py-3 text-center">
                                                                                    <button
                                                                                        onClick={() => handleToggleInstallmentPaid(inst)}
                                                                                        className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all w-full shadow-sm ${inst.pago ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20'}`}
                                                                                    >
                                                                                        {inst.pago ? <CheckCircle size={14} /> : <Circle size={14} />}
                                                                                        {inst.pago ? 'PAGO' : 'PENDENTE'}
                                                                                    </button>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* 3. GPS Section */}
                                                <div className="bg-[#18181b] border border-white/5 rounded-xl p-6 shadow-sm">
                                                    <div className="flex justify-between items-center mb-5">
                                                        <h3 className="text-sm font-bold text-slate-400 uppercase flex items-center gap-2 tracking-wider">
                                                            <FileSpreadsheet size={16} className="text-gold-500" /> Guias GPS (INSS)
                                                        </h3>
                                                        <button onClick={() => setIsAddingGps(!isAddingGps)} className="text-xs text-gold-500 hover:text-white flex items-center gap-1 hover:bg-gold-500/10 px-3 py-1.5 rounded-lg transition-colors font-medium border border-transparent hover:border-gold-500/20">
                                                            <Plus size={14} /> Adicionar Guia
                                                        </button>
                                                    </div>

                                                    {isAddingGps && (
                                                        <div className="flex gap-2 mb-4 animate-in slide-in-from-top-2">
                                                            <input
                                                                type="month"
                                                                className="flex-1 bg-[#131418] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-gold-500 [color-scheme:dark]"
                                                                value={newGpsCompetencia}
                                                                onChange={(e) => setNewGpsCompetencia(e.target.value)}
                                                            />
                                                            <button onClick={handleAddGps} className="bg-gold-600 text-white px-4 rounded-lg text-sm font-bold">Salvar</button>
                                                        </div>
                                                    )}

                                                    <div className="space-y-2">
                                                        {(liveCase.gps_lista || []).map(gps => (
                                                            <div key={gps.id} className="flex justify-between items-center p-3 bg-[#131418] rounded-lg border border-white/5">
                                                                <div>
                                                                    <p className="text-sm font-bold text-zinc-200">Competência: {gps.competencia}</p>
                                                                    <p className="text-xs text-zinc-500">
                                                                        Status: <span className={`font-bold ${gps.status === 'Paga' ? 'text-emerald-500' : gps.status === 'Puxada' ? 'text-blue-400' : 'text-yellow-500'}`}>{gps.status}</span>
                                                                    </p>
                                                                </div>

                                                                {/* Edit Mode for Puxada Value */}
                                                                {editingGpsId === gps.id ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <input
                                                                            autoFocus
                                                                            className="w-24 bg-black border border-zinc-700 rounded px-2 py-1 text-sm text-white outline-none focus:border-blue-500"
                                                                            value={editingGpsValue}
                                                                            onChange={(e) => setEditingGpsValue(formatCurrencyInput(e.target.value))}
                                                                            onBlur={() => handleSaveGpsValue(gps.id)}
                                                                            onKeyDown={(e) => e.key === 'Enter' && handleSaveGpsValue(gps.id)}
                                                                            placeholder="R$ 0,00"
                                                                        />
                                                                        <button onClick={() => handleSaveGpsValue(gps.id)} className="text-blue-500 hover:text-white"><Check size={16} /></button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center gap-3">
                                                                        <button
                                                                            onClick={() => {
                                                                                setEditingGpsId(gps.id);
                                                                                setEditingGpsValue(formatCurrencyInput(gps.valor.toFixed(2)));
                                                                            }}
                                                                            className="text-sm font-bold text-zinc-300 hover:text-white border-b border-transparent hover:border-zinc-500 transition-all flex items-center gap-2"
                                                                            title="Clique para editar valor"
                                                                        >
                                                                            {gps.valor > 0 ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(gps.valor) : <span className="text-zinc-500 italic font-normal text-xs">Definir Valor</span>}
                                                                            <Edit2 size={12} className="opacity-50" />
                                                                        </button>

                                                                        {gps.status !== 'Paga' && (
                                                                            <button
                                                                                onClick={() => handleChangeGpsStatus(gps.id, gps.status, gps.valor)}
                                                                                className={`px-3 py-1 rounded text-[10px] font-bold uppercase border transition-all ${gps.status === 'Pendente'
                                                                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20'
                                                                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                                                                    }`}
                                                                            >
                                                                                {gps.status === 'Pendente' ? 'Marcar Puxada' : 'Marcar Paga'}
                                                                            </button>
                                                                        )}

                                                                        <button onClick={() => handleDeleteGps(gps)} className="text-zinc-600 hover:text-red-500"><Trash2 size={14} /></button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                        {(liveCase.gps_lista || []).length === 0 && <p className="text-xs text-zinc-500 italic text-center py-2">Nenhuma GPS cadastrada.</p>}
                                                    </div>
                                                </div>

                                                {/* 4. Movimentações Financeiras */}
                                                <div className="bg-[#18181b] border border-white/5 rounded-xl p-6 shadow-sm">
                                                    <div className="flex justify-between items-center mb-5">
                                                        <h3 className="text-sm font-bold text-slate-400 uppercase flex items-center gap-2 tracking-wider"><DollarSign size={16} className="text-gold-500" /> Movimentações Financeiras</h3>
                                                        <button onClick={() => setIsAddingFinancial(!isAddingFinancial)} className="text-xs text-gold-500 hover:text-white flex items-center gap-1 hover:bg-gold-500/10 px-3 py-1.5 rounded-lg transition-colors font-medium border border-transparent hover:border-gold-500/20"><Plus size={14} /> Adicionar</button>
                                                    </div>

                                                    {isAddingFinancial && (
                                                        <div className="bg-[#131418] p-4 rounded-xl mb-4 border border-dashed border-white/10 animate-in slide-in-from-top-2">
                                                            <div className="flex flex-col gap-3 mb-3">
                                                                <div className="flex gap-3">
                                                                    <div className="w-1/3">
                                                                        <CustomSelect
                                                                            label=""
                                                                            value={newFinancial.type}
                                                                            onChange={(val) => setNewFinancial({ ...newFinancial, type: val as FinancialType })}
                                                                            options={[
                                                                                { label: 'Receita', value: FinancialType.RECEITA },
                                                                                { label: 'Despesa', value: FinancialType.DESPESA },
                                                                                { label: 'Comissão', value: FinancialType.COMISSAO }
                                                                            ]}
                                                                            placeholder="Tipo"
                                                                        />
                                                                    </div>
                                                                    <input className="w-32 bg-[#18181b] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-gold-500" placeholder="R$ 0,00" value={newFinancial.val} onChange={e => setNewFinancial({ ...newFinancial, val: formatCurrencyInput(e.target.value) })} />
                                                                    <input
                                                                        type="date"
                                                                        className="bg-[#18181b] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-gold-500"
                                                                        value={newFinancial.date}
                                                                        onChange={e => setNewFinancial({ ...newFinancial, date: e.target.value })}
                                                                    />
                                                                </div>

                                                                {/* Auto-fill Captador for Commission */}
                                                                {newFinancial.type === FinancialType.COMISSAO && (
                                                                    <div className="flex flex-col gap-1 w-full animate-in fade-in duration-300">
                                                                        <label className="text-[10px] uppercase font-bold text-zinc-500">Captador Vinculado</label>
                                                                        {captadorCommission ? (
                                                                            <div className="relative">
                                                                                <input
                                                                                    readOnly
                                                                                    className="w-full bg-purple-500/10 border border-purple-500/30 rounded-lg px-3 py-2 text-sm text-purple-300 outline-none cursor-not-allowed font-medium"
                                                                                    value={captadorCommission}
                                                                                />
                                                                                <CheckCircle size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400" />
                                                                            </div>
                                                                        ) : (
                                                                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-red-400 flex items-center gap-2 font-medium">
                                                                                <AlertTriangle size={16} />
                                                                                <span>Este cliente não tem captador vinculado.</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {/* Honorários Checkbox */}
                                                                {newFinancial.type === FinancialType.RECEITA && !isSeguroDefeso && (
                                                                    <div className="flex items-center gap-2 mb-1 animate-in slide-in-from-left-2">
                                                                        <input
                                                                            type="checkbox"
                                                                            id="is_honorary"
                                                                            className="w-4 h-4 rounded border-zinc-700 bg-[#0f1014] text-gold-500 focus:ring-gold-500 focus:ring-offset-0"
                                                                            checked={newFinancial.isHonorary}
                                                                            onChange={e => {
                                                                                const checked = e.target.checked;
                                                                                let newDesc = newFinancial.desc;
                                                                                const prefix = 'Honorários - ';
                                                                                if (checked) {
                                                                                    if (!newDesc.startsWith(prefix)) {
                                                                                        newDesc = prefix + newDesc.replace(/^Honorários\s*-\s*/, '');
                                                                                    }
                                                                                } else {
                                                                                    newDesc = newDesc.replace(/^Honorários\s*-\s*/, '');
                                                                                }
                                                                                setNewFinancial({ ...newFinancial, isHonorary: checked, desc: newDesc });
                                                                            }}
                                                                        />
                                                                        <label htmlFor="is_honorary" className="text-xs font-bold text-zinc-400 cursor-pointer hover:text-white transition-colors">Marcar como Pagamento de Honorários</label>
                                                                    </div>
                                                                )}

                                                                <input
                                                                    className="flex-1 bg-[#18181b] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-gold-500"
                                                                    placeholder={newFinancial.type === FinancialType.COMISSAO ? "Descrição (Opcional)" : (newFinancial.isHonorary ? "Adicione detalhes aos honorários..." : "Descrição da movimentação...")}
                                                                    value={newFinancial.desc}
                                                                    onChange={e => {
                                                                        let val = e.target.value;
                                                                        const prefix = 'Honorários - ';
                                                                        if (newFinancial.isHonorary && !val.startsWith(prefix)) {
                                                                            val = prefix + val.replace(/^Honorários\s*-\s*/, '');
                                                                        }
                                                                        setNewFinancial({ ...newFinancial, desc: val });
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="flex justify-end gap-2">
                                                                <button onClick={() => setIsAddingFinancial(false)} className="text-xs text-zinc-400 hover:text-white px-3 py-2 rounded hover:bg-[#18181b] transition-colors">Cancelar</button>
                                                                <button onClick={handleAddFinancial} className="text-xs bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-500 font-bold shadow-lg shadow-emerald-900/20 transition-all">Salvar Lançamento</button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="space-y-2">
                                                        {caseFinancials.map(f => (
                                                            <div key={f.id} className="flex flex-col p-3 bg-[#131418] rounded-lg border border-white/5 hover:border-gold-500/30 transition-colors group">
                                                                <div className="flex justify-between items-center">
                                                                    <div>
                                                                        <div className="flex items-center gap-2">
                                                                            {f.tipo === FinancialType.COMISSAO ? (
                                                                                <span className="text-[9px] font-bold bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded border border-purple-500/30 uppercase tracking-wide flex items-center gap-1"><HandCoins size={10} /> Comissão</span>
                                                                            ) : (
                                                                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide ${f.tipo === FinancialType.RECEITA ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>{f.tipo}</span>
                                                                            )}
                                                                            <p className="text-sm font-medium text-white">{f.descricao}</p>
                                                                        </div>
                                                                        <p className="text-xs text-[var(--text-muted)] mt-0.5 flex items-center gap-1"><Clock size={10} /> {formatDateDisplay(f.data_vencimento)} {f.captador_nome && <span className="text-purple-400">• {f.captador_nome}</span>}</p>
                                                                    </div>
                                                                    <div className="flex items-center gap-3">
                                                                        <span className={`text-sm font-bold ${f.tipo === FinancialType.RECEITA
                                                                            ? 'text-emerald-500'
                                                                            : (f.tipo === FinancialType.COMISSAO ? 'text-purple-400' : 'text-red-500')
                                                                            }`}>
                                                                            {f.tipo === FinancialType.RECEITA ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(f.valor)}
                                                                        </span>
                                                                        <button onClick={() => deleteFinancialRecord(f.id)} className="text-[var(--text-muted)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-[var(--bg-card)]"><Trash2 size={14} /></button>
                                                                    </div>
                                                                </div>

                                                                {/* DETALHES EXTRAS FINANCEIRO (CORRIGIDO: RÓTULOS INVERTIDOS) */}
                                                                {(f.forma_pagamento || f.recebedor || f.conta) && (
                                                                    <div className="mt-2 pt-2 border-t border-white/5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400 bg-white/5 p-2 rounded">
                                                                        {f.forma_pagamento && <span><strong>Forma:</strong> {f.forma_pagamento}</span>}
                                                                        {f.recebedor && <span><strong>{f.tipo === FinancialType.RECEITA ? 'Recebedor' : 'Pagador'}:</strong> {f.recebedor}</span>}
                                                                        {f.conta && <span><strong>Conta:</strong> {f.tipo_conta ? `${f.tipo_conta} - ` : ''}{f.conta}</span>}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                        {caseFinancials.length === 0 && <div className="text-zinc-500 text-xs italic py-4 text-center border border-dashed border-white/10 rounded-lg">Nenhuma movimentação extra registrada.</div>}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right Column */}
                                            <div className="space-y-8">
                                                {!isSeguroDefeso && (
                                                    <div className="bg-[#18181b] border border-white/5 rounded-xl p-6 shadow-sm">
                                                        <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center gap-2 tracking-wider"><DollarSign size={16} className="text-gold-500" /> Honorários & Valores</h3>
                                                        <div className="space-y-5">
                                                            <div><label className="block text-xs font-bold text-slate-500 mb-1">Valor da Causa</label>{isEditMode ? <input className="w-full bg-[#131418] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-gold-500" value={currencyInput} onChange={handleCurrencyChange} /> : <span className="text-2xl font-bold text-white tracking-tight">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(liveCase.valor_causa)}</span>}</div>
                                                            <div className="pt-4 border-t border-[var(--border-main)]">
                                                                <label className="block text-xs font-bold text-slate-500 mb-1">Honorários (Êxito)</label>
                                                                {isEditMode ? (
                                                                    <div className="space-y-3">
                                                                        <div className="relative">
                                                                            {isHonorariosLocked && (
                                                                                <div className="absolute inset-0 z-10 flex items-center justify-end pr-8 pointer-events-none">
                                                                                    <Lock size={14} className="text-zinc-500" />
                                                                                </div>
                                                                            )}
                                                                            <CustomSelect
                                                                                label=""
                                                                                value={editedCase.status_pagamento || 'Pendente'}
                                                                                onChange={(val) => handleStatusPagamentoChange({ target: { value: val } } as any)}
                                                                                disabled={isHonorariosLocked}
                                                                                options={[
                                                                                    { label: 'Pendente', value: 'Pendente' },
                                                                                    { label: 'Pago', value: 'Pago' }
                                                                                ]}
                                                                                placeholder="Status"
                                                                            />
                                                                        </div>
                                                                        {isHonorariosLocked && (
                                                                            <p className="text-[10px] text-zinc-500 flex items-center gap-1">
                                                                                * Liberado apenas após Concessão
                                                                            </p>
                                                                        )}
                                                                        <div className="relative">
                                                                            <input
                                                                                type="text"
                                                                                className={`w-full bg-[#131418] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-gold-500 ${!isSeguroDefeso ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                                value={!isSeguroDefeso ? formatCurrencyInput((totalHonorariosFromFinancials * 100).toString()) : honorariosInput}
                                                                                onChange={handleHonorariosChange}
                                                                                placeholder="R$ 0,00"
                                                                                disabled={!isSeguroDefeso || editedCase.status_pagamento !== 'Pago'}
                                                                            />
                                                                            {!isSeguroDefeso && (
                                                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
                                                                                    <Lock size={12} />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        {!isSeguroDefeso && (
                                                                            <p className="text-[10px] text-zinc-500 italic">
                                                                                * Somado automaticamente das movimentações financeiras
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex flex-col gap-2">
                                                                        <div className="flex justify-between items-center bg-[#131418] p-3 rounded-lg border border-white/5">
                                                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${liveCase.status_pagamento === 'Pago' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'}`}>{liveCase.status_pagamento}</span>
                                                                            <span className="font-bold text-emerald-500 text-lg">
                                                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalHonorariosFromFinancials)}
                                                                            </span>
                                                                        </div>

                                                                        {/* EXIBIÇÃO DETALHES HONORÁRIOS */}
                                                                        {liveCase.status_pagamento === 'Pago' && (
                                                                            <div className="bg-[var(--bg-base)]/30 p-3 rounded border border-[var(--border-main)] text-xs text-[var(--text-muted)] space-y-1">
                                                                                {liveCase.honorarios_forma_pagamento ? (
                                                                                    <>
                                                                                        <p className="flex justify-between"><strong>Forma de Pagamento:</strong> <span className="text-[var(--text-main)]">{liveCase.honorarios_forma_pagamento}</span></p>
                                                                                        {liveCase.honorarios_forma_pagamento === 'Conta' && (
                                                                                            <>
                                                                                                <p className="flex justify-between"><strong>Recebedor:</strong> <span className="text-[var(--text-main)]">{liveCase.honorarios_recebedor || '-'}</span></p>
                                                                                                <p className="flex justify-between"><strong>Conta:</strong> <span className="text-[var(--text-main)]">{liveCase.honorarios_tipo_conta} - {liveCase.honorarios_conta}</span></p>
                                                                                            </>
                                                                                        )}
                                                                                    </>
                                                                                ) : (
                                                                                    <p className="italic text-[var(--text-muted)]/60">Detalhes do pagamento não informados.</p>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="bg-[#18181b] border border-white/5 rounded-xl p-6 shadow-sm">
                                                    <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center gap-2 tracking-wider"><Clock size={16} className="text-gold-500" /> Prazo Fatal (SLA)</h3>
                                                    <AnimatePresence mode="wait">
                                                        {isEditMode ? (
                                                            <motion.div
                                                                key="edit-fatal"
                                                                initial={{ opacity: 0, y: -5 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                exit={{ opacity: 0, y: 5 }}
                                                                transition={{ duration: 0.15 }}
                                                            >
                                                                <input
                                                                    type="date"
                                                                    className="w-full bg-[var(--bg-base)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-gold-500 [color-scheme:dark]"
                                                                    value={editedCase.data_fatal || ''}
                                                                    onChange={e => setEditedCase({ ...editedCase, data_fatal: e.target.value })}
                                                                />
                                                            </motion.div>
                                                        ) : (
                                                            <motion.div
                                                                key="view-fatal"
                                                                initial={{ opacity: 0, y: 5 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                exit={{ opacity: 0, y: -5 }}
                                                            >
                                                                {liveCase.data_fatal ? (
                                                                    <p className="text-red-400 font-bold flex items-center gap-2 bg-red-500/10 p-3 rounded-lg border border-red-500/20 shadow-lg shadow-red-900/10">
                                                                        <AlertTriangle size={18} /> {formatDateDisplay(liveCase.data_fatal)}
                                                                    </p>
                                                                ) : (
                                                                    <p className="text-[var(--text-muted)] text-sm italic py-2">Sem prazo fatal definido.</p>
                                                                )}
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>

                                                {/* Events and Contact */}
                                                <div className="bg-[#18181b] border border-white/5 rounded-xl p-6 shadow-sm">
                                                    <div className="flex justify-between items-center mb-4">
                                                        <h3 className="text-sm font-bold text-slate-400 uppercase flex items-center gap-2 tracking-wider">
                                                            <Calendar size={16} className="text-gold-500" /> Próximos Eventos
                                                        </h3>
                                                        <button onClick={() => { setIsAddingEvent(!isAddingEvent); setIsCustomEventType(false); setCustomEventType(''); }} className="text-xs text-gold-500 hover:text-white flex items-center gap-1 hover:bg-gold-500/10 px-2 py-1 rounded transition-colors border border-transparent hover:border-gold-500/20"><Plus size={12} /> Adicionar</button></div>
                                                    {isAddingEvent && (

                                                        <div className="bg-[#131418] p-3 rounded-xl mb-3 border border-dashed border-white/10 animate-in slide-in-from-top-2 space-y-2">
                                                            <input
                                                                className="w-full bg-[#18181b] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-gold-500"
                                                                placeholder="Título do evento"
                                                                value={newEvent.titulo || ''}
                                                                onChange={e => setNewEvent({ ...newEvent, titulo: e.target.value })}
                                                            />
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div className="flex flex-col gap-1">
                                                                    {isCustomEventType ? (
                                                                        <div className="flex gap-1">
                                                                            <input
                                                                                autoFocus
                                                                                className="flex-1 bg-[#18181b] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-gold-500"
                                                                                placeholder="Tipo do evento..."
                                                                                value={customEventType}
                                                                                onChange={e => setCustomEventType(e.target.value)}
                                                                            />
                                                                            <button onClick={() => setIsCustomEventType(false)} className="text-[10px] text-zinc-500 hover:text-white">Lista</button>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex gap-1">
                                                                            <select
                                                                                className="flex-1 bg-[#18181b] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-gold-500"
                                                                                value={newEvent.tipo}
                                                                                onChange={e => {
                                                                                    if (e.target.value === 'ADD_NEW') {
                                                                                        setIsCustomEventType(true);
                                                                                    } else {
                                                                                        setNewEvent({ ...newEvent, tipo: e.target.value as EventType });
                                                                                    }
                                                                                }}
                                                                            >
                                                                                {Object.values(EventType).map(t => <option key={t} value={t}>{t}</option>)}
                                                                                <option value="ADD_NEW" className="text-gold-500 font-bold">+ Adicionar Novo Tipo</option>
                                                                            </select>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <input
                                                                    type="datetime-local"
                                                                    className="w-full bg-[#18181b] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-gold-500 [color-scheme:dark]"
                                                                    value={newEvent.data_hora}
                                                                    onChange={e => setNewEvent({ ...newEvent, data_hora: e.target.value })}
                                                                />
                                                            </div>

                                                            {(newEvent.tipo === EventType.PERICIA || customEventType.toLowerCase().includes('pericia') || customEventType.toLowerCase().includes('perícia')) && (
                                                                <input
                                                                    className="w-full bg-[#18181b] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-gold-500 animate-in fade-in"
                                                                    placeholder="Cidade da Perícia"
                                                                    value={newEvent.cidade || ''}
                                                                    onChange={e => setNewEvent({ ...newEvent, cidade: e.target.value })}
                                                                />
                                                            )}

                                                            <div className="flex justify-end gap-2">
                                                                <button onClick={() => setIsAddingEvent(false)} className="text-xs text-zinc-400 hover:text-white px-2 py-1">Cancelar</button>
                                                                <button onClick={handleAddEvent} className="text-xs bg-emerald-600 text-white px-3 py-1 rounded hover:bg-emerald-500 font-bold shadow-lg shadow-emerald-900/20">Salvar</button>
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="space-y-2">
                                                        {caseEvents.length > 0 ? caseEvents.map(e => (
                                                            <div key={e.id}>
                                                                {editingEvent?.id === e.id ? (
                                                                    <div className="bg-[#18181b] p-3 rounded-xl mb-2 border border-gold-500/30 animate-in slide-in-from-top-1 space-y-2">
                                                                        <input
                                                                            className="w-full bg-[#131418] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-gold-500"
                                                                            placeholder="Título do evento"
                                                                            value={editingEvent.titulo || ''}
                                                                            onChange={ev => setEditingEvent({ ...editingEvent, titulo: ev.target.value })}
                                                                        />
                                                                        <div className="grid grid-cols-2 gap-2">
                                                                            <div className="flex flex-col gap-1">
                                                                                {isCustomEditEventType ? (
                                                                                    <div className="flex gap-1">
                                                                                        <input
                                                                                            autoFocus
                                                                                            className="flex-1 bg-[#131418] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-gold-500"
                                                                                            placeholder="Tipo..."
                                                                                            value={customEventType}
                                                                                            onChange={ev => setCustomEventType(ev.target.value)}
                                                                                        />
                                                                                        <button onClick={() => setIsCustomEditEventType(false)} className="text-[10px] text-zinc-500 hover:text-white">Lista</button>
                                                                                    </div>
                                                                                ) : (
                                                                                    <select
                                                                                        className="w-full bg-[#131418] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-gold-500"
                                                                                        value={editingEvent.tipo}
                                                                                        onChange={ev => {
                                                                                            if (ev.target.value === 'ADD_NEW') {
                                                                                                setIsCustomEditEventType(true);
                                                                                                setCustomEventType('');
                                                                                            } else {
                                                                                                setEditingEvent({ ...editingEvent, tipo: ev.target.value as EventType });
                                                                                            }
                                                                                        }}
                                                                                    >
                                                                                        {Object.values(EventType).map(t => <option key={t} value={t}>{t}</option>)}
                                                                                        <option value="ADD_NEW" className="text-gold-500 font-bold">+ Novo Tipo</option>
                                                                                    </select>
                                                                                )}
                                                                            </div>
                                                                            <input
                                                                                type="datetime-local"
                                                                                className="w-full bg-[#131418] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-gold-500 [color-scheme:dark]"
                                                                                value={editingEvent.data_hora}
                                                                                onChange={ev => setEditingEvent({ ...editingEvent, data_hora: ev.target.value })}
                                                                            />
                                                                        </div>
                                                                        <div className="flex justify-end gap-2 mt-2">
                                                                            <button onClick={() => setEditingEvent(null)} className="text-[10px] text-zinc-500 hover:text-white">Cancelar</button>
                                                                            <button onClick={handleUpdateEventLocal} className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded hover:bg-emerald-500 font-bold shadow-lg shadow-emerald-900/20">Salvar</button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex justify-between items-center p-3 bg-[#131418] rounded-lg border border-white/5 hover:border-gold-500/30 transition-all group">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className={`p-2 rounded-lg ${e.tipo === EventType.AUDIENCIA ? 'bg-red-500/10 text-red-400' : e.tipo === EventType.PERICIA ? 'bg-blue-500/10 text-blue-400' : 'bg-gold-500/10 text-gold-500'}`}>
                                                                                <Calendar size={16} />
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-sm font-bold text-white">{e.titulo}</p>
                                                                                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{e.tipo} • {new Date(e.data_hora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} {e.cidade && ` • ${e.cidade}`}</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <button onClick={() => setEditingEvent(e)} className="p-2 text-zinc-500 hover:text-white"><Edit2 size={14} /></button>
                                                                            <button onClick={() => handleRemoveEvent(e.id)} className="p-2 text-zinc-500 hover:text-red-500"><Trash2 size={14} /></button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )) : (
                                                            <p className="text-xs text-zinc-500 italic text-center py-2">Nenhum evento agendado.</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            {/* CHECKLIST TAB */}
                            {
                                activeTab === 'checklist' && (
                                    <div className="space-y-6">
                                        <div className="bg-[#18181b] border border-white/5 rounded-xl p-6 shadow-lg">
                                            <div className="flex justify-between items-center mb-6">
                                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><ClipboardList size={14} /> Checklist de Documentação</h3>
                                                <span className="text-[10px] font-bold bg-gold-500/10 text-gold-500 px-2 py-0.5 rounded border border-gold-500/20">{caseTasks.filter(t => t.concluido).length}/{caseTasks.length || 0} CONCLUÍDOS</span>
                                            </div>

                                            <div className="flex gap-3 mb-6">
                                                <input
                                                    className="flex-1 bg-[#131418] border border-white/10 rounded-lg px-4 py-2 text-sm text-white outline-none focus:border-gold-500 transition-all placeholder:text-zinc-600"
                                                    placeholder="Adicionar novo item..."
                                                    value={newTaskTitle}
                                                    onChange={e => setNewTaskTitle(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                                                />
                                                <button
                                                    onClick={handleAddTask}
                                                    className="bg-gold-500 hover:bg-gold-600 text-black px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-gold-500/20 active-scale"
                                                >
                                                    <Plus size={18} />
                                                </button>
                                            </div>

                                            <div className="space-y-3">
                                                {caseTasks.map(task => (
                                                    <div
                                                        key={task.id}
                                                        className={`flex items-center justify-between p-4 rounded-xl border transition-all group ${task.concluido ? 'bg-[#131418]/50 border-white/5' : 'bg-[#131418] border-white/5 hover:border-gold-500/30 shadow-md'}`}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <button
                                                                onClick={() => handleToggleTask(task.id)}
                                                                className={`transition-colors ${task.concluido ? 'text-gold-500' : 'text-zinc-600 hover:text-zinc-400'}`}
                                                            >
                                                                {task.concluido ? <CheckCircle size={22} className="fill-gold-500/10" /> : <Circle size={22} />}
                                                            </button>
                                                            <span className={`text-sm font-medium transition-all ${task.concluido ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>{task.titulo}</span>
                                                        </div>
                                                        <button onClick={() => handleDeleteTask(task.id)} className="text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg hover:bg-zinc-800/50"><Trash2 size={16} /></button>
                                                    </div>
                                                ))}
                                                {caseTasks.length === 0 && (
                                                    <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-2xl">
                                                        <p className="text-zinc-500 text-sm italic">O checklist está vazio.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            }

                            {/* ACCESS TAB */}
                            {
                                activeTab === 'access' && (
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold text-white flex items-center gap-2"><LockIcon size={20} className="text-gold-500" /> Credenciais e Links</h3><button onClick={() => setIsAddingAccess(!isAddingAccess)} className="bg-gold-500 hover:bg-gold-600 text-black px-4 py-2 rounded-lg text-sm flex items-center gap-2 font-medium shadow-lg shadow-gold-500/20"><Plus size={16} /> Adicionar Acesso</button></div>
                                        {isAddingAccess && (<div className="bg-[#18181b] p-6 rounded-xl border border-white/5 mb-6 animate-in slide-in-from-top-2 shadow-lg"><div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5"><div><label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Sistema</label><input className="w-full bg-[#131418] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-gold-500" placeholder="Ex: Meu INSS" value={newAccess.nome_sistema || ''} onChange={e => setNewAccess({ ...newAccess, nome_sistema: e.target.value })} list="systems-list" /><datalist id="systems-list">{COMMON_SYSTEMS.map(s => <option key={s.name} value={s.name} />)}</datalist></div><div><label className="block text-xs font-bold text-slate-400 mb-1 uppercase">URL (Link)</label><input className="w-full bg-[#131418] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-gold-500" placeholder="https://..." value={newAccess.url || ''} onChange={e => setNewAccess({ ...newAccess, url: e.target.value })} /></div><div><label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Login/CPF</label><input className="w-full bg-[#131418] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-gold-500" value={newAccess.login || ''} onChange={e => setNewAccess({ ...newAccess, login: e.target.value })} /></div><div><label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Senha</label><input className="w-full bg-[#131418] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-gold-500" value={newAccess.senha || ''} onChange={e => setNewAccess({ ...newAccess, senha: e.target.value })} /></div></div><div className="flex justify-end gap-3"><button onClick={() => setIsAddingAccess(false)} className="text-zinc-400 hover:text-white px-4 py-2 text-sm font-medium hover:bg-[#131418] rounded-lg transition-colors">Cancelar</button><button onClick={handleAddAccess} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg text-sm font-bold shadow-lg shadow-emerald-900/20">Salvar Acesso</button></div></div>)}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{(liveCase.acessos || []).map(access => (<div key={access.id} className="bg-[#18181b] border border-white/5 rounded-xl p-5 hover:border-gold-500/30 transition-all group relative shadow-md"><div className="flex items-center gap-4 mb-4"><div className="p-3 bg-[#131418] rounded-xl text-gold-500 border border-white/5"><Globe size={20} /></div><div><h4 className="font-bold text-white text-sm">{access.nome_sistema}</h4><a href={access.url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-1 mt-0.5">{access.url.substring(0, 30)}... <ExternalLink size={10} /></a></div><button onClick={() => handleDeleteAccess(access.id)} className="absolute top-4 right-4 text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded hover:bg-zinc-800"><Trash2 size={16} /></button></div><div className="space-y-3 bg-[#131418] p-4 rounded-xl border border-white/5"><div className="flex justify-between items-center"><span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Login</span><div className="flex items-center gap-2"><span className="text-sm font-mono text-zinc-300 bg-[#18181b] px-2 py-0.5 rounded border border-white/5">{access.login}</span><button onClick={() => copyToClipboard(access.login)} className="text-zinc-500 hover:text-white p-1 rounded hover:bg-zinc-800" title="Copiar"><Copy size={12} /></button></div></div><div className="flex justify-between items-center border-t border-white/5 pt-3"><span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Senha</span><div className="flex items-center gap-2"><span className="text-sm font-mono text-zinc-300 bg-[#18181b] px-2 py-0.5 rounded border border-white/5">{showPassword[access.id] ? access.senha : '••••••••'}</span><button onClick={() => togglePasswordVisibility(access.id)} className="text-zinc-500 hover:text-white p-1 rounded hover:bg-zinc-800">{showPassword[access.id] ? <EyeOff size={12} /> : <Eye size={12} />}</button><button onClick={() => copyToClipboard(access.senha || '')} className="text-zinc-500 hover:text-white p-1 rounded hover:bg-zinc-800" title="Copiar"><Copy size={12} /></button></div></div></div></div>))}{(liveCase.acessos || []).length === 0 && <div className="col-span-full py-12 text-center text-zinc-500 border border-dashed border-white/5 rounded-xl bg-[#18181b]">Nenhum acesso cadastrado.</div>}</div>
                                    </div>
                                )
                            }

                            {/* HISTORY TAB */}
                            {
                                activeTab === 'history' && (
                                    <CaseHistoryTab
                                        caseId={liveCase.id}
                                        registeredBy={liveCase.registered_by}
                                        updatedBy={liveCase.updated_by}
                                    />
                                )
                            }
                        </div >


                        {/* Footer */}
                        <div className="p-4 border-t border-white/5 bg-[#131418] flex justify-end items-center rounded-b-xl shrink-0">
                            <button onClick={onClose} className="px-5 py-2.5 bg-[#18181b] hover:bg-white/5 text-zinc-300 rounded-lg font-medium transition-colors text-sm border border-white/5 hover:border-white/10">Voltar</button>
                        </div>
                    </div>
                </div>

                {/* WHATSAPP MODAL */}
                {isWhatsAppModalOpen && client && (<WhatsAppModal isOpen={isWhatsAppModalOpen} onClose={() => setIsWhatsAppModalOpen(false)} clientName={client.nome_completo} phone={client.telefone} caseTitle={liveCase.titulo} />)}

                {/* RESTORE MODAL */}
                {isRestoreModalOpen && (<div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-200"><div className="bg-[#18181b] border border-white/10 p-6 rounded-xl max-w-sm w-full shadow-2xl"><div className="flex flex-col items-center mb-4"><div className="p-3 bg-emerald-500/10 rounded-full mb-3 text-emerald-500 border border-emerald-500/20"><ArchiveRestore size={24} /></div><h3 className="text-lg font-bold text-white text-center">Restaurar Processo</h3><p className="text-xs text-zinc-400 text-center mt-1">{liveCase.titulo}</p></div><div className="mb-4"><label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Motivo da Restauração</label><textarea className="w-full bg-[#131418] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-emerald-500 resize-none h-24" placeholder="Ex: Cliente retornou, Fato novo, Erro..." value={restoreReason} onChange={(e) => setRestoreReason(e.target.value)} autoFocus /></div><div className="flex gap-3 justify-center"><button onClick={() => { setIsRestoreModalOpen(false); setRestoreReason(''); }} className="flex-1 px-4 py-2 text-zinc-300 hover:bg-[#131418] rounded-lg transition-colors text-sm font-medium">Cancelar</button><button onClick={confirmRestore} className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors text-sm font-medium shadow-lg shadow-emerald-600/20">Restaurar</button></div></div></div>)}

                {/* ================================================================================== */}
                {/* MODAIS DE CONFIRMAÇÃO DE PAGAMENTO */}
                {/* ================================================================================== */}

                {/* 1. PAGAMENTO PARCELA (SEGURO) */}
                {
                    installmentToPay && (
                        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
                            <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-xl w-full max-w-sm shadow-2xl animate-in zoom-in duration-200">
                                <div className="p-4 border-b border-[var(--border-main)]">
                                    <h4 className="font-bold text-white flex items-center gap-2"><Wallet size={16} className="text-yellow-600" /> Recebimento Parcela {installmentToPay.parcela_numero}</h4>
                                    <p className="text-xs text-zinc-400 mt-1">Informe como o escritório recebeu o valor.</p>
                                </div>
                                <div className="p-4 space-y-4">
                                    <div><label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1.5">Forma de Recebimento</label><div className="flex gap-2"><button onClick={() => setInstPayData({ ...instPayData, method: 'Especie' })} className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${instPayData.method === 'Especie' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600'}`}>Espécie (Dinheiro)</button><button onClick={() => setInstPayData({ ...instPayData, method: 'Conta' })} className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${instPayData.method === 'Conta' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600'}`}>Conta Bancária</button></div></div>
                                    {instPayData.method === 'Conta' && (
                                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                            <div><div className="flex justify-between mb-1"><label className="text-[10px] font-bold text-zinc-500 uppercase">Quem Recebeu?</label><button onClick={() => setInstPayData({ ...instPayData, isAddingReceiver: !instPayData.isAddingReceiver, receiver: '' })} className="text-[10px] text-yellow-600 hover:text-yellow-500">{instPayData.isAddingReceiver ? 'Selecionar Existente' : '+ Novo'}</button></div>{instPayData.isAddingReceiver ? (<input className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-white text-sm outline-none focus:border-emerald-500" placeholder="Nome do recebedor..." value={instPayData.receiver} onChange={e => setInstPayData({ ...instPayData, receiver: e.target.value })} autoFocus />) : (<select className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-white text-sm outline-none focus:border-emerald-500" value={instPayData.receiver} onChange={e => setInstPayData({ ...instPayData, receiver: e.target.value })}><option value="">Selecione...</option>{existingReceivers.map(r => <option key={r} value={r}>{r}</option>)}</select>)}</div>
                                            <div className="grid grid-cols-3 gap-2"><div><label className="text-[10px] font-bold text-zinc-500 uppercase mb-1 block">Tipo</label><select className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-white text-sm outline-none focus:border-emerald-500" value={instPayData.accType} onChange={e => setInstPayData({ ...instPayData, accType: e.target.value as any })}><option value="PJ">PJ</option><option value="PF">PF</option></select></div><div className="col-span-2"><div className="flex justify-between mb-1"><label className="text-[10px] font-bold text-zinc-500 uppercase">Conta</label><button onClick={() => setInstPayData({ ...instPayData, isAddingAccount: !instPayData.isAddingAccount, account: '' })} className="text-[10px] text-yellow-600 hover:text-yellow-500">{instPayData.isAddingAccount ? 'Selecionar' : '+ Nova'}</button></div>{instPayData.isAddingAccount ? (<input className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-white text-sm outline-none focus:border-emerald-500" placeholder="Ex: Nubank..." value={instPayData.account} onChange={e => setInstPayData({ ...instPayData, account: e.target.value })} />) : (<select className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-white text-sm outline-none focus:border-emerald-500" value={instPayData.account} onChange={e => setInstPayData({ ...instPayData, account: e.target.value })}><option value="">Selecione...</option>{existingAccounts.map(a => <option key={a} value={a}>{a}</option>)}</select>)}</div></div>
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 border-t border-[var(--border-main)] flex gap-2"><button onClick={() => setInstallmentToPay(null)} className="flex-1 py-2.5 bg-[var(--bg-card)] text-zinc-300 rounded-lg hover:bg-[var(--bg-base)] transition-colors text-sm font-medium">Cancelar</button><button onClick={confirmInstallmentPayment} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/20 text-sm">Confirmar Recebimento</button></div>
                            </div>
                        </div>
                    )
                }

                {/* 2. PAGAMENTO GPS */}
                {
                    gpsToPay && (
                        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
                            <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-xl w-full max-w-sm shadow-2xl animate-in zoom-in duration-200">
                                <div className="p-4 border-b border-[var(--border-main)]">
                                    <h4 className="font-bold text-white flex items-center gap-2"><FileSpreadsheet size={16} className="text-blue-400" /> Pagamento GPS {gpsToPay.competencia}</h4>
                                </div>
                                <div className="p-4 space-y-4">
                                    <div><label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1.5">Forma de Pagamento</label><div className="flex gap-2"><button onClick={() => setGpsPayData({ ...gpsPayData, method: 'Pix' })} className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${gpsPayData.method === 'Pix' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600'}`}>Pix</button><button onClick={() => setGpsPayData({ ...gpsPayData, method: 'Boleto' })} className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${gpsPayData.method === 'Boleto' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600'}`}>Boleto</button></div></div>

                                    {/* Quem Pagou */}
                                    <div><div className="flex justify-between mb-1"><label className="text-[10px] font-bold text-zinc-500 uppercase">Quem Pagou?</label><button onClick={() => setGpsPayData({ ...gpsPayData, isAddingPayer: !gpsPayData.isAddingPayer, payer: '' })} className="text-[10px] text-yellow-600 hover:text-yellow-500">{gpsPayData.isAddingPayer ? 'Selecionar' : '+ Novo'}</button></div>{gpsPayData.isAddingPayer ? (<input className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-white text-sm outline-none focus:border-emerald-500" placeholder="Nome..." value={gpsPayData.payer} onChange={e => setGpsPayData({ ...gpsPayData, payer: e.target.value })} autoFocus />) : (<select className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-white text-sm outline-none focus:border-emerald-500" value={gpsPayData.payer} onChange={e => setGpsPayData({ ...gpsPayData, payer: e.target.value })}><option value="">Selecione...</option>{existingReceivers.map(r => <option key={r} value={r}>{r}</option>)}<option value="Escritório">Escritório</option><option value="Cliente">Cliente</option></select>)}</div>

                                    {/* Detalhes da Conta (NOVO BLOCO - Igual Honorários) */}
                                    <div className="grid grid-cols-3 gap-2 animate-in fade-in slide-in-from-top-2">
                                        <div>
                                            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Tipo</label>
                                            <select className="w-full bg-[var(--bg-base)] border border-[var(--border-main)] rounded-lg p-2.5 text-white text-sm outline-none focus:border-emerald-500" value={gpsPayData.accType} onChange={e => setGpsPayData({ ...gpsPayData, accType: e.target.value as any })}>
                                                <option value="PJ">PJ</option>
                                                <option value="PF">PF</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2">
                                            <div className="flex justify-between mb-1">
                                                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Conta</label>
                                                <button onClick={() => setGpsPayData({ ...gpsPayData, isAddingAccount: !gpsPayData.isAddingAccount, account: '' })} className="text-[10px] text-yellow-600 hover:text-yellow-500">
                                                    {gpsPayData.isAddingAccount ? 'Selecionar' : '+ Nova'}
                                                </button>
                                            </div>
                                            {gpsPayData.isAddingAccount ? (
                                                <input className="w-full bg-[var(--bg-base)] border border-[var(--border-main)] rounded-lg p-2.5 text-white text-sm outline-none focus:border-emerald-500" placeholder="Ex: Nubank..." value={gpsPayData.account} onChange={e => setGpsPayData({ ...gpsPayData, account: e.target.value })} />
                                            ) : (
                                                <select className="w-full bg-[var(--bg-base)] border border-[var(--border-main)] rounded-lg p-2.5 text-white text-sm outline-none focus:border-emerald-500" value={gpsPayData.account} onChange={e => setGpsPayData({ ...gpsPayData, account: e.target.value })}>
                                                    <option value="">Selecione...</option>
                                                    {existingAccounts.map(a => <option key={a} value={a}>{a}</option>)}
                                                </select>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 border-t border-[var(--border-main)] flex gap-2"><button onClick={() => setGpsToPay(null)} className="flex-1 py-2.5 bg-[var(--bg-card)] text-zinc-300 rounded-lg hover:bg-[var(--bg-base)] transition-colors text-sm font-medium">Cancelar</button><button onClick={confirmGPSPayment} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/20 text-sm">Confirmar Pagamento</button></div>
                            </div>
                        </div>
                    )
                }

                {/* 3. PAGAMENTO HONORARIOS */}
                {
                    isConfirmingHonorarios && (
                        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
                            <div className="bg-[var(--bg-surface)] border border-emerald-500/30 rounded-xl w-full max-w-sm shadow-2xl animate-in zoom-in duration-200">
                                <div className="p-4 border-b border-[var(--border-main)] bg-emerald-900/10">
                                    <h4 className="font-bold text-white text-center flex items-center justify-center gap-2"><HandCoins size={18} className="text-emerald-500" /> Confirmar Recebimento</h4>
                                    <p className="text-xs text-emerald-400 text-center mt-1 font-medium">Honorários do Processo</p>
                                </div>
                                <div className="p-4 space-y-4">
                                    <div><label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1.5">Forma de Recebimento</label><div className="flex gap-2"><button onClick={() => setHonorariosData({ ...honorariosData, method: 'Especie' })} className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${honorariosData.method === 'Especie' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-[var(--bg-base)] border-[var(--border-main)] text-[var(--text-muted)] hover:border-emerald-500/50'}`}>Espécie</button><button onClick={() => setHonorariosData({ ...honorariosData, method: 'Conta' })} className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${honorariosData.method === 'Conta' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-[var(--bg-base)] border-[var(--border-main)] text-[var(--text-muted)] hover:border-emerald-500/50'}`}>Conta</button></div></div>
                                    {honorariosData.method === 'Conta' && (
                                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                            <div><div className="flex justify-between mb-1"><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Quem Recebeu?</label><button onClick={() => setHonorariosData({ ...honorariosData, isAddingReceiver: !honorariosData.isAddingReceiver, receiver: '' })} className="text-[10px] text-yellow-600 hover:text-yellow-500">{honorariosData.isAddingReceiver ? 'Selecionar' : '+ Novo'}</button></div>{honorariosData.isAddingReceiver ? (<input className="w-full bg-[var(--bg-base)] border border-[var(--border-main)] rounded-lg p-2.5 text-white text-sm outline-none focus:border-emerald-500" placeholder="Nome..." value={honorariosData.receiver} onChange={e => setHonorariosData({ ...honorariosData, receiver: e.target.value })} />) : (<select className="w-full bg-[var(--bg-base)] border border-[var(--border-main)] rounded-lg p-2.5 text-white text-sm outline-none focus:border-emerald-500" value={honorariosData.receiver} onChange={e => setHonorariosData({ ...honorariosData, receiver: e.target.value })}><option value="">Selecione...</option>{existingReceivers.map(r => <option key={r} value={r}>{r}</option>)}</select>)}</div>
                                            <div className="grid grid-cols-3 gap-2"><div><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Tipo</label><select className="w-full bg-[var(--bg-base)] border border-[var(--border-main)] rounded-lg p-2.5 text-white text-sm outline-none focus:border-emerald-500" value={honorariosData.accType} onChange={e => setHonorariosData({ ...honorariosData, accType: e.target.value as any })}><option value="PJ">PJ</option><option value="PF">PF</option></select></div><div className="col-span-2"><div className="flex justify-between mb-1"><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Conta</label><button onClick={() => setHonorariosData({ ...honorariosData, isAddingAccount: !honorariosData.isAddingAccount, account: '' })} className="text-[10px] text-yellow-600 hover:text-yellow-500">{honorariosData.isAddingAccount ? 'Selecionar' : '+ Nova'}</button></div>{honorariosData.isAddingAccount ? (<input className="w-full bg-[var(--bg-base)] border border-[var(--border-main)] rounded-lg p-2.5 text-white text-sm outline-none focus:border-emerald-500" placeholder="Ex: Nubank..." value={honorariosData.account} onChange={e => setHonorariosData({ ...honorariosData, account: e.target.value })} />) : (<select className="w-full bg-[var(--bg-base)] border border-[var(--border-main)] rounded-lg p-2.5 text-white text-sm outline-none focus:border-emerald-500" value={honorariosData.account} onChange={e => setHonorariosData({ ...honorariosData, account: e.target.value })}><option value="">Selecione...</option>{existingAccounts.map(a => <option key={a} value={a}>{a}</option>)}</select>)}</div></div>
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 border-t border-[var(--border-main)] flex gap-2">
                                    <button onClick={() => { setIsConfirmingHonorarios(false); setEditedCase({ ...editedCase, status_pagamento: 'Pendente' }); }} className="flex-1 py-2.5 bg-[var(--bg-card)] text-zinc-300 rounded-lg hover:bg-[var(--bg-base)] transition-colors text-sm font-medium">Cancelar</button>
                                    {/* BOTÃO CONFIRMAR AGORA CHAMA finalizeSaveWithHonorarios */}
                                    <button onClick={finalizeSaveWithHonorarios} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/20 text-sm">Confirmar Dados</button>
                                </div>
                            </div>
                        </div>
                    )
                }
            </div>
        </>
    );
};

export default CaseDetailsModal;
