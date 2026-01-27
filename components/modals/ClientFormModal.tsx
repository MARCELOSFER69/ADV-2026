import React from 'react';
import { User, X, FileText, CreditCard, Search, Loader2, Calendar, Heart, Globe, Briefcase, Check, Phone, Mail, Lock, MapPin, Building2, Share2, AlertTriangle, CheckSquare, Plus } from 'lucide-react';
import { Client, Branch, Captador } from '../../types';
import CustomSelect from '../ui/CustomSelect';

interface ClientFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    newClient: Partial<Client>;
    setNewClient: (client: Partial<Client>) => void;
    duplicateClient: Client | null;
    isLoadingCep: boolean;
    isLoadingCnpj: boolean;
    handleCnpjSearch: () => Promise<void>;
    handleCepChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
    handleSubmit: (e: React.FormEvent) => Promise<void>;
    hasRepresentative: boolean;
    setHasRepresentative: (has: boolean) => void;
    isAddingCaptador: boolean;
    setIsAddingCaptador: (adding: boolean) => void;
    newCaptadorName: string;
    setNewCaptadorName: (name: string) => void;
    handleAddCaptadorNew: () => Promise<void>;
    filteredCaptadores: Captador[];
    toggleNewPendencia: (option: string) => void;
    SEX_OPTIONS: { label: string, value: string }[];
    CIVIL_STATUS_OPTIONS: { label: string, value: string }[];
    BRANCH_OPTIONS: { label: string, value: string }[];
    PENDING_OPTIONS: string[];
    formatCPFOrCNPJ: (val: string) => string;
    formatPhone: (val: string) => string;
}

