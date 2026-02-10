import React, { memo, useMemo, useState } from 'react';
import { Client, Case, Captador, Branch, CaseStatus } from '../../types';
import { formatDateDisplay } from '../../utils/dateUtils';
import { formatCurrencyInput, formatPhone } from '../../services/formatters';
import { AlertTriangle, CheckCircle2, Users, Clock, Building2, Share2, Plus, Check, X, Trash2, FileSpreadsheet, MessageCircle, MapPin, FileText, ChevronRight, Shield, Gavel, User, CreditCard } from 'lucide-react';
import CustomSelect from '../ui/CustomSelect';
import { useApp } from '../../context/AppContext';
import { fetchAddressByCep } from '../../services/cepService';
import { getIncompleteFields } from '../../services/importService';

interface ClientInfoTabProps {
    client: Client;
    editedClient: Client;
    isEditMode: boolean;
    setEditedClient: (client: Client) => void;
    // Removed many props that are now internal
    setIsWhatsAppModalOpen: (val: boolean) => void;
    cases: Case[];
    onSelectCase?: (caseItem: Case) => void;
    openNewCaseWithParams: (clientId: string, type: any, clientName?: string) => void;
    onClose: () => void;
}

const PENDING_OPTIONS = [
    'Senha',
    'Duas Etapas',
    'Nível da Conta (Bronze)',
    'Pendência na Receita Federal',
    'Documentação Incompleta'
];

const BRANCH_OPTIONS = Object.values(Branch).map(b => ({ label: b, value: b }));

