import React, { useState, useCallback, useRef } from 'react';
import { X, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Loader2, Building2, Users, ChevronRight, ChevronLeft, Trash2, Download, Copy, Clock } from 'lucide-react';
import { Client, Branch, Captador, User } from '../../types';
import { parseImportExcel, enrichClientWithCep, getIncompleteFields, findDuplicateCpfs, findIntraSpreadsheetDuplicates, matchCaptador, normalizeString, downloadTemplateExcel, saveImportLog, fetchImportLogs } from '../../services/importService';
import { checkCpfExists } from '../../services/clientsService';
import CustomSelect from '../ui/CustomSelect';
import { v4 as uuidv4 } from 'uuid';
import { formatDateDisplay } from '../../utils/dateUtils';

interface ImportClientsModalProps {
    isOpen: boolean;
    onClose: () => void;
    addClient: (client: Client) => Promise<void>;
    updateClient: (client: Client) => Promise<void>;
    showToast: (type: 'success' | 'error' | 'warning', message: string) => void;
    captadores: Captador[];
    addCaptador: (nome: string, filial: string) => Promise<Captador | null>;
    user: User | null;
}

const BRANCH_OPTIONS = Object.values(Branch).map(b => ({ label: b, value: b }));

type ImportStep = 'upload' | 'checking' | 'spreadsheet_dupes' | 'duplicates' | 'preview' | 'importing' | 'done' | 'history';

interface DuplicateInfo {
    index: number;
    existingName: string;
    clientName: string;
    cpf: string;
}

interface SpreadsheetDupeGroup {
    cpf: string;
    indices: number[];
    names: string[];
}

interface ImportResult {
    total: number;
    success: number;
    skipped: number;
    captadoresAdded: number;
    errors: string[];
}