const ClientFormModal: React.FC<ClientFormModalProps> = ({
    isOpen,
    onClose,
    newClient,
    setNewClient,
    duplicateClient,
    isLoadingCep,
    isLoadingCnpj,
    handleCnpjSearch,
    handleCepChange,
    handleSubmit,
    hasRepresentative,
    setHasRepresentative,
    isAddingCaptador,
    setIsAddingCaptador,
    newCaptadorName,
    setNewCaptadorName,
    handleAddCaptadorNew,
    filteredCaptadores,
    toggleNewPendencia,
    SEX_OPTIONS,
    CIVIL_STATUS_OPTIONS,
    BRANCH_OPTIONS,
    PENDING_OPTIONS,
    formatCPFOrCNPJ,
    formatPhone
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#09090b] border border-zinc-800 rounded-2xl max-w-4xl w-full p-0 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-[#09090b]">
                    <div>
                        <h3 className="text-xl font-bold text-white font-serif flex items-center gap-2">
                            <User className="text-gold-500" size={24} /> Novo Cadastro
                        </h3>
                        <p className="text-xs text-zinc-400 mt-1">Preencha os dados completos para iniciar o atendimento.</p>
                    </div>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white p-2 rounded-lg hover:bg-zinc-800 transition-colors"><X size={20} /></button>
                </div>

                <div className="overflow-y-auto custom-scrollbar p-6 bg-[#09090b]">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-12 flex items-center gap-2 mb-2">
                                <h4 className="text-xs font-bold text-yellow-500 uppercase tracking-wider flex items-center gap-1"><FileText size={14} /> Dados Pessoais</h4>
                                <div className="h-px bg-zinc-800 flex-1"></div>
                            </div>

                            <div className="col-span-12 md:col-span-8">
                                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Nome Completo <span className="text-red-500">*</span></label>
                                <div className="relative group">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-yellow-600 transition-colors" size={18} />
                                    <input
                                        required
                                        className="w-full bg-[#0f1014] border border-zinc-800 text-zinc-200 pl-10 pr-4 py-2.5 rounded-xl focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/20 outline-none transition-all placeholder:text-zinc-600"
                                        value={newClient.nome_completo || ''}
                                        onChange={e => setNewClient({ ...newClient, nome_completo: e.target.value })}
                                        placeholder="Ex: João da Silva"
                                    />
                                </div>
                            </div>

                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">CPF/CNPJ <span className="text-red-500">*</span></label>
                                <div className="relative group flex gap-2">
                                    <div className="relative flex-1">
                                        <CreditCard className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${newClient.cpf_cnpj && 'text-zinc-600 group-focus-within:text-yellow-600'}`} size={18} />
                                        <input
                                            required
                                            className={`w-full bg-[#0f1014] border text-zinc-200 pl-10 pr-4 py-2.5 rounded-xl outline-none transition-all placeholder:text-zinc-600 ${duplicateClient ? 'border-red-500 text-red-400' : 'border-zinc-800 focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/20'}`}
                                            value={newClient.cpf_cnpj || ''}
                                            onChange={e => setNewClient({ ...newClient, cpf_cnpj: formatCPFOrCNPJ(e.target.value) })}
                                            placeholder="000.000.000-00"
                                            maxLength={18}
                                        />
                                        {duplicateClient && (
                                            <p className="text-[10px] text-red-500 mt-1 absolute left-0 top-full bg-red-500/10 px-2 py-1 rounded border border-red-500/20 z-10 w-full">
                                                CPF já pertence a: <strong>{duplicateClient.nome_completo}</strong>
                                            </p>
                                        )}
                                    </div>
                                    <button type="button" onClick={handleCnpjSearch} disabled={isLoadingCnpj} className="px-3 bg-[#0f1014] border border-zinc-800 rounded-xl hover:border-yellow-600 hover:text-yellow-600 text-zinc-400 transition-colors disabled:opacity-50" title="Buscar CNPJ">{isLoadingCnpj ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}</button>
                                </div>
                            </div>

                            <div className="col-span-6 md:col-span-3">
                                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">RG <span className="text-red-500">*</span></label>
                                <div className="relative group">
                                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-yellow-600 transition-colors" size={18} />
                                    <input required className="w-full bg-[#0f1014] border border-zinc-800 text-zinc-200 pl-10 pr-4 py-2.5 rounded-xl focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/20 outline-none placeholder:text-zinc-600" value={newClient.rg || ''} onChange={e => setNewClient({ ...newClient, rg: e.target.value })} placeholder="0000000" />
                                </div>
                            </div>

                            <div className="col-span-6 md:col-span-2">
                                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Org. Emissor</label>
                                <input className="w-full bg-[#0f1014] border border-zinc-800 text-zinc-200 px-4 py-2.5 rounded-xl focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/20 outline-none placeholder:text-zinc-600" value={newClient.orgao_emissor || ''} onChange={e => setNewClient({ ...newClient, orgao_emissor: e.target.value })} placeholder="SSP/MA" />
                            </div>

                            <div className="col-span-6 md:col-span-3">
                                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Nascimento <span className="text-red-500">*</span></label>
                                <div className="relative group">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 z-10 pointer-events-none" size={18} />
                                    <input
                                        type="date"
                                        required
                                        className="w-full bg-[#0f1014] border border-zinc-800 text-zinc-200 pl-10 pr-4 py-2.5 rounded-xl focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/20 outline-none [color-scheme:dark] relative z-0 placeholder:text-zinc-600"
                                        value={newClient.data_nascimento || ''}
                                        onChange={e => setNewClient({ ...newClient, data_nascimento: e.target.value })}
                                        style={{ colorScheme: 'dark' }}
                                    />
                                </div>
                            </div>

                            <div className="col-span-6 md:col-span-2">
                                <CustomSelect
                                    label="Sexo"
                                    value={newClient.sexo || ''}
                                    onChange={(val) => setNewClient({ ...newClient, sexo: val as any })}
                                    options={SEX_OPTIONS}
                                    required
                                    placeholder="Selecione"
                                />
                            </div>

                            <div className="col-span-6 md:col-span-2">
                                <CustomSelect
                                    label="Est. Civil"
                                    value={newClient.estado_civil || ''}
                                    onChange={(val) => setNewClient({ ...newClient, estado_civil: val })}
                                    options={CIVIL_STATUS_OPTIONS}
                                    icon={Heart}
                                    placeholder="Selecione"
                                />
                            </div>

                            <div className="col-span-12 md:col-span-3">
                                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Nacionalidade</label>
                                <div className="relative group">
                                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-yellow-600 transition-colors" size={18} />
                                    <input className="w-full bg-[#0f1014] border border-zinc-800 text-zinc-200 pl-10 pr-4 py-2.5 rounded-xl focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/20 outline-none placeholder:text-zinc-600" value={newClient.nacionalidade || 'Brasileira'} onChange={e => setNewClient({ ...newClient, nacionalidade: e.target.value })} />
                                </div>
                            </div>

                            <div className="col-span-12 md:col-span-3">
                                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Profissão</label>
                                <div className="relative group">
                                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-yellow-600 transition-colors" size={18} />
                                    <input className="w-full bg-[#0f1014] border border-zinc-800 text-zinc-200 pl-10 pr-4 py-2.5 rounded-xl focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/20 outline-none placeholder:text-zinc-600" value={newClient.profissao || ''} onChange={e => setNewClient({ ...newClient, profissao: e.target.value })} placeholder="Ex: Lavrador(a)" />
                                </div>
                            </div>

                            <div className="col-span-12 mt-2 mb-2">
                                <div className="flex items-center gap-2 mb-3">
                                    <button type="button" onClick={() => setHasRepresentative(!hasRepresentative)} className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${hasRepresentative ? 'bg-gold-600 border-gold-600' : 'bg-zinc-800 border-zinc-600'}`}>
                                        {hasRepresentative && <Check size={14} className="text-white" />}
                                    </button>
                                    <label onClick={() => setHasRepresentative(!hasRepresentative)} className="text-sm text-zinc-300 font-medium cursor-pointer select-none">Adicionar Representante Legal (Opcional)</label>
                                </div>

                                {hasRepresentative && (
                                    <div className="grid grid-cols-12 gap-4 animate-in slide-in-from-top-2 fade-in duration-200 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                                        <div className="col-span-12 md:col-span-8">
                                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Nome do Representante</label>
                                            <div className="relative group">
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-yellow-600 transition-colors" size={18} />
                                                <input
                                                    className="w-full bg-[#0f1014] border border-zinc-800 text-zinc-200 pl-10 pr-4 py-2.5 rounded-xl focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/20 outline-none placeholder:text-zinc-600"
                                                    value={newClient.representante_nome || ''}
                                                    onChange={e => setNewClient({ ...newClient, representante_nome: e.target.value })}
                                                    placeholder="Nome do Pai, Mãe ou Responsável"
                                                />
                                            </div>
                                        </div>
                                        <div className="col-span-12 md:col-span-4">
                                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">CPF do Representante</label>
                                            <div className="relative group">
                                                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-yellow-600 transition-colors" size={18} />
                                                <input
                                                    className="w-full bg-[#0f1014] border border-zinc-800 text-zinc-200 pl-10 pr-4 py-2.5 rounded-xl focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/20 outline-none placeholder:text-zinc-600"
                                                    value={newClient.representante_cpf || ''}
                                                    onChange={e => setNewClient({ ...newClient, representante_cpf: formatCPFOrCNPJ(e.target.value) })}
                                                    placeholder="000.000.000-00"
                                                    maxLength={14}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="col-span-12 md:col-span-3">
                                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Telefone</label>
                                <div className="relative group">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-yellow-600 transition-colors" size={18} />
                                    <input className="w-full bg-[#0f1014] border border-zinc-800 text-zinc-200 pl-10 pr-4 py-2.5 rounded-xl focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/20 outline-none placeholder:text-zinc-600" value={newClient.telefone || ''} onChange={e => setNewClient({ ...newClient, telefone: formatPhone(e.target.value) })} placeholder="(00) 00000-0000" />
                                </div>
                            </div>

                            <div className="col-span-12 md:col-span-3">
                                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Email</label>
                                <div className="relative group">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-yellow-600 transition-colors" size={18} />
                                    <input type="email" className="w-full bg-[#0f1014] border border-zinc-800 text-zinc-200 pl-10 pr-4 py-2.5 rounded-xl focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/20 outline-none placeholder:text-zinc-600" value={newClient.email || ''} onChange={e => setNewClient({ ...newClient, email: e.target.value })} placeholder="email@exemplo.com" />
                                </div>
                            </div>
                        </div>

                        <div className="col-span-12 flex items-center gap-2 mb-2 mt-4">
                            <h4 className="text-xs font-bold text-yellow-500 uppercase tracking-wider flex items-center gap-1"><Lock size={14} /> Acesso Gov.br</h4>
                            <div className="h-px bg-zinc-800 flex-1"></div>
                        </div>

                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-12 md:col-span-6">
                                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                                    Senha Gov.br {newClient.pendencias?.includes('Senha') ? '(Pendente)' : <span className="text-red-500">*</span>}
                                </label>
                                <input
                                    type="text"
                                    className={`w-full bg-[#0f1014] border px-4 py-2.5 rounded-xl outline-none transition-all placeholder:text-zinc-600 ${!newClient.senha_gov && !newClient.pendencias?.includes('Senha')
                                        ? 'border-red-500/50 focus:border-red-500'
                                        : 'border-zinc-800 focus:border-yellow-600'
                                        }`}
                                    value={newClient.senha_gov || ''}
                                    onChange={e => setNewClient({ ...newClient, senha_gov: e.target.value })}
                                    placeholder={newClient.pendencias?.includes('Senha') ? "Senha marcada como pendente" : "Digite a senha do Gov.br"}
                                    disabled={newClient.pendencias?.includes('Senha')}
                                />
                                {newClient.pendencias?.includes('Senha') && (
                                    <p className="text-[10px] text-yellow-500 mt-1">
                                        * Cadastro permitido sem senha pois a pendência "Senha" foi marcada abaixo.
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-12 gap-4 mt-6">
                            <div className="col-span-12 flex items-center gap-2 mb-2 mt-4">
                                <h4 className="text-xs font-bold text-yellow-500 uppercase tracking-wider flex items-center gap-1"><MapPin size={14} /> Endereço</h4>
                                <div className="h-px bg-zinc-800 flex-1"></div>
                            </div>

                            <div className="col-span-12 md:col-span-3">
                                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">CEP</label>
                                <div className="relative group">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-yellow-600 transition-colors" size={18} />
                                    <input className="w-full bg-[#0f1014] border border-zinc-800 text-zinc-200 pl-10 pr-8 py-2.5 rounded-xl focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/20 outline-none placeholder:text-zinc-600" value={newClient.cep || ''} onChange={(e) => handleCepChange(e)} placeholder="00000-000" maxLength={9} />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">{isLoadingCep && <Loader2 size={16} className="animate-spin text-yellow-500" />}</div>
                                </div>
                            </div>

                            <div className="col-span-12 md:col-span-7">
                                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Logradouro (Rua)</label>
                                <input className="w-full bg-[#0f1014] border border-zinc-800 text-zinc-200 px-4 py-2.5 rounded-xl focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/20 outline-none placeholder:text-zinc-600" value={newClient.endereco || ''} onChange={e => setNewClient({ ...newClient, endereco: e.target.value })} placeholder="Rua, Avenida..." />
                            </div>

                            <div className="col-span-12 md:col-span-2">
                                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Número</label>
                                <input className="w-full bg-[#0f1014] border border-zinc-800 text-zinc-200 px-4 py-2.5 rounded-xl focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/20 outline-none placeholder:text-zinc-600" value={newClient.numero_casa || ''} onChange={e => setNewClient({ ...newClient, numero_casa: e.target.value })} placeholder="S/N" />
                            </div>

                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Bairro</label>
                                <input className="w-full bg-[#0f1014] border border-zinc-800 text-zinc-200 px-4 py-2.5 rounded-xl focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/20 outline-none placeholder:text-zinc-600" value={newClient.bairro || ''} onChange={e => setNewClient({ ...newClient, bairro: e.target.value })} />
                            </div>

                            <div className="col-span-12 md:col-span-6">
                                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Cidade</label>
                                <input className="w-full bg-[#0f1014] border border-zinc-800 text-zinc-200 px-4 py-2.5 rounded-xl focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/20 outline-none placeholder:text-zinc-600" value={newClient.cidade || ''} onChange={e => setNewClient({ ...newClient, cidade: e.target.value })} />
                            </div>

                            <div className="col-span-12 md:col-span-2">
                                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">UF</label>
                                <input className="w-full bg-[#0f1014] border border-zinc-800 text-zinc-200 px-4 py-2.5 rounded-xl focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/20 outline-none uppercase placeholder:text-zinc-600" value={newClient.uf || ''} onChange={e => setNewClient({ ...newClient, uf: e.target.value })} maxLength={2} />
                            </div>
                        </div>

                        <div className="grid grid-cols-12 gap-4 mt-6">
                            <div className="col-span-12 flex items-center gap-2 mb-2 mt-4">
                                <h4 className="text-xs font-bold text-yellow-500 uppercase tracking-wider flex items-center gap-1"><Building2 size={14} /> Sistema & Origem</h4>
                                <div className="h-px bg-zinc-800 flex-1"></div>
                            </div>

                            <div className="col-span-12 md:col-span-6">
                                <CustomSelect
                                    label="Filial"
                                    value={newClient.filial as string || ''}
                                    onChange={(val) => setNewClient({ ...newClient, filial: val, captador: '' })}
                                    options={BRANCH_OPTIONS}
                                    icon={Building2}
                                    placeholder="Selecione"
                                />
                            </div>

                            <div className="col-span-12 md:col-span-6 relative">
                                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                                    Captador / Origem
                                </label>

                                <div className="flex gap-2">
                                    {isAddingCaptador ? (
                                        <div className="flex-1 flex gap-2 animate-in slide-in-from-left-2 fade-in duration-200">
                                            <input
                                                autoFocus
                                                className="w-full bg-[#0f1014] border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-gold-500"
                                                placeholder="Nome do novo captador..."
                                                value={newCaptadorName}
                                                onChange={(e) => setNewCaptadorName(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleAddCaptadorNew();
                                                    if (e.key === 'Escape') { setIsAddingCaptador(false); setNewCaptadorName(''); }
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={handleAddCaptadorNew}
                                                className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-lg transition-colors"
                                                title="Salvar Captador"
                                            >
                                                <Check size={18} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setIsAddingCaptador(false); setNewCaptadorName(''); }}
                                                className="bg-red-600 hover:bg-red-500 text-white p-2 rounded-lg transition-colors"
                                                title="Cancelar"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex gap-2">
                                            <div className="flex-1">
                                                <CustomSelect
                                                    label=""
                                                    value={newClient.captador || ''}
                                                    onChange={(val) => setNewClient({ ...newClient, captador: val })}
                                                    options={filteredCaptadores.map(c => ({ label: c.nome, value: c.nome }))}
                                                    icon={Share2}
                                                    placeholder={newClient.filial ? "Selecione..." : "Selecione uma filial"}
                                                />
                                            </div>

                                            {newClient.filial && (
                                                <button
                                                    type="button"
                                                    onClick={() => setIsAddingCaptador(true)}
                                                    className="bg-zinc-800 border border-zinc-700 hover:border-gold-500 hover:text-gold-500 text-zinc-400 p-2.5 rounded-xl transition-all h-[42px] mt-auto"
                                                    title="Adicionar Novo Captador"
                                                >
                                                    <Plus size={18} />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="col-span-12">
                                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Observação</label>
                                <textarea rows={3} className="w-full bg-[#0f1014] border border-zinc-800 text-zinc-200 p-4 rounded-xl focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/20 outline-none resize-none placeholder:text-zinc-600" value={newClient.observacao || ''} onChange={e => setNewClient({ ...newClient, observacao: e.target.value })} />
                            </div>
                        </div>

                        <div className="grid grid-cols-12 gap-4 mt-6">
                            <div className="col-span-12 flex items-center gap-2 mb-2 mt-4">
                                <h4 className="text-xs font-bold text-yellow-500 uppercase tracking-wider flex items-center gap-1"><AlertTriangle size={14} /> Controle de Pendências</h4>
                                <div className="h-px bg-zinc-800 flex-1"></div>
                            </div>
                            <div className="col-span-12 flex flex-wrap gap-2">
                                {PENDING_OPTIONS.map(option => {
                                    const isSelected = newClient.pendencias?.includes(option);
                                    return (
                                        <button
                                            key={option}
                                            type="button"
                                            onClick={() => toggleNewPendencia(option)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${isSelected ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'}`}
                                        >
                                            {option}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                    </form>
                </div>

                <div className="p-6 border-t border-zinc-800 bg-[#09090b] flex justify-end gap-3 rounded-b-2xl">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors font-medium">Cancelar</button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!!duplicateClient}
                        className={`px-6 py-2.5 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-transform active:scale-95 bg-yellow-600 text-white hover:bg-yellow-500 shadow-yellow-600/20 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        <CheckSquare size={18} /> Salvar Cadastro
                    </button>
                </div>
            </div>
        </div >
    );
};

export default ClientFormModal;