const ClientInfoTab: React.FC<ClientInfoTabProps> = ({
    client, editedClient, isEditMode, setEditedClient,
    setIsWhatsAppModalOpen, cases, onSelectCase, openNewCaseWithParams, onClose
}) => {
    const { captadores, addCaptador, deleteCaptador, showToast, updateCase } = useApp();

    // Local State moved from Parent
    const [isAddingCaptador, setIsAddingCaptador] = useState(false);
    const [newCaptadorName, setNewCaptadorName] = useState('');
    const [showNewCaseMenu, setShowNewCaseMenu] = useState(false);
    const [hasRepresentative, setHasRepresentative] = useState(!!editedClient.representante_nome);

    // GPS State
    const [editingGpsId, setEditingGpsId] = useState<string | null>(null);
    const [editingGpsValue, setEditingGpsValue] = useState('');

    // Captador Delete State
    const [captadorToDelete, setCaptadorToDelete] = useState<Captador | null>(null);
    const [deleteReason, setDeleteReason] = useState('');

    // Address Loading
    const [isLoadingCep, setIsLoadingCep] = useState(false);

    // Derived Data
    const filteredCaptadores = useMemo(() => {
        if (!editedClient.filial) return [];
        return captadores.filter(c => c.filial === editedClient.filial);
    }, [captadores, editedClient.filial]);

    const retirementInfo = useMemo(() => {
        if (!client.data_nascimento || !client.sexo) return null;
        const birth = new Date(client.data_nascimento);
        const today = new Date();
        let years = today.getFullYear() - birth.getFullYear();
        let months = today.getMonth() - birth.getMonth();
        if (months < 0) { years--; months += 12; }
        const isMale = client.sexo === 'Masculino';
        const ruralTarget = isMale ? 60 : 55;
        const urbanTarget = isMale ? 65 : 62;
        const remainingRural = ruralTarget - years;
        const remainingUrban = urbanTarget - years;
        return {
            age: { years, months },
            rural: { target: ruralTarget, remaining: remainingRural > 0 ? remainingRural : 0, eligible: remainingRural <= 0 },
            urban: { target: urbanTarget, remaining: remainingUrban > 0 ? remainingUrban : 0, eligible: remainingUrban <= 0 }
        };
    }, [client.data_nascimento, client.sexo]);

    const clientGpsList = useMemo(() => {
        // --- DEFENSIVE PROGRAMMING ---
        const clientCases = (cases || []).filter(c => c.client_id === client?.id);
        const allGps = clientCases.flatMap(c => c.gps_lista || []);
        return allGps.sort((a, b) => {
            const [ma, ya] = a.competencia.split('/');
            const [mb, yb] = b.competencia.split('/');
            return new Date(`${yb}-${mb}-01`).getTime() - new Date(`${ya}-${ma}-01`).getTime();
        });
    }, [cases, client.id]);

    // Handlers
    const handleAddCaptador = async () => {
        if (!newCaptadorName.trim()) return;
        if (!editedClient.filial) {
            showToast('error', 'Selecione uma filial antes.');
            return;
        }
        const newCaptador = await addCaptador(newCaptadorName, editedClient.filial);
        if (newCaptador) {
            setEditedClient({ ...editedClient, captador: newCaptador.nome });
            setIsAddingCaptador(false);
            setNewCaptadorName('');
            showToast('success', 'Captador adicionado!');
        }
    };

    const handleDeleteCaptadorInit = () => {
        const captador = captadores.find(c => c.nome === editedClient.captador && c.filial === editedClient.filial);
        if (captador) {
            setCaptadorToDelete(captador);
            setDeleteReason('');
        }
    };

    const handleDeleteCaptadorConfirm = async () => {
        if (!captadorToDelete) return;
        if (!deleteReason.trim()) {
            showToast('error', 'Informe o motivo da exclusão.');
            return;
        }

        await deleteCaptador(captadorToDelete.id, deleteReason);
        setCaptadorToDelete(null);
        if (editedClient.captador === captadorToDelete.nome) {
            setEditedClient({ ...editedClient, captador: '' });
        }
        showToast('success', 'Captador excluído.');
    };

    const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawCep = e.target.value;
        const formattedCep = rawCep.replace(/\D/g, '').slice(0, 8);
        const displayCep = formattedCep.replace(/^(\d{5})(\d)/, '$1-$2');
        setEditedClient({ ...editedClient, cep: displayCep });

        if (formattedCep.length === 8) {
            setIsLoadingCep(true);
            const addressData = await fetchAddressByCep(formattedCep);
            setIsLoadingCep(false);
            if (addressData) {
                setEditedClient({ ...editedClient, endereco: addressData.logradouro, bairro: addressData.bairro, cidade: addressData.localidade, uf: addressData.uf });
                showToast('success', 'Endereço encontrado!');
            }
        }
    };

    const togglePendencia = (option: string) => {
        const current = editedClient.pendencias || [];
        const updated = current.includes(option)
            ? current.filter(p => p !== option)
            : [...current, option];
        setEditedClient({ ...editedClient, pendencias: updated });
    };

    const handleSaveGpsValue = async (caseId: string, gpsId: string) => {
        if (!editingGpsValue) return;

        const caseItemToUpdate = cases.find(c => c.id === caseId);
        if (!caseItemToUpdate || !caseItemToUpdate.gps_lista) return;

        const updatedGpsList = caseItemToUpdate.gps_lista.map(g => {
            if (g.id === gpsId) {
                return { ...g, valor: parseCurrencyToNumber(editingGpsValue) };
            }
            return g;
        });

        const updatedCase = { ...caseItemToUpdate, gps_lista: updatedGpsList };
        await updateCase(updatedCase);

        setEditingGpsId(null);
        showToast('success', 'Valor atualizado');
    };

    // Helper for number parsing, locally defined or imported?
    // Imported `parseCurrencyToNumber` needed. I'll need to update imports.
    // Wait, I imported `formatCurrencyInput` but not `parseCurrencyToNumber` in the top block?
    // Let me check my thought process vs the file I'm writing.
    // I need to add `parseCurrencyToNumber` to imports.

    return (
        <>
            {!isEditMode && (
                <div className={`mb-6 p-4 rounded-xl border flex items-start gap-3 ${client.pendencias && client.pendencias.length > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                    <div className={`p-2 rounded-full bg-opacity-20 shrink-0 ${client.pendencias && client.pendencias.length > 0 ? 'bg-red-500 text-red-500' : 'bg-emerald-500 text-emerald-500'}`}>
                        {client.pendencias && client.pendencias.length > 0 ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
                    </div>
                    <div>
                        <h4 className={`font-bold text-sm ${client.pendencias && client.pendencias.length > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {client.pendencias && client.pendencias.length > 0 ? 'Atenção: Pendências Bloqueantes' : 'Situação Regular'}
                        </h4>
                        {client.pendencias && client.pendencias.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {client.pendencias.map(p => (<span key={p} className="text-[10px] font-bold bg-red-500/20 text-red-300 px-2 py-1 rounded border border-red-500/30">{p}</span>))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {!isEditMode && client.import_source === 'imported' && (() => {
                const missingFields = getIncompleteFields(client);
                if (missingFields.length === 0) return null;
                return (
                    <div className="mb-6 p-4 rounded-xl border bg-amber-500/10 border-amber-500/20 flex items-start gap-3">
                        <div className="p-2 rounded-full bg-amber-500 bg-opacity-20 shrink-0 text-amber-500">
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold text-sm text-amber-400">Cliente Importado — Dados Incompletos</h4>
                            <p className="text-xs text-zinc-400 mt-1">Preencha os campos abaixo para completar o cadastro.</p>
                            <div className="flex flex-wrap gap-2 mt-3">
                                {missingFields.map(f => (
                                    <span key={f} className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-1 rounded border border-amber-500/30">{f}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {!isEditMode && (
                <div className="mb-6 bg-[#18181b] border border-white/5 rounded-xl p-4 shadow-sm">
                    <h4 className="text-sm font-bold text-slate-400 uppercase mb-3 flex items-center gap-2 font-serif"><Users size={16} className="text-gold-500" /> Entrevista Inicial</h4>
                    <div className="flex items-center gap-4">
                        <div className={`px-4 py-2 rounded-lg font-bold text-sm border flex items-center gap-2 ${client.interviewStatus === 'Agendada' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                            client.interviewStatus === 'Concluída' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                                'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
                            }`}>
                            {client.interviewStatus || 'Pendente'}
                        </div>

                        {client.interviewStatus === 'Agendada' && client.interviewDate && (
                            <div className="flex items-center gap-2 text-slate-300 text-sm">
                                <Clock size={16} className="text-gold-500" />
                                Agendada para: <strong className="text-white">{formatDateDisplay(client.interviewDate)}</strong>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isEditMode && (
                <div className="mb-6 p-4 bg-[#18181b] border border-white/5 rounded-xl">
                    <h5 className="text-sm font-bold text-gold-500 mb-3 flex items-center gap-2 font-serif"><Users size={16} /> Gestão de Entrevista</h5>
                    <div className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Status da Entrevista</label>
                            <CustomSelect
                                label=""
                                value={editedClient.interviewStatus || 'Pendente'}
                                onChange={(val) => setEditedClient({ ...editedClient, interviewStatus: val as any })}
                                options={[
                                    { label: 'Pendente', value: 'Pendente' },
                                    { label: 'Agendada', value: 'Agendada' },
                                    { label: 'Concluída', value: 'Concluída' }
                                ]}
                                placeholder="Status"
                            />
                        </div>

                        {editedClient.interviewStatus === 'Agendada' && (
                            <div className="flex-1 min-w-[200px] animate-in slide-in-from-left-2">
                                <label className="block text-xs font-bold text-slate-500 mb-1">Data do Agendamento</label>
                                <input
                                    type="date"
                                    className="w-full bg-[#131418] border border-white/5 rounded px-2 py-1.5 text-sm text-white outline-none focus:border-gold-500 [color-scheme:dark]"
                                    value={editedClient.interviewDate || ''}
                                    onChange={(e) => setEditedClient({ ...editedClient, interviewDate: e.target.value })}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isEditMode ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 animate-in fade-in duration-300">
                    <div>
                        <label className="flex items-center gap-1 text-xs font-bold text-slate-500 mb-1">
                            Data Nascimento
                            {!editedClient.data_nascimento && <AlertTriangle size={12} className="text-amber-500 animate-pulse" />}
                        </label>
                        <input type="date" className="w-full bg-[#18181b] border border-white/5 rounded px-2 py-1 text-sm text-white outline-none focus:border-gold-500 [color-scheme:dark]" value={editedClient.data_nascimento || ''} onChange={e => setEditedClient({ ...editedClient, data_nascimento: e.target.value })} />
                    </div>
                    <div>
                        <CustomSelect
                            label={
                                <span className="flex items-center gap-1">
                                    Sexo
                                    {!editedClient.sexo && <AlertTriangle size={12} className="text-amber-500 animate-pulse" />}
                                </span>
                            }
                            value={editedClient.sexo || ''}
                            onChange={(val) => setEditedClient({ ...editedClient, sexo: val as any })}
                            options={[
                                { label: 'Masculino', value: 'Masculino' },
                                { label: 'Feminino', value: 'Feminino' }
                            ]}
                            placeholder="Selecione"
                        />
                    </div>
                    <div>
                        <label className="flex items-center gap-1 text-xs font-bold text-slate-500 mb-1">
                            Telefone
                            {!editedClient.telefone && <AlertTriangle size={12} className="text-amber-500 animate-pulse" />}
                        </label>
                        <input className="w-full bg-[#18181b] border border-white/5 rounded px-2 py-1 text-sm text-white outline-none focus:border-gold-500" value={editedClient.telefone || ''} onChange={e => setEditedClient({ ...editedClient, telefone: formatPhone(e.target.value) })} />
                    </div>
                    <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-500 mb-1">Email</label><input type="email" className="w-full bg-[#18181b] border border-white/5 rounded px-2 py-1 text-sm text-white outline-none focus:border-gold-500" value={editedClient.email || ''} onChange={e => setEditedClient({ ...editedClient, email: e.target.value })} /></div>

                    <div className="md:col-span-3 border-t border-white/5 pt-4 mt-2 mb-2">
                        <div className="flex items-center gap-2 mb-3">
                            <button type="button" onClick={() => setHasRepresentative(!hasRepresentative)} className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${hasRepresentative ? 'bg-gold-600 border-gold-600' : 'bg-[#18181b] border-white/10'}`}>
                                {hasRepresentative && <Check size={14} className="text-white" />}
                            </button>
                            <label onClick={() => setHasRepresentative(!hasRepresentative)} className="text-sm text-zinc-300 font-medium cursor-pointer select-none">Adicionar Representante Legal</label>
                        </div>

                        {hasRepresentative && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2 fade-in duration-200 bg-[#18181b] p-4 rounded-xl border border-white/5">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Nome do Representante</label>
                                    <div className="relative group">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-gold-500 transition-colors" size={16} />
                                        <input
                                            className="w-full bg-[#131418] border border-white/5 text-zinc-200 pl-9 pr-4 py-2 rounded-lg focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20 outline-none placeholder:text-zinc-600"
                                            value={editedClient.representante_nome || ''}
                                            onChange={e => setEditedClient({ ...editedClient, representante_nome: e.target.value })}
                                            placeholder="Nome do Responsável"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">CPF do Representante</label>
                                    <div className="relative group">
                                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-gold-500 transition-colors" size={16} />
                                        <input
                                            className="w-full bg-[#131418] border border-white/5 text-zinc-200 pl-9 pr-4 py-2 rounded-lg focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20 outline-none placeholder:text-zinc-600"
                                            value={editedClient.representante_cpf || ''}
                                            onChange={e => setEditedClient({ ...editedClient, representante_cpf: e.target.value })}
                                            placeholder="000.000.000-00"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="md:col-span-3 border-t border-white/5 pt-4 mt-2"><h5 className="text-sm font-bold text-gold-500 mb-3 flex items-center gap-2 font-serif"><Building2 size={16} /> Sistema & Origem</h5></div>
                    <div><CustomSelect label="Filial" value={editedClient.filial as string || ''} onChange={(val) => setEditedClient({ ...editedClient, filial: val, captador: '' })} options={BRANCH_OPTIONS} icon={Building2} placeholder="Selecione" /></div>
                    <div className="md:col-span-2 relative"><label className="block text-xs font-bold text-slate-500 mb-1">Captador {editedClient.filial && <span className="text-xs font-normal text-slate-600 ml-1">({filteredCaptadores.length} disponíveis)</span>}</label><div className="flex gap-2">{isAddingCaptador ? (<div className="flex-1 flex gap-2 animate-in slide-in-from-left-2 fade-in duration-200"><input autoFocus className="w-full bg-[#18181b] border border-white/5 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-gold-500" placeholder="Nome do novo captador..." value={newCaptadorName} onChange={(e) => setNewCaptadorName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAddCaptador(); if (e.key === 'Escape') { setIsAddingCaptador(false); setNewCaptadorName(''); } }} /><button onClick={handleAddCaptador} className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-lg transition-colors"><Check size={18} /></button><button onClick={() => { setIsAddingCaptador(false); setNewCaptadorName(''); }} className="bg-red-600 hover:bg-red-500 text-white p-2 rounded-lg transition-colors"><X size={18} /></button></div>) : (<div className="flex-1 flex gap-2"><div className="flex-1"><CustomSelect label="" value={editedClient.captador || ''} onChange={(val) => setEditedClient({ ...editedClient, captador: val })} options={filteredCaptadores.map(c => ({ label: c.nome, value: c.nome }))} icon={Share2} placeholder={editedClient.filial ? "Selecione..." : "Selecione uma filial primeiro"} /></div>{editedClient.filial && (<button onClick={() => setIsAddingCaptador(true)} className="bg-[#18181b] border border-white/5 hover:border-gold-500 hover:text-gold-500 text-slate-400 p-2.5 rounded-xl transition-all h-[42px] mt-auto"><Plus size={18} /></button>)}{editedClient.filial && editedClient.captador && (<button onClick={handleDeleteCaptadorInit} className="bg-[#18181b] border border-white/5 hover:border-red-500 hover:text-red-500 text-slate-400 p-2.5 rounded-xl transition-all h-[42px] mt-auto"><Trash2 size={18} /></button>)}</div>)}</div></div>
                    <div className="md:col-span-3 border-t border-white/5 pt-4 mt-2"><h5 className="text-sm font-bold text-gold-500 mb-3 font-serif">Documentação</h5></div>
                    <div>
                        <label className="flex items-center gap-1 text-xs font-bold text-slate-500 mb-1">
                            RG
                            {!editedClient.rg && <AlertTriangle size={12} className="text-amber-500 animate-pulse" />}
                        </label>
                        <input className="w-full bg-[#18181b] border border-white/5 rounded px-2 py-1 text-sm text-white outline-none focus:border-gold-500" value={editedClient.rg || ''} onChange={e => setEditedClient({ ...editedClient, rg: e.target.value })} />
                    </div>
                    <div><label className="block text-xs font-bold text-slate-500 mb-1">Org. Emissor</label><input className="w-full bg-[#18181b] border border-white/5 rounded px-2 py-1 text-sm text-white outline-none focus:border-gold-500" value={editedClient.orgao_emissor || ''} onChange={e => setEditedClient({ ...editedClient, orgao_emissor: e.target.value })} /></div>
                    <div><label className="block text-xs font-bold text-slate-500 mb-1">Profissão</label><input className="w-full bg-[#18181b] border border-white/5 rounded px-2 py-1 text-sm text-white outline-none focus:border-gold-500" value={editedClient.profissao || ''} onChange={e => setEditedClient({ ...editedClient, profissao: e.target.value })} /></div>
                    <div><label className="block text-xs font-bold text-slate-500 mb-1">Estado Civil</label><select className="w-full bg-[#18181b] border border-white/5 rounded px-2 py-1 text-sm text-white outline-none focus:border-gold-500" value={editedClient.estado_civil || ''} onChange={e => setEditedClient({ ...editedClient, estado_civil: e.target.value })}><option value="">Selecione</option><option value="Solteiro(a)">Solteiro(a)</option><option value="Casado(a)">Casado(a)</option><option value="Divorciado(a)">Divorciado(a)</option><option value="Viúvo(a)">Viúvo(a)</option><option value="União Estável">União Estável</option></select></div>
                    <div><label className="block text-xs font-bold text-slate-500 mb-1">Nacionalidade</label><input className="w-full bg-[#18181b] border border-white/5 rounded px-2 py-1 text-sm text-white outline-none focus:border-gold-500" value={editedClient.nacionalidade || ''} onChange={e => setEditedClient({ ...editedClient, nacionalidade: e.target.value })} /></div>
                    <div className="md:col-span-3 border-t border-white/5 pt-4 mt-2"><h5 className="text-sm font-bold text-gold-500 mb-3 font-serif">Endereço</h5></div>
                    <div className="relative">
                        <label className="flex items-center gap-1 text-xs font-bold text-slate-500 mb-1">
                            CEP
                            {!editedClient.cep && <AlertTriangle size={12} className="text-amber-500 animate-pulse" />}
                        </label>
                        <input className="w-full bg-[#18181b] border border-white/5 rounded px-2 py-1 text-sm text-white outline-none focus:border-gold-500" value={editedClient.cep || ''} onChange={handleCepChange} />
                    </div>
                    <div className="md:col-span-2">
                        <label className="flex items-center gap-1 text-xs font-bold text-slate-500 mb-1">
                            Logradouro
                            {!editedClient.endereco && <AlertTriangle size={12} className="text-amber-500 animate-pulse" />}
                        </label>
                        <input className="w-full bg-[#18181b] border border-white/5 rounded px-2 py-1 text-sm text-white outline-none focus:border-gold-500" value={editedClient.endereco || ''} onChange={e => setEditedClient({ ...editedClient, endereco: e.target.value })} />
                    </div>
                    <div><label className="block text-xs font-bold text-slate-500 mb-1">Número</label><input className="w-full bg-[#18181b] border border-white/5 rounded px-2 py-1 text-sm text-white outline-none focus:border-gold-500" value={editedClient.numero_casa || ''} onChange={e => setEditedClient({ ...editedClient, numero_casa: e.target.value })} /></div>
                    <div>
                        <label className="flex items-center gap-1 text-xs font-bold text-slate-500 mb-1">
                            Bairro
                            {!editedClient.bairro && <AlertTriangle size={12} className="text-amber-500 animate-pulse" />}
                        </label>
                        <input className="w-full bg-[#18181b] border border-white/5 rounded px-2 py-1 text-sm text-white outline-none focus:border-gold-500" value={editedClient.bairro || ''} onChange={e => setEditedClient({ ...editedClient, bairro: e.target.value })} />
                    </div>
                    <div>
                        <label className="flex items-center gap-1 text-xs font-bold text-slate-500 mb-1">
                            Cidade/UF
                            {(!editedClient.cidade || !editedClient.uf) && <AlertTriangle size={12} className="text-amber-500 animate-pulse" />}
                        </label>
                        <div className="flex gap-2">
                            <input className="w-2/3 bg-[#18181b] border border-white/5 rounded px-2 py-1 text-sm text-white outline-none focus:border-gold-500" value={editedClient.cidade || ''} onChange={e => setEditedClient({ ...editedClient, cidade: e.target.value })} />
                            <input className="w-1/3 bg-[#18181b] border border-white/5 rounded px-2 py-1 text-sm text-white outline-none focus:border-gold-500" value={editedClient.uf || ''} onChange={e => setEditedClient({ ...editedClient, uf: e.target.value })} />
                        </div>
                    </div>
                    <div className="md:col-span-3 border-t border-white/5 pt-4 mt-2"><h5 className="text-sm font-bold text-red-500 mb-3 font-serif">Pendências</h5></div>
                    <div className="md:col-span-3 flex flex-wrap gap-2">{PENDING_OPTIONS.map(option => { const isSelected = editedClient.pendencias?.includes(option); return (<button key={option} type="button" onClick={() => togglePendencia(option)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${isSelected ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-[#18181b] border-white/10 text-slate-400 hover:text-white'}`}>{option}</button>); })}</div>
                    <div className="md:col-span-3 border-t border-white/5 pt-4 mt-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Observação</label>
                        <textarea
                            className="w-full bg-[#18181b] border border-white/5 rounded-lg p-3 text-sm text-white outline-none focus:border-gold-500 resize-none h-24"
                            value={editedClient.observacao || ''}
                            onChange={e => setEditedClient({ ...editedClient, observacao: e.target.value })}
                        />
                    </div>
                </div>
            ) : null}

            {!isEditMode && retirementInfo && (
                <div className="bg-[#18181b] border border-white/5 rounded-xl p-4 mb-6">
                    <h4 className="text-sm font-bold text-slate-400 uppercase mb-3 flex items-center gap-2 font-serif"><Clock size={16} className="text-gold-500" /> Previsão de Aposentadoria</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-[#0f1014] p-3 rounded-xl border border-white/5 text-center"><span className="block text-xs text-slate-500 uppercase mb-1">Idade Atual</span><span className="text-xl font-bold text-white">{retirementInfo.age.years} <span className="text-xs font-normal text-slate-400">anos</span></span></div>
                        <div className="bg-[#0f1014] p-3 rounded-xl border border-white/5 text-center relative overflow-hidden"><span className="block text-xs text-slate-500 uppercase mb-1">Rural ({retirementInfo.rural.target} anos)</span>{retirementInfo.rural.eligible ? <span className="text-emerald-500 font-bold text-lg animate-pulse">JÁ ELEGÍVEL</span> : <span className="text-white font-bold text-lg">{Math.floor(retirementInfo.rural.remaining)} <span className="text-xs font-normal text-slate-400">anos falta</span></span>}{retirementInfo.rural.eligible && <div className="absolute inset-0 border-2 border-emerald-500/50 rounded-lg"></div>}</div>
                        <div className="bg-[#0f1014] p-3 rounded-xl border border-white/5 text-center"><span className="block text-xs text-slate-500 uppercase mb-1">Urbana ({retirementInfo.urban.target} anos)</span>{retirementInfo.urban.eligible ? <span className="text-emerald-500 font-bold text-lg">JÁ ELEGÍVEL</span> : <span className="text-white font-bold text-lg">{Math.floor(retirementInfo.urban.remaining)} <span className="text-xs font-normal text-slate-400">anos falta</span></span>}</div>
                    </div>
                </div>
            )}

            {!isEditMode && clientGpsList.length > 0 && (
                <div className="mb-6 p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
                    <div className="flex items-center gap-2 mb-3"><FileSpreadsheet size={16} className="text-blue-400" /><h4 className="font-bold text-sm text-white">Guias GPS (INSS)</h4></div>
                    <div className="flex flex-wrap gap-2">
                        {clientGpsList.map(gps => {
                            const caseId = cases.find(c => c.gps_lista?.some(g => g.id === gps.id))?.id;

                            if (editingGpsId === gps.id && caseId) {
                                return (
                                    <div key={gps.id} className="flex items-center gap-1 border border-zinc-700 rounded px-2 py-0.5 bg-black">
                                        <input
                                            autoFocus
                                            className="w-16 bg-transparent text-xs text-white outline-none"
                                            value={editingGpsValue}
                                            onChange={(e) => setEditingGpsValue(formatCurrencyInput(e.target.value))}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSaveGpsValue(caseId, gps.id)}
                                            onBlur={() => handleSaveGpsValue(caseId, gps.id)}
                                        />
                                        <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleSaveGpsValue(caseId, gps.id)} className="text-emerald-500 hover:text-emerald-400">
                                            <Check size={12} />
                                        </button>
                                    </div>
                                );
                            }

                            let colorClass = 'bg-zinc-800 text-zinc-400 border-zinc-700';
                            if (gps.status === 'Paga') { colorClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'; }
                            else if (gps.status === 'Puxada') { colorClass = 'bg-blue-500/10 text-blue-400 border-blue-500/20'; }
                            else if (gps.status === 'Pendente') { colorClass = 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'; }

                            return (
                                <button
                                    key={gps.id}
                                    onClick={() => {
                                        setEditingGpsId(gps.id);
                                        setEditingGpsValue(formatCurrencyInput(gps.valor.toFixed(2)));
                                    }}
                                    className={`text-[10px] font-bold px-2 py-1 rounded border flex items-center gap-1.5 hover:opacity-80 transition-opacity ${colorClass}`}
                                    title="Clique para editar valor"
                                >
                                    <span>{gps.competencia}</span>
                                    <span className={`w-1.5 h-1.5 rounded-full ${gps.status === 'Paga' ? 'bg-emerald-500' : gps.status === 'Puxada' ? 'bg-blue-400' : 'bg-yellow-500'}`}></span>
                                    <span className="uppercase text-[9px] opacity-70 flex items-center gap-1">
                                        {gps.status}
                                        {gps.valor > 0 && <span>• {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(gps.valor)}</span>}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {!isEditMode && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="p-4 bg-[#18181b] border border-white/5 rounded-xl hover:border-white/10 transition-colors">
                        <span className="text-xs text-slate-500 uppercase font-bold mb-1 flex items-center gap-1">
                            Telefone
                            {!client.telefone && <AlertTriangle size={12} className="text-amber-500" />}
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="text-slate-200 font-medium">{String(client.telefone || '-')}</span>
                            {client.telefone && <button onClick={() => setIsWhatsAppModalOpen(true)} className="text-emerald-500 hover:text-emerald-400 p-1 rounded hover:bg-emerald-500/10 transition-colors" title="WhatsApp"><MessageCircle size={16} /></button>}
                        </div>
                    </div>
                    <div className="p-4 bg-[#18181b] border border-white/5 rounded-xl hover:border-white/10 transition-colors">
                        <span className="text-xs text-slate-500 uppercase font-bold block mb-1">Email</span>
                        <span className="text-slate-200 font-medium truncate block" title={client.email}>{String(client.email || '-')}</span>
                    </div>
                    <div className="p-4 bg-[#18181b] border border-white/5 rounded-xl md:col-span-2 hover:border-white/10 transition-colors">
                        <span className="text-xs text-slate-500 uppercase font-bold mb-1 flex items-center gap-1">
                            Endereço
                            {(!client.endereco || !client.bairro || !client.cidade || !client.uf) && <AlertTriangle size={12} className="text-amber-500" />}
                        </span>
                        <span className="text-slate-200 font-medium flex items-center gap-2">
                            <MapPin size={14} className="text-gold-500" />
                            {String(client.endereco ? `${client.endereco}, ${client.numero_casa || 'S/N'} - ${client.bairro || ''}, ${client.cidade || ''} - ${client.uf || ''}` : '-')}
                        </span>
                    </div>
                    <div className="p-4 bg-[#18181b] border border-white/5 rounded-xl hover:border-white/10 transition-colors">
                        <span className="text-xs text-slate-500 uppercase font-bold mb-1 flex items-center gap-1">
                            Data Nascimento
                            {!client.data_nascimento && <AlertTriangle size={12} className="text-amber-500" />}
                        </span>
                        <span className="text-slate-200 font-medium">{formatDateDisplay(client.data_nascimento)}</span>
                    </div>
                    <div className="p-4 bg-[#18181b] border border-white/5 rounded-xl hover:border-white/10 transition-colors"><span className="text-xs text-slate-500 uppercase font-bold block mb-1">Filial</span><span className="text-emerald-500 font-bold">{String(client.filial || 'Matriz')}</span></div>
                    <div className="p-4 bg-[#18181b] border border-white/5 rounded-xl md:col-span-2 hover:border-white/10 transition-colors"><span className="text-xs text-slate-500 uppercase font-bold block mb-1">Observação</span><p className="text-slate-300 text-sm italic">{String(client.observacao || 'Sem observações.')}</p></div>

                    {client.representante_nome && (
                        <div className="p-4 bg-[#18181b] border border-white/5 rounded-xl md:col-span-4 ring-1 ring-gold-500/20">
                            <span className="text-xs text-gold-500 uppercase font-bold block mb-2 flex items-center gap-1"><User size={12} /> Representante Legal</span>
                            <div className="flex flex-col md:flex-row gap-4">
                                <div><span className="text-xs text-slate-500 block">Nome</span><span className="text-slate-200 font-medium">{client.representante_nome}</span></div>
                                {client.representante_cpf && <div><span className="text-xs text-slate-500 block">CPF</span><span className="text-slate-200 font-medium">{client.representante_cpf}</span></div>}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* --- BOTÃO ADICIONAR PROCESSO --- */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileText size={20} className="text-gold-500" /> Processos Associados
                </h3>
                {!isEditMode && (
                    <div className="relative">
                        <button
                            onClick={() => setShowNewCaseMenu(!showNewCaseMenu)}
                            className="flex items-center gap-1 text-xs font-bold bg-gold-600 hover:bg-gold-500 text-white px-3 py-1.5 rounded-lg transition-colors shadow-lg shadow-gold-900/20"
                        >
                            <Plus size={14} /> Adicionar Processo
                        </button>
                        {showNewCaseMenu && (
                            <div className="absolute right-0 bottom-full mb-2 w-56 bg-[#131418] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col ring-1 ring-black">
                                <div className="px-3 py-2 bg-zinc-950/50 border-b border-white/5 text-[10px] uppercase font-bold text-zinc-500">
                                    Tipo de Processo
                                </div>
                                <button onClick={() => { openNewCaseWithParams(client.id, 'Seguro Defeso' as any, client.nome_completo); setShowNewCaseMenu(false); onClose(); }} className="text-left px-4 py-3 text-sm text-slate-300 hover:bg-white/5 hover:text-gold-500 transition-colors border-b border-white/5 flex items-center gap-2">
                                    <Shield size={16} /> Seguro Defeso
                                </button>
                                <button onClick={() => { openNewCaseWithParams(client.id, 'Aposentadoria' as any, client.nome_completo); setShowNewCaseMenu(false); onClose(); }} className="text-left px-4 py-3 text-sm text-slate-300 hover:bg-white/5 hover:text-gold-500 transition-colors border-b border-white/5 flex items-center gap-2">
                                    <FileText size={16} /> Administrativo
                                </button>
                                <button onClick={() => { openNewCaseWithParams(client.id, 'Cível/Outros' as any, client.nome_completo); setShowNewCaseMenu(false); onClose(); }} className="text-left px-4 py-3 text-sm text-slate-300 hover:bg-white/5 hover:text-gold-500 transition-colors flex items-center gap-2">
                                    <Gavel size={16} /> Judicial
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="space-y-3 mb-8">
                {(cases || []).filter(c => c.client_id === client?.id).map(caseItem => (
                    <div key={caseItem.id} onClick={() => onSelectCase?.(caseItem)} className="flex items-center justify-between p-4 bg-[#18181b] border border-white/5 rounded-xl hover:border-gold-500/30 cursor-pointer group transition-all duration-300">
                        <div><h4 className="font-bold text-slate-200 text-sm group-hover:text-gold-500 transition-colors font-serif">{caseItem.titulo}</h4><p className="text-xs text-slate-500">{caseItem.numero_processo} • {caseItem.tribunal}</p></div>
                        <div className="flex items-center gap-3"><span className={`text-[10px] font-bold px-2 py-1 rounded border ${caseItem.status === CaseStatus.CONCLUIDO_CONCEDIDO ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>{caseItem.status}</span><ChevronRight size={16} className="text-slate-600 group-hover:text-white" /></div>
                    </div>
                ))}
                {(cases || []).filter(c => c.client_id === client?.id).length === 0 && <p className="text-slate-500 italic text-sm">Nenhum processo encontrado.</p>}
            </div>

            {/* Modal de Exclusão de Captador - Moved here */}
            {captadorToDelete && (
                <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
                    <div className="bg-[#0f1014] border border-red-500/30 p-6 rounded-xl max-w-sm w-full shadow-2xl">
                        <div className="flex flex-col items-center mb-4">
                            <div className="p-3 bg-red-900/20 rounded-full mb-3 text-red-500 border border-red-900/50">
                                <Trash2 size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-white text-center">Excluir Captador?</h3>
                            <p className="text-xs text-zinc-500 text-center mt-1">
                                {captadorToDelete.nome}
                            </p>
                        </div>

                        <div className="mb-4">
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Motivo da Exclusão <span className="text-red-500">*</span></label>
                            <textarea
                                className="w-full bg-[#09090b] border border-zinc-800 rounded-lg p-3 text-sm text-white outline-none focus:border-red-500 resize-none h-24"
                                placeholder="Informe o motivo..."
                                value={deleteReason}
                                onChange={(e) => setDeleteReason(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className="flex gap-3 justify-center">
                            <button onClick={handleDeleteCaptadorConfirm} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2.5 rounded-lg border border-red-500/50 font-bold text-sm transition-all hover:shadow-lg hover:shadow-red-900/40">
                                Confirmar Exclusão
                            </button>
                            <button onClick={() => setCaptadorToDelete(null)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2.5 rounded-lg border border-zinc-700 font-bold text-sm transition-all">
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// Add parseCurrencyToNumber helper locally if import fails or adds too much diff
function parseCurrencyToNumber(value: string | number): number {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    return Number(value.replace(/\./g, '').replace(',', '.'));
}

export default memo(ClientInfoTab);