const ImportClientsModal: React.FC<ImportClientsModalProps> = ({ isOpen, onClose, addClient, updateClient, showToast, captadores, addCaptador, user }) => {
    const [step, setStep] = useState<ImportStep>('upload');
    const [parsedClients, setParsedClients] = useState<Partial<Client>[]>([]);
    const [selectedBranch, setSelectedBranch] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [fileName, setFileName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([]);
    const [spreadsheetDupes, setSpreadsheetDupes] = useState<SpreadsheetDupeGroup[]>([]);
    const [importLogs, setImportLogs] = useState<any[]>([]);
    const [selectedLog, setSelectedLog] = useState<any | null>(null);

    // New state for Update Existing feature
    const [shouldUpdateDuplicates, setShouldUpdateDuplicates] = useState(false);
    const [fieldsToUpdate, setFieldsToUpdate] = useState<Set<string>>(new Set(['reap_history']));

    const fileInputRef = useRef<HTMLInputElement>(null);
    const abortRef = useRef(false);

    const reset = useCallback(() => {
        setStep('upload');
        setParsedClients([]);
        setSelectedBranch('');
        setFileName('');
        setIsLoading(false);
        setProgress(0);
        setResult(null);
        setDuplicates([]);
        setSpreadsheetDupes([]);
        setImportLogs([]);
        setSelectedLog(null);
        setShouldUpdateDuplicates(false);
        setFieldsToUpdate(new Set(['reap_history']));
        abortRef.current = false;
    }, []);

    const handleClose = useCallback(() => {
        if (step === 'importing' || step === 'checking') {
            abortRef.current = true;
            return;
        }
        reset();
        onClose();
    }, [step, reset, onClose]);

    const handleFile = useCallback(async (file: File) => {
        if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
            showToast('error', 'Formato inválido. Use arquivos .xlsx ou .xls');
            return;
        }
        setIsLoading(true);
        setFileName(file.name);
        try {
            const clients = await parseImportExcel(file);
            if (clients.length === 0) {
                showToast('error', 'Nenhum cliente válido encontrado na planilha.');
                setIsLoading(false);
                return;
            }
            setParsedClients(clients);
            setIsLoading(false);

            // Step 1: Check for intra-spreadsheet duplicates first
            const intraDupes = findIntraSpreadsheetDuplicates(clients);
            if (intraDupes.length > 0) {
                setSpreadsheetDupes(intraDupes);
                setStep('spreadsheet_dupes');
                return;
            }

            // Step 2: Check for database duplicates
            setStep('checking');
            const dbDupes = await findDuplicateCpfs(clients);
            if (dbDupes.length > 0) {
                setDuplicates(dbDupes.map(d => ({
                    ...d,
                    clientName: clients[d.index].nome_completo || '—',
                    cpf: clients[d.index].cpf_cnpj || '—',
                })));
                setStep('duplicates');
            } else {
                setStep('preview');
            }
        } catch (err: any) {
            showToast('error', `Erro ao ler planilha: ${err.message}`);
            setStep('upload');
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }, [handleFile]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    }, [handleFile]);

    const removeClient = useCallback((index: number) => {
        setParsedClients(prev => prev.filter((_, i) => i !== index));
    }, []);

    // Remove intra-spreadsheet duplicates (keep only first occurrence of each CPF)
    const handleRemoveSpreadsheetDupes = useCallback(async () => {
        const indicesToRemove = new Set<number>();
        spreadsheetDupes.forEach(group => {
            // Keep the first, remove the rest
            group.indices.slice(1).forEach(i => indicesToRemove.add(i));
        });

        const filtered = parsedClients.filter((_, i) => !indicesToRemove.has(i));
        setParsedClients(filtered);
        setSpreadsheetDupes([]);
        showToast('success', `${indicesToRemove.size} duplicados internos removidos.`);

        // Now check for database duplicates
        setStep('checking');
        const dbDupes = await findDuplicateCpfs(filtered);
        if (dbDupes.length > 0) {
            setDuplicates(dbDupes.map(d => ({
                ...d,
                clientName: filtered[d.index].nome_completo || '—',
                cpf: filtered[d.index].cpf_cnpj || '—',
            })));
            setStep('duplicates');
        } else {
            setStep('preview');
        }
    }, [spreadsheetDupes, parsedClients, showToast]);

    const handleRemoveDuplicates = useCallback(() => {
        const dupeIndices = new Set(duplicates.map(d => d.index));
        setParsedClients(prev => prev.filter((_, i) => !dupeIndices.has(i)));
        setDuplicates([]);
        setStep('preview');
        showToast('success', `${dupeIndices.size} duplicados removidos da planilha.`);
    }, [duplicates, showToast]);

    const handleKeepDuplicates = useCallback(() => {
        setDuplicates([]);
        setShouldUpdateDuplicates(false);
        setStep('preview');
    }, []);

    const handlePrepareUpdate = useCallback(() => {
        setShouldUpdateDuplicates(true);
        setStep('preview');
    }, []);

    const handleViewHistory = useCallback(async () => {
        setIsLoading(true);
        const logs = await fetchImportLogs(30);
        setImportLogs(logs);
        setIsLoading(false);
        setStep('history');
    }, []);

    const startImport = useCallback(async () => {
        if (!selectedBranch) {
            showToast('error', 'Selecione uma filial antes de importar.');
            return;
        }

        setStep('importing');
        setProgress(0);
        abortRef.current = false;

        const importResult: ImportResult = { total: parsedClients.length, success: 0, skipped: 0, captadoresAdded: 0, errors: [] };
        const importedNames: string[] = [];
        const importedIds: string[] = [];

        // Pre-process: find captadores that don't exist and add them
        const existingCaptadorNames = new Set(
            captadores.filter(c => c.filial === selectedBranch).map(c => normalizeString(c.nome))
        );
        const captadoresToAdd = new Set<string>();

        for (const client of parsedClients) {
            const rawCaptador = (client.captador || '').trim();
            if (rawCaptador && !existingCaptadorNames.has(normalizeString(rawCaptador))) {
                captadoresToAdd.add(rawCaptador);
                existingCaptadorNames.add(normalizeString(rawCaptador)); // prevent duplicate adds
            }
        }

        // Add new captadores to the database
        for (const nome of captadoresToAdd) {
            try {
                const newCaptador = await addCaptador(nome, selectedBranch);
                if (newCaptador) {
                    importResult.captadoresAdded++;
                }
            } catch (err: any) {
                importResult.errors.push(`Erro ao adicionar captador "${nome}": ${err.message}`);
            }
        }

        for (let i = 0; i < parsedClients.length; i++) {
            if (abortRef.current) {
                importResult.errors.push('Importação cancelada pelo usuário.');
                break;
            }

            const rawClient = parsedClients[i];
            setProgress(Math.round(((i + 1) / parsedClients.length) * 100));

            try {
                const enriched = await enrichClientWithCep(rawClient);

                // Match captador (accent-insensitive)
                const matchedCaptador = matchCaptador(enriched.captador || '', captadores, selectedBranch);

                // --- Lógica de Upsert / Update Seletivo ---
                const { exists, client: existingClient } = await checkCpfExists(enriched.cpf_cnpj || '');

                if (exists && existingClient) {
                    if (shouldUpdateDuplicates) {
                        // Atualização seletiva
                        const updatePayload: Partial<Client> = {
                            id: existingClient.id,
                            filial: selectedBranch, // Sempre atualiza a filial para a selecionada
                        };

                        if (fieldsToUpdate.has('nome_completo')) updatePayload.nome_completo = enriched.nome_completo;
                        if (fieldsToUpdate.has('data_nascimento')) updatePayload.data_nascimento = enriched.data_nascimento;
                        if (fieldsToUpdate.has('sexo')) updatePayload.sexo = enriched.sexo;
                        if (fieldsToUpdate.has('telefone')) updatePayload.telefone = enriched.telefone;
                        if (fieldsToUpdate.has('profissao')) updatePayload.profissao = enriched.profissao;
                        if (fieldsToUpdate.has('senha_gov')) updatePayload.senha_gov = enriched.senha_gov;
                        if (fieldsToUpdate.has('pendencias')) updatePayload.pendencias = enriched.pendencias;
                        if (fieldsToUpdate.has('captador')) updatePayload.captador = matchedCaptador || enriched.captador || '';

                        if (fieldsToUpdate.has('reap_history')) {
                            updatePayload.reap_history = enriched.reap_history;
                            updatePayload.reap_ano_base = enriched.reap_ano_base;
                            updatePayload.reap_status = enriched.reap_status;
                            updatePayload.rgp_status = enriched.rgp_status;
                        }

                        if (fieldsToUpdate.has('endereco_completo')) {
                            updatePayload.cep = enriched.cep;
                            updatePayload.endereco = enriched.endereco;
                            updatePayload.numero_casa = enriched.numero_casa;
                            updatePayload.bairro = enriched.bairro;
                            updatePayload.cidade = enriched.cidade;
                            updatePayload.uf = enriched.uf;
                        }

                        await updateClient(updatePayload as Client);
                        importResult.success++;
                        importedNames.push(enriched.nome_completo || 'Sem Nome');
                        importedIds.push(existingClient.id);
                    } else {
                        // Comportamento antigo: ignorar ou sobrescrever depende do que o usuário decidiu no step anterior
                        // Se chegou aqui com shouldUpdateDuplicates = false e exists = true,
                        // significa que o usuário decidiu "Manter na planilha" (Keep) ou o flux fugiu?
                        // Na verdade, se shouldUpdateDuplicates é false, nós pulamos (skipped)
                        importResult.skipped++;
                    }
                } else {
                    // Adiciona novo cliente
                    const newId = uuidv4();
                    const clientToInsert: Client = {
                        ...enriched,
                        id: newId,
                        captador: matchedCaptador || enriched.captador || '',
                        filial: selectedBranch,
                        import_source: 'imported',
                        status: 'ativo',
                        data_cadastro: new Date().toISOString()
                    } as Client;

                    await addClient(clientToInsert);
                    importResult.success++;
                    importedNames.push(clientToInsert.nome_completo);
                    importedIds.push(newId);
                }
            } catch (err: any) {
                const msg = err.message || 'desconhecido';
                importResult.errors.push(`Erro em ${rawClient.nome_completo}: ${msg}`);
            }

            if (i % 5 === 4) {
                await new Promise(r => setTimeout(r, 200));
            }
        }

        // Save Audit Log
        if (user && importResult.success > 0) {
            await saveImportLog({
                userId: user.id,
                userName: user.name,
                filial: selectedBranch,
                fileName: fileName,
                totalRows: importResult.total,
                importedCount: importResult.success,
                skippedCount: importResult.skipped,
                captadoresAdded: importResult.captadoresAdded,
                clientNames: importedNames,
                clientIds: importedIds,
                errors: importResult.errors,
            });
        }

        setResult(importResult);
        setStep('done');
    }, [parsedClients, selectedBranch, addClient, captadores, addCaptador, showToast, user, fileName]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#09090b] border border-zinc-800 rounded-2xl max-w-4xl w-full shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-zinc-800">
                    <div>
                        <h3 className="text-xl font-bold text-white font-serif flex items-center gap-2">
                            <Upload className="text-amber-500" size={24} /> Importar Clientes
                        </h3>
                        {step === 'upload' && (
                            <button
                                onClick={handleViewHistory}
                                className="ml-4 text-[10px] uppercase font-bold text-amber-500 hover:text-amber-400 border border-amber-500/20 px-2 py-1 rounded bg-amber-500/5 transition-all flex items-center gap-1"
                            >
                                <Clock size={12} /> Ver Histórico
                            </button>
                        )}
                        <p className="text-xs text-zinc-400 mt-1">
                            {step === 'upload' && 'Selecione uma planilha Excel (.xlsx) para importar'}
                            {step === 'checking' && 'Verificando CPFs duplicados...'}
                            {step === 'spreadsheet_dupes' && `CPFs duplicados encontrados na planilha`}
                            {step === 'duplicates' && `${duplicates.length} CPFs já existem no sistema`}
                            {step === 'preview' && (shouldUpdateDuplicates ? `Configurando atualização para ${duplicates.length} clientes existentes` : `${parsedClients.length} clientes prontos — revise e selecione a filial`)}
                            {step === 'importing' && `Importando... ${progress}%`}
                            {step === 'done' && 'Importação finalizada'}
                            {step === 'history' && 'Logs de auditoria das últimas importações'}
                        </p>
                    </div>
                    <button onClick={handleClose} className="text-zinc-500 hover:text-white p-2 rounded-lg hover:bg-zinc-800 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto custom-scrollbar p-6 flex-1">

                    {/* STEP: Upload */}
                    {step === 'upload' && (
                        <div className="space-y-4">
                            <div
                                className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${isDragging ? 'border-amber-500 bg-amber-500/10' : 'border-zinc-700 hover:border-zinc-500'}`}
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx,.xls"
                                    className="hidden"
                                    onChange={handleFileInput}
                                />
                                {isLoading ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <Loader2 className="text-amber-500 animate-spin" size={48} />
                                        <p className="text-zinc-300">Lendo planilha...</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-20 h-20 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                                            <FileSpreadsheet className="text-amber-500" size={40} />
                                        </div>
                                        <p className="text-zinc-300 text-lg font-medium">Arraste a planilha aqui</p>
                                        <p className="text-zinc-500 text-sm">ou clique para selecionar o arquivo</p>
                                        <div className="mt-4 flex flex-wrap gap-2 justify-center">
                                            <span className="text-[10px] px-2 py-1 bg-zinc-800 text-zinc-400 rounded-full">Nome</span>
                                            <span className="text-[10px] px-2 py-1 bg-zinc-800 text-zinc-400 rounded-full">CPF</span>
                                            <span className="text-[10px] px-2 py-1 bg-zinc-800 text-zinc-400 rounded-full">Captador</span>
                                            <span className="text-[10px] px-2 py-1 bg-zinc-800 text-zinc-400 rounded-full">Senha Gov</span>
                                            <span className="text-[10px] px-2 py-1 bg-zinc-800 text-zinc-400 rounded-full">CEP</span>
                                            <span className="text-[10px] px-2 py-1 bg-amber-800/50 text-amber-400 rounded-full">Pendência</span>
                                        </div>
                                        <p className="text-[10px] text-zinc-600 mt-2">Formatos aceitos: .xlsx, .xls</p>
                                    </div>
                                )}
                            </div>

                            {/* Download template button */}
                            <button
                                onClick={(e) => { e.stopPropagation(); downloadTemplateExcel(); }}
                                className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-dashed border-zinc-700 rounded-xl text-zinc-400 hover:text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all text-sm"
                            >
                                <Download size={16} />
                                Baixar Planilha Modelo
                            </button>
                        </div>
                    )}

                    {/* STEP: Checking */}
                    {step === 'checking' && (
                        <div className="flex flex-col items-center justify-center py-16 gap-6">
                            <Loader2 className="text-amber-500 animate-spin" size={56} />
                            <div className="text-center">
                                <p className="text-lg text-white font-medium">Verificando CPFs duplicados...</p>
                                <p className="text-sm text-zinc-400 mt-1">Comparando {parsedClients.length} CPFs com a base existente</p>
                            </div>
                        </div>
                    )}

                    {/* STEP: Spreadsheet internal duplicates */}
                    {step === 'spreadsheet_dupes' && (
                        <div className="space-y-4">
                            <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                                <Copy className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
                                <div>
                                    <p className="text-sm text-amber-300 font-medium">
                                        {spreadsheetDupes.length} CPF{spreadsheetDupes.length > 1 ? 's' : ''} duplicado{spreadsheetDupes.length > 1 ? 's' : ''} na própria planilha
                                    </p>
                                    <p className="text-xs text-zinc-400 mt-1">
                                        Os CPFs abaixo aparecem mais de uma vez. Ao remover, o sistema mantém a primeira ocorrência de cada.
                                    </p>
                                </div>
                            </div>

                            <div className="border border-zinc-800 rounded-xl overflow-hidden">
                                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-sm">
                                        <thead className="sticky top-0 bg-zinc-900 z-10">
                                            <tr className="border-b border-zinc-800">
                                                <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">CPF</th>
                                                <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Ocorrências</th>
                                                <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Nomes na Planilha</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {spreadsheetDupes.map((group, i) => (
                                                <tr key={i} className="border-b border-zinc-800/50">
                                                    <td className="px-4 py-2.5 text-zinc-400 font-mono text-xs">{group.cpf}</td>
                                                    <td className="px-4 py-2.5">
                                                        <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20 font-bold">
                                                            {group.indices.length}x
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-zinc-200">
                                                        {group.names.join(', ')}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP: Database duplicates */}
                    {step === 'duplicates' && (
                        <div className="space-y-4">
                            <div className="flex items-start gap-3 bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                                <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                                <div>
                                    <p className="text-sm text-red-300 font-medium">
                                        {duplicates.length} CPF{duplicates.length > 1 ? 's' : ''} já existe{duplicates.length > 1 ? 'm' : ''} no sistema
                                    </p>
                                    <p className="text-xs text-zinc-400 mt-1">
                                        Deseja remover esses clientes da planilha antes de importar?
                                    </p>
                                </div>
                            </div>

                            <div className="border border-zinc-800 rounded-xl overflow-hidden">
                                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-sm">
                                        <thead className="sticky top-0 bg-zinc-900 z-10">
                                            <tr className="border-b border-zinc-800">
                                                <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Na Planilha</th>
                                                <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">CPF</th>
                                                <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Já no Sistema</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {duplicates.map((d, i) => (
                                                <tr key={i} className="border-b border-zinc-800/50">
                                                    <td className="px-4 py-2.5 text-zinc-200">{d.clientName}</td>
                                                    <td className="px-4 py-2.5 text-zinc-400 font-mono text-xs">{d.cpf}</td>
                                                    <td className="px-4 py-2.5 text-red-400 font-medium">{d.existingName}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP: Preview */}
                    {step === 'preview' && (
                        <div className="space-y-4">
                            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                                <div className="flex flex-col gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1 max-w-xs">
                                            <CustomSelect
                                                label="Filial para todos os clientes"
                                                value={selectedBranch}
                                                onChange={setSelectedBranch}
                                                options={BRANCH_OPTIONS}
                                                icon={Building2}
                                                placeholder="Selecione a filial..."
                                            />
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                                            <Users size={16} />
                                            <span><strong className="text-white">{parsedClients.length}</strong> clientes</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                                            <FileSpreadsheet size={16} />
                                            <span className="text-xs">{fileName}</span>
                                        </div>
                                        {shouldUpdateDuplicates && (
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-500 text-xs font-bold">
                                                <Clock size={14} /> MODO ATUALIZAÇÃO ATIVO
                                            </div>
                                        )}
                                    </div>

                                    {shouldUpdateDuplicates && (
                                        <div className="border-t border-zinc-800 pt-4">
                                            <p className="text-xs font-bold text-zinc-400 uppercase mb-3 flex items-center gap-2">
                                                <CheckCircle2 size={14} className="text-amber-500" />
                                                Selecione os dados que deseja atualizar nos clientes existentes:
                                            </p>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                {[
                                                    { id: 'nome_completo', label: 'Nome Completo' },
                                                    { id: 'data_nascimento', label: 'Nascimento' },
                                                    { id: 'telefone', label: 'Telefone' },
                                                    { id: 'profissao', label: 'Profissão' },
                                                    { id: 'captador', label: 'Captador' },
                                                    { id: 'reap_history', label: 'Histórico REAP' },
                                                    { id: 'senha_gov', label: 'Senha Gov' },
                                                    { id: 'endereco_completo', label: 'Endereço Completo' },
                                                    { id: 'pendencias', label: 'Pendências' },
                                                ].map(field => (
                                                    <label
                                                        key={field.id}
                                                        className={`flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer ${fieldsToUpdate.has(field.id) ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-zinc-800/30 border-zinc-700/50 text-zinc-500 hover:border-zinc-600'}`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only"
                                                            checked={fieldsToUpdate.has(field.id)}
                                                            onChange={() => {
                                                                const next = new Set(fieldsToUpdate);
                                                                if (next.has(field.id)) next.delete(field.id);
                                                                else next.add(field.id);
                                                                setFieldsToUpdate(next);
                                                            }}
                                                        />
                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${fieldsToUpdate.has(field.id) ? 'bg-amber-500 border-amber-500' : 'border-zinc-600'}`}>
                                                            {fieldsToUpdate.has(field.id) && <CheckCircle2 size={10} className="text-black" />}
                                                        </div>
                                                        <span className="text-[11px] font-medium whitespace-nowrap">{field.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/30">
                                <div className="max-h-[500px] overflow-auto custom-scrollbar">
                                    <table className="w-full text-sm border-collapse min-w-[2000px]">
                                        <thead className="sticky top-0 bg-zinc-900 z-20">
                                            <tr className="border-b border-zinc-800">
                                                <th className="sticky left-0 bg-zinc-900 z-30 text-left text-xs text-zinc-500 font-medium px-4 py-3 w-12 border-r border-zinc-800">#</th>
                                                <th className="sticky left-12 bg-zinc-900 z-30 text-left text-xs text-zinc-500 font-medium px-4 py-3 min-w-[250px] border-r border-zinc-800 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">Nome / CPF</th>
                                                <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3 min-w-[120px]">Nascimento</th>
                                                <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3 min-w-[100px]">Sexo</th>
                                                <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3 min-w-[150px]">Telefone</th>
                                                <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3 min-w-[150px]">RG / Órgão</th>
                                                <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3 min-w-[180px]">Profissão</th>
                                                <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3 min-w-[220px]">Manutenção REAP</th>
                                                <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3 min-w-[100px]">CEP</th>
                                                <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3 min-w-[300px]">Endereço / Nº / Bairro</th>
                                                <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3 min-w-[200px]">Cidade / UF</th>
                                                <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3 min-w-[150px]">Senha Gov</th>
                                                <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3 min-w-[150px]">Captador</th>
                                                <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3 min-w-[200px]">Pendências</th>
                                                <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3 min-w-[100px]">Cadastro</th>
                                                <th className="sticky right-0 bg-zinc-900 z-30 text-center text-xs text-zinc-500 font-medium px-4 py-3 w-12 border-l border-zinc-800 shadow-[-2px_0_5px_rgba(0,0,0,0.3)]"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {parsedClients.map((client, idx) => {
                                                const missing = getIncompleteFields(client);
                                                const pendencias = client.pendencias || [];
                                                const reapHistory = client.reap_history || {};
                                                const hasReap = Object.keys(reapHistory).length > 0;

                                                return (
                                                    <tr key={idx} className="border-b border-zinc-800/50 hover:bg-zinc-800/40 transition-colors group">
                                                        <td className="sticky left-0 bg-zinc-950 group-hover:bg-zinc-900 z-10 px-4 py-2.5 text-zinc-600 text-xs border-r border-zinc-800">{idx + 1}</td>
                                                        <td className="sticky left-12 bg-zinc-950 group-hover:bg-zinc-900 z-10 px-4 py-2.5 min-w-[250px] border-r border-zinc-800 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                                                            <div className="text-zinc-200 font-bold truncate max-w-[220px]">{client.nome_completo || '—'}</div>
                                                            <div className="text-[10px] text-zinc-500 font-mono tracking-tighter">{client.cpf_cnpj || '—'}</div>
                                                        </td>
                                                        <td className="px-4 py-2.5 text-zinc-300 text-xs">{client.data_nascimento || '—'}</td>
                                                        <td className="px-4 py-2.5 text-zinc-300 text-xs">{client.sexo || '—'}</td>
                                                        <td className="px-4 py-2.5 text-zinc-300 text-xs">{client.telefone || '—'}</td>
                                                        <td className="px-4 py-2.5 text-zinc-300 text-xs">
                                                            {client.rg ? `${client.rg}${client.orgao_emissor ? ` / ${client.orgao_emissor}` : ''}` : '—'}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-zinc-300 text-xs truncate max-w-[180px]">{client.profissao || '—'}</td>
                                                        <td className="px-4 py-2.5">
                                                            {hasReap ? (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {Object.keys(reapHistory).sort().map(year => (
                                                                        <span key={year} className="text-[9px] px-1.5 py-0.5 bg-gold-500/10 text-gold-500 rounded border border-gold-500/20 font-bold" title={`Histórico REAP ${year}`}>
                                                                            {year}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <span className="text-zinc-600 text-xs">—</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-zinc-300 text-xs font-mono">{client.cep || '—'}</td>
                                                        <td className="px-4 py-2.5 text-zinc-300 text-xs truncate max-w-[300px]">
                                                            {client.endereco ? `${client.endereco}${client.numero_casa ? `, ${client.numero_casa}` : ''}${client.bairro ? ` - ${client.bairro}` : ''}` : '—'}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-zinc-300 text-xs">
                                                            {client.cidade ? `${client.cidade}${client.uf ? `/${client.uf}` : ''}` : '—'}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-zinc-400 text-xs font-mono">{client.senha_gov || '—'}</td>
                                                        <td className="px-4 py-2.5 text-zinc-300 text-xs">{client.captador || '—'}</td>
                                                        <td className="px-4 py-2.5">
                                                            {pendencias.length > 0 ? (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {pendencias.map(p => (
                                                                        <span key={p} className="text-[9px] px-1.5 py-0.5 bg-red-500/10 text-red-400 rounded border border-red-500/20 whitespace-nowrap">
                                                                            {p}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <span className="text-zinc-600 text-xs">—</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            {missing.length > 0 ? (
                                                                <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20 font-bold">
                                                                    {missing.length} pendentes
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 font-bold">
                                                                    Completo
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="sticky right-0 bg-zinc-950 group-hover:bg-zinc-900 z-10 px-4 py-2.5 text-center border-l border-zinc-800 shadow-[-2px_0_5px_rgba(0,0,0,0.1)]">
                                                            <button
                                                                onClick={() => removeClient(idx)}
                                                                className="text-zinc-600 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10"
                                                                title="Remover da lista"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                                <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={18} />
                                <div>
                                    <p className="text-sm text-amber-300 font-medium">Clientes com dados incompletos</p>
                                    <p className="text-xs text-zinc-400 mt-1">
                                        Clientes importados sem todos os dados serão marcados com ícone amarelo.
                                        Captadores serão associados automaticamente por nome (sem considerar acentos).
                                        Captadores novos serão adicionados automaticamente à base.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP: Importing */}
                    {step === 'importing' && (
                        <div className="flex flex-col items-center justify-center py-12 gap-6">
                            <Loader2 className="text-amber-500 animate-spin" size={56} />
                            <div className="text-center">
                                <p className="text-lg text-white font-medium">Importando clientes...</p>
                                <p className="text-sm text-zinc-400 mt-1">{Math.round(progress * parsedClients.length / 100)} de {parsedClients.length}</p>
                            </div>
                            <div className="w-full max-w-md bg-zinc-800 rounded-full h-3 overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <button
                                onClick={() => { abortRef.current = true; }}
                                className="text-xs text-zinc-500 hover:text-red-400 transition-colors mt-2"
                            >
                                Cancelar importação
                            </button>
                        </div>
                    )}

                    {/* STEP: Done */}
                    {step === 'done' && result && (
                        <div className="space-y-6">
                            <div className="text-center py-8">
                                <CheckCircle2 className="text-emerald-500 mx-auto mb-4" size={56} />
                                <p className="text-xl text-white font-bold">Importação Concluída!</p>
                                <p className="text-sm text-zinc-400 mt-1">Registrado no log de auditoria</p>
                            </div>

                            <div className="grid grid-cols-4 gap-3">
                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-emerald-400">{result.success}</p>
                                    <p className="text-xs text-zinc-400">Importados</p>
                                </div>
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-amber-400">{result.skipped}</p>
                                    <p className="text-xs text-zinc-400">CPF Duplicado</p>
                                </div>
                                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-blue-400">{result.captadoresAdded}</p>
                                    <p className="text-xs text-zinc-400">Captadores Novos</p>
                                </div>
                                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-red-400">{result.errors.length > 0 ? result.errors.length : 0}</p>
                                    <p className="text-xs text-zinc-400">Avisos</p>
                                </div>
                            </div>

                            {result.errors.length > 0 && (
                                <div className="border border-zinc-800 rounded-xl overflow-hidden">
                                    <div className="p-3 bg-zinc-900 border-b border-zinc-800">
                                        <p className="text-xs font-bold text-zinc-400 uppercase">Log de Importação</p>
                                    </div>
                                    <div className="max-h-40 overflow-y-auto custom-scrollbar p-3 space-y-1">
                                        {result.errors.map((err, i) => (
                                            <p key={i} className="text-xs text-zinc-500 font-mono">{err}</p>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP: History */}
                    {step === 'history' && (
                        <div className="space-y-6">
                            {selectedLog ? (
                                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                                    <div className="flex items-center justify-between">
                                        <button
                                            onClick={() => setSelectedLog(null)}
                                            className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1 font-bold"
                                        >
                                            <ChevronLeft size={14} /> Voltar à lista
                                        </button>
                                        <span className="text-xs text-zinc-500 font-mono">{selectedLog.file_name}</span>
                                    </div>

                                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div><span className="text-[10px] text-zinc-500 uppercase block">Data</span><span className="text-sm text-zinc-200">{formatDateDisplay(selectedLog.created_at)}</span></div>
                                        <div><span className="text-[10px] text-zinc-500 uppercase block">Usuário</span><span className="text-sm text-zinc-200">{selectedLog.user_name}</span></div>
                                        <div><span className="text-[10px] text-zinc-500 uppercase block">Filial</span><span className="text-sm text-zinc-200 font-bold">{selectedLog.filial}</span></div>
                                        <div><span className="text-[10px] text-zinc-500 uppercase block">Total</span><span className="text-sm text-emerald-400 font-bold">{selectedLog.imported_count} clientes</span></div>
                                    </div>

                                    <div className="border border-zinc-800 rounded-xl overflow-hidden">
                                        <div className="p-3 bg-zinc-900 border-b border-zinc-800 flex items-center gap-2">
                                            <Users size={14} className="text-zinc-500" />
                                            <p className="text-[10px] font-bold text-zinc-400 uppercase">Clientes Importados nesta sessão</p>
                                        </div>
                                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-4">
                                            {selectedLog.client_names && selectedLog.client_names.length > 0 ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    {selectedLog.client_names.map((name: string, i: number) => (
                                                        <div key={i} className="text-xs text-zinc-300 flex items-center gap-2 bg-zinc-800/30 px-3 py-2 rounded border border-white/5">
                                                            <div className="w-1 h-1 bg-emerald-500 rounded-full"></div>
                                                            {name}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-zinc-500 italic text-center py-4">Nenhum nome registrado.</p>
                                            )}
                                        </div>
                                    </div>

                                    {selectedLog.errors && selectedLog.errors.length > 0 && (
                                        <div className="border border-red-900/20 rounded-xl bg-red-900/5 p-4">
                                            <p className="text-[10px] font-bold text-red-400 uppercase mb-2">Erros / Bloqueios</p>
                                            <div className="max-h-[150px] overflow-y-auto custom-scrollbar space-y-1">
                                                {selectedLog.errors.map((err: string, i: number) => (
                                                    <p key={i} className="text-[10px] text-zinc-500 font-mono">{err}</p>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="border border-zinc-800 rounded-xl overflow-hidden animate-in fade-in duration-300">
                                    <div className="max-h-[450px] overflow-y-auto custom-scrollbar">
                                        <table className="w-full text-sm">
                                            <thead className="sticky top-0 bg-zinc-900 z-10">
                                                <tr className="border-b border-zinc-800 text-left">
                                                    <th className="text-xs text-zinc-500 font-medium px-4 py-3">Data</th>
                                                    <th className="text-xs text-zinc-500 font-medium px-4 py-3">Usuário</th>
                                                    <th className="text-xs text-zinc-500 font-medium px-4 py-3">Filial</th>
                                                    <th className="text-xs text-zinc-500 font-medium px-4 py-3">Qtde</th>
                                                    <th className="text-xs text-zinc-500 font-medium px-4 py-3 w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {importLogs.map((log) => (
                                                    <tr
                                                        key={log.id}
                                                        onClick={() => setSelectedLog(log)}
                                                        className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors cursor-pointer group"
                                                    >
                                                        <td className="px-4 py-3 text-zinc-400 text-xs">
                                                            {new Date(log.created_at).toLocaleDateString('pt-BR')} {' '}
                                                            <span className="opacity-50 text-[10px] font-mono">
                                                                {new Date(log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-zinc-200 font-medium">{log.user_name}</td>
                                                        <td className="px-4 py-3 text-zinc-400 text-xs font-bold">{log.filial}</td>
                                                        <td className="px-4 py-3">
                                                            <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 font-bold whitespace-nowrap">
                                                                {log.imported_count} OK
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-zinc-600 group-hover:text-amber-500 transition-colors">
                                                            <ChevronRight size={16} />
                                                        </td>
                                                    </tr>
                                                ))}
                                                {importLogs.length === 0 && (
                                                    <tr>
                                                        <td colSpan={5} className="py-12 text-center text-zinc-500 italic text-sm">Nenhum log de importação encontrado.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-zinc-800 flex justify-between items-center">
                    {(step === 'preview' || step === 'history') && (
                        <button
                            onClick={() => {
                                setStep('upload');
                                setParsedClients([]);
                                setFileName('');
                                setDuplicates([]);
                                setSpreadsheetDupes([]);
                                setImportLogs([]);
                                setSelectedLog(null);
                                setShouldUpdateDuplicates(false);
                            }}
                            className="px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors flex items-center gap-2 text-sm"
                        >
                            <ChevronLeft size={16} /> Voltar
                        </button>
                    )}
                    {step !== 'preview' && <div />}

                    <div className="flex gap-3">
                        {(step === 'upload' || step === 'preview' || step === 'history') && (
                            <button onClick={handleClose} className="px-5 py-2.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors font-medium">
                                Cancelar
                            </button>
                        )}

                        {step === 'spreadsheet_dupes' && (
                            <button
                                onClick={handleRemoveSpreadsheetDupes}
                                className="px-6 py-2.5 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95 bg-amber-600 text-white hover:bg-amber-500 shadow-amber-600/20"
                            >
                                <Trash2 size={18} /> Remover Duplicados da Planilha
                            </button>
                        )}

                        {step === 'duplicates' && (
                            <>
                                <button
                                    onClick={handleKeepDuplicates}
                                    className="px-5 py-2.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors font-medium"
                                >
                                    Pular e não importar
                                </button>
                                <button
                                    onClick={handlePrepareUpdate}
                                    className="px-6 py-2.5 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95 border border-amber-600/50 text-amber-500 hover:bg-amber-600/10"
                                >
                                    <Clock size={18} /> Atualizar Existentes
                                </button>
                                <button
                                    onClick={handleRemoveDuplicates}
                                    className="px-6 py-2.5 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95 bg-red-600 text-white hover:bg-red-500 shadow-red-600/20"
                                >
                                    <Trash2 size={18} /> Remover da Planilha
                                </button>
                            </>
                        )}

                        {step === 'preview' && (
                            <button
                                onClick={startImport}
                                disabled={parsedClients.length === 0 || !selectedBranch}
                                className="px-6 py-2.5 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95 bg-amber-600 text-white hover:bg-amber-500 shadow-amber-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Upload size={18} /> Importar {parsedClients.length} Clientes
                                <ChevronRight size={16} />
                            </button>
                        )}
                        {step === 'done' && (
                            <button
                                onClick={handleClose}
                                className="px-6 py-2.5 rounded-xl font-bold shadow-lg flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-500 transition-all active:scale-95"
                            >
                                <CheckCircle2 size={18} /> Fechar
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImportClientsModal;
