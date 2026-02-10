import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../services/supabaseClient';
import { UserPermission } from '../types';
import {
    UserCog, Plus, Trash2, Check, X, Loader2, Search, ChevronDown,
    Shield, Gavel, FileText, Briefcase, Calculator, FileScan, User,
    LayoutDashboard, Users, DollarSign, MessageCircle, Hourglass,
    Stethoscope, CalendarCheck, HandCoins, Building, MapPin, Cpu
} from 'lucide-react';

const Permissions: React.FC = () => {
    const { showToast, user } = useApp();
    const [usersList, setUsersList] = useState<UserPermission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedUser, setExpandedUser] = useState<string | null>(null);

    // Novo Usuário State
    const [isAdding, setIsAdding] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [newName, setNewName] = useState('');

    useEffect(() => {
        fetchPermissions();
    }, []);

    const fetchPermissions = async () => {
        setIsLoading(true);
        const { data, error } = await supabase.from('user_permissions').select('*').order('nome');
        if (data) setUsersList(data);
        setIsLoading(false);
    };

    const handleAddUser = async () => {
        if (!newEmail || !newName) { showToast('error', 'Preencha nome e email.'); return; }

        const newUser: Partial<UserPermission> = {
            email: newEmail.trim(),
            nome: newName,
            role: 'colaborador',
            // Padrões iniciais
            access_dashboard: true,
            access_clients: true,
            access_cases: true,
            access_financial: false,
            access_tools: true,
            access_whatsapp: true,
            access_retirements: true,

            // Novos Padrões Granulares
            access_personal: false,
            access_cases_judicial: true,
            access_cases_administrative: true,
            access_cases_insurance: true,
            access_expertise: true,
            access_events: true,

            // Financeiro Granular
            access_financial_calendar: false,
            access_commissions: false,
            access_office_expenses: false,

            // Ferramentas Específicas
            access_tool_cnis: true,
            access_tool_gps: true,
            access_tool_docs: true,
            access_tool_cep: true,
            access_robots: false
        };

        const { error } = await supabase.from('user_permissions').insert([newUser]);

        if (error) {
            showToast('error', 'Erro ao adicionar. Verifique se o email já existe.');
        } else {
            showToast('success', 'Usuário adicionado! Ele já pode fazer login.');
            setNewEmail(''); setNewName(''); setIsAdding(false);
            fetchPermissions();
        }
    };

    const handleTogglePermission = async (id: string, field: keyof UserPermission, currentValue: boolean) => {
        // Atualização Otimista (Visual instantâneo)
        setUsersList(prev => prev.map(u => u.id === id ? { ...u, [field]: !currentValue } : u));

        // Atualização no Banco
        const { error } = await supabase.from('user_permissions').update({ [field]: !currentValue }).eq('id', id);

        if (error) {
            // Reverte em caso de erro
            setUsersList(prev => prev.map(u => u.id === id ? { ...u, [field]: currentValue } : u));
            showToast('error', 'Erro ao salvar permissão.');
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!confirm('Tem certeza? Esse usuário perderá acesso ao sistema.')) return;
        const { error } = await supabase.from('user_permissions').delete().eq('id', id);
        if (!error) {
            setUsersList(prev => prev.filter(u => u.id !== id));
            showToast('success', 'Usuário removido.');
        } else {
            showToast('error', 'Erro ao remover usuário.');
        }
    };

    const filteredUsers = usersList.filter(u =>
        (u.nome?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (u.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    // Componente de Toggle Switch Reutilizável
    const ToggleSwitch = ({ checked, onChange, disabled, colorClass = 'peer-checked:bg-blue-600' }: any) => (
        <label className="relative inline-flex items-center cursor-pointer">
            <input
                type="checkbox"
                className="sr-only peer"
                checked={!!checked} // Garante booleano
                onChange={onChange}
                disabled={disabled}
            />
            <div className={`w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer ${colorClass} peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
        </label>
    );

    return (
        <div className="p-8 animate-in fade-in duration-500 h-full overflow-y-auto custom-scrollbar pb-24">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-white font-serif flex items-center gap-3">
                        <UserCog className="text-red-500" size={32} />
                        Gerenciar Equipe
                    </h2>
                    <p className="text-zinc-400 mt-1">Controle granular de acesso por usuário.</p>
                </div>
                <button onClick={() => setIsAdding(true)} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-red-900/20 transition-all">
                    <Plus size={18} /> Novo Usuário
                </button>
            </div>

            {/* BARRA DE BUSCA E ADD */}
            <div className="bg-[#0f1014] border border-zinc-800 rounded-xl p-4 mb-6 shadow-lg">
                {isAdding ? (
                    <div className="flex flex-col md:flex-row items-center gap-4 animate-in slide-in-from-top-2">
                        <input autoFocus className="flex-1 w-full bg-black border border-zinc-700 rounded-lg px-4 py-2 text-white outline-none focus:border-red-500" placeholder="Nome do Colaborador" value={newName} onChange={e => setNewName(e.target.value)} />
                        <input className="flex-1 w-full bg-black border border-zinc-700 rounded-lg px-4 py-2 text-white outline-none focus:border-red-500" placeholder="Email de Login (Gmail/Outlook)" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                        <div className="flex gap-2 w-full md:w-auto">
                            <button onClick={handleAddUser} className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-lg flex-1 md:flex-none"><Check size={20} /></button>
                            <button onClick={() => setIsAdding(false)} className="bg-zinc-800 hover:bg-zinc-700 text-white p-2 rounded-lg flex-1 md:flex-none"><X size={20} /></button>
                        </div>
                    </div>
                ) : (
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                        <input
                            className="w-full bg-black/50 border border-zinc-800 rounded-lg pl-10 pr-10 py-2 text-white outline-none focus:border-red-500 transition-colors"
                            placeholder="Buscar usuário por nome ou email..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                                title="Limpar busca"
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* LISTA DE USUÁRIOS */}
            <div className="space-y-3">
                {isLoading ? (
                    <div className="text-center py-12 text-zinc-500 flex flex-col items-center gap-2">
                        <Loader2 className="animate-spin text-red-500" size={32} />
                        <span>Carregando permissões...</span>
                    </div>
                ) : filteredUsers.map(u => (
                    <div key={u.id} className="bg-[#0f1014] border border-zinc-800 rounded-xl overflow-hidden shadow-md transition-all hover:border-zinc-700">

                        {/* Header do Usuário (Sempre visível) */}
                        <div className="p-4 flex flex-col md:flex-row items-center justify-between bg-zinc-900/30 gap-4">
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 font-bold border border-zinc-700 shrink-0">
                                    {u.nome?.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-white font-bold truncate">{u.nome}</p>
                                    <p className="text-xs text-zinc-500 truncate">{u.email}</p>
                                </div>
                                {u.role === 'admin' && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 font-bold ml-2">ADMIN</span>
                                )}
                            </div>

                            <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                                {/* Permissões Macro (Rápido Acesso) */}
                                <div className="flex items-center gap-4 mr-4">
                                    <div className="flex flex-col items-center">
                                        <span className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Admin</span>
                                        <ToggleSwitch checked={u.role === 'admin'} onChange={() => handleTogglePermission(u.id, 'role', u.role === 'admin')} colorClass="peer-checked:bg-red-600" />
                                    </div>
                                    <div className="w-px h-8 bg-zinc-800 mx-2 hidden md:block"></div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Financeiro</span>
                                        <ToggleSwitch checked={u.access_financial} onChange={() => handleTogglePermission(u.id, 'access_financial', !!u.access_financial)} disabled={u.role === 'admin'} colorClass="peer-checked:bg-emerald-600" />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleDeleteUser(u.id)} disabled={u.email === user?.email} className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors disabled:opacity-0" title="Remover Usuário">
                                        <Trash2 size={18} />
                                    </button>

                                    <button onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)} className={`p-2 text-zinc-400 hover:text-white transition-transform duration-200 ${expandedUser === u.id ? 'rotate-180' : ''}`} title="Ver Detalhes">
                                        <ChevronDown size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Área Expandida (Granularidade) */}
                        {expandedUser === u.id && (
                            <div className="p-6 border-t border-zinc-800 bg-[#0a0a0c] grid grid-cols-1 md:grid-cols-3 gap-8 animate-in slide-in-from-top-2">

                                {/* 1. Módulos Principais */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2 mb-3 tracking-wider">
                                        <Shield size={14} /> Acesso Geral
                                    </h4>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center p-3 bg-zinc-900/50 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors">
                                            <span className="text-sm text-zinc-300 flex items-center gap-2"><LayoutDashboard size={14} /> Dashboard</span>
                                            <ToggleSwitch checked={u.access_dashboard} onChange={() => handleTogglePermission(u.id, 'access_dashboard', !!u.access_dashboard)} disabled={u.role === 'admin'} />
                                        </div>
                                        <div className="flex justify-between items-center p-3 bg-zinc-900/50 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors">
                                            <span className="text-sm text-zinc-300 flex items-center gap-2"><Users size={14} /> Clientes</span>
                                            <ToggleSwitch checked={u.access_clients} onChange={() => handleTogglePermission(u.id, 'access_clients', !!u.access_clients)} disabled={u.role === 'admin'} colorClass="peer-checked:bg-blue-600" />
                                        </div>
                                        <div className="flex justify-between items-center p-3 bg-zinc-900/50 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors">
                                            <span className="text-sm text-zinc-300 flex items-center gap-2"><Hourglass size={14} className="text-gold-500" /> Aposentadorias</span>
                                            <ToggleSwitch checked={u.access_retirements} onChange={() => handleTogglePermission(u.id, 'access_retirements', !!u.access_retirements)} disabled={u.role === 'admin'} colorClass="peer-checked:bg-gold-600" />
                                        </div>
                                        <div className="flex justify-between items-center p-3 bg-zinc-900/50 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors">
                                            <span className="text-sm text-zinc-300 flex items-center gap-2"><User size={14} className="text-purple-500" /> Aba Pessoal</span>
                                            <ToggleSwitch checked={u.access_personal} onChange={() => handleTogglePermission(u.id, 'access_personal', !!u.access_personal)} disabled={u.role === 'admin'} colorClass="peer-checked:bg-purple-600" />
                                        </div>
                                        <div className="flex justify-between items-center p-3 bg-zinc-900/50 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors">
                                            <span className="text-sm text-zinc-300 flex items-center gap-2"><MessageCircle size={14} className="text-emerald-500" /> WhatsApp</span>
                                            <ToggleSwitch checked={u.access_whatsapp} onChange={() => handleTogglePermission(u.id, 'access_whatsapp', !!u.access_whatsapp)} disabled={u.role === 'admin'} colorClass="peer-checked:bg-emerald-600" />
                                        </div>
                                    </div>
                                </div>

                                {/* 2. Tipos de Processos */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2 mb-3 tracking-wider">
                                        <Gavel size={14} /> Processos Permitidos
                                    </h4>

                                    {/* Master Switch para "Processos" */}
                                    <div className="flex justify-between items-center mb-2 px-1">
                                        <span className="text-xs text-zinc-400">Ver Módulo Processos</span>
                                        <ToggleSwitch checked={u.access_cases} onChange={() => handleTogglePermission(u.id, 'access_cases', !!u.access_cases)} disabled={u.role === 'admin'} />
                                    </div>

                                    <div className={`space-y-2 pl-2 border-l-2 border-zinc-800 ${!u.access_cases && u.role !== 'admin' ? 'opacity-50 pointer-events-none' : ''}`}>
                                        <div className="flex justify-between items-center p-2 rounded hover:bg-zinc-900/50 group/prop">
                                            <span className="text-sm text-zinc-300">Judicial / Trabalhista</span>
                                            <ToggleSwitch checked={u.access_cases_judicial} onChange={() => handleTogglePermission(u.id, 'access_cases_judicial', !!u.access_cases_judicial)} disabled={u.role === 'admin'} colorClass="peer-checked:bg-yellow-600" />
                                        </div>
                                        <div className="flex justify-between items-center p-2 rounded hover:bg-zinc-900/50 group/prop">
                                            <span className="text-sm text-zinc-300">Administrativo (INSS)</span>
                                            <ToggleSwitch checked={u.access_cases_administrative} onChange={() => handleTogglePermission(u.id, 'access_cases_administrative', !!u.access_cases_administrative)} disabled={u.role === 'admin'} colorClass="peer-checked:bg-yellow-600" />
                                        </div>
                                        <div className="flex justify-between items-center p-2 rounded hover:bg-zinc-900/50 group/prop">
                                            <span className="text-sm text-zinc-300">Seguro Defeso</span>
                                            <ToggleSwitch checked={u.access_cases_insurance} onChange={() => handleTogglePermission(u.id, 'access_cases_insurance', !!u.access_cases_insurance)} disabled={u.role === 'admin'} colorClass="peer-checked:bg-yellow-600" />
                                        </div>
                                        <div className="w-full h-px bg-zinc-800 my-1 opacity-50" />
                                        <div className="flex justify-between items-center p-2 rounded hover:bg-zinc-900/50 group/prop">
                                            <span className="text-sm text-zinc-300 flex items-center gap-2"><Stethoscope size={14} className="text-yellow-500" /> Perícias</span>
                                            <ToggleSwitch checked={u.access_expertise} onChange={() => handleTogglePermission(u.id, 'access_expertise', !!u.access_expertise)} disabled={u.role === 'admin'} colorClass="peer-checked:bg-yellow-600" />
                                        </div>
                                        <div className="flex justify-between items-center p-2 rounded hover:bg-zinc-900/50 group/prop">
                                            <span className="text-sm text-zinc-300 flex items-center gap-2"><CalendarCheck size={14} className="text-yellow-500" /> Eventos</span>
                                            <ToggleSwitch checked={u.access_events} onChange={() => handleTogglePermission(u.id, 'access_events', !!u.access_events)} disabled={u.role === 'admin'} colorClass="peer-checked:bg-yellow-600" />
                                        </div>
                                    </div>
                                </div>

                                {/* 3. Financeiro & Ferramentas */}
                                <div className="space-y-8">
                                    {/* Sub-seção: Financeiro */}
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2 mb-3 tracking-wider">
                                            <DollarSign size={14} /> Financeiro
                                        </h4>
                                        <div className={`space-y-2 pl-2 border-l-2 border-zinc-800 ${!u.access_financial && u.role !== 'admin' ? 'opacity-50 pointer-events-none' : ''}`}>
                                            <div className="flex justify-between items-center p-2 rounded hover:bg-zinc-900/50">
                                                <span className="text-sm text-zinc-300 flex items-center gap-2"><LayoutDashboard size={14} className="text-emerald-500" /> Visão Geral</span>
                                                <ToggleSwitch checked={u.access_financial} onChange={() => handleTogglePermission(u.id, 'access_financial', !!u.access_financial)} disabled={u.role === 'admin'} colorClass="peer-checked:bg-emerald-600" />
                                            </div>
                                            <div className="flex justify-between items-center p-2 rounded hover:bg-zinc-900/50">
                                                <span className="text-sm text-zinc-300 flex items-center gap-2"><HandCoins size={14} className="text-emerald-500" /> Comissões</span>
                                                <ToggleSwitch checked={u.access_commissions} onChange={() => handleTogglePermission(u.id, 'access_commissions', !!u.access_commissions)} disabled={u.role === 'admin'} colorClass="peer-checked:bg-emerald-600" />
                                            </div>
                                            <div className="flex justify-between items-center p-2 rounded hover:bg-zinc-900/50">
                                                <span className="text-sm text-zinc-300 flex items-center gap-2"><Building size={14} className="text-emerald-500" /> Despesas Fixas</span>
                                                <ToggleSwitch checked={u.access_office_expenses} onChange={() => handleTogglePermission(u.id, 'access_office_expenses', !!u.access_office_expenses)} disabled={u.role === 'admin'} colorClass="peer-checked:bg-emerald-600" />
                                            </div>
                                            <div className="flex justify-between items-center p-2 rounded hover:bg-zinc-900/50">
                                                <span className="text-sm text-zinc-300 flex items-center gap-2"><CalendarCheck size={14} className="text-emerald-500" /> Agenda Receb.</span>
                                                <ToggleSwitch checked={u.access_financial_calendar} onChange={() => handleTogglePermission(u.id, 'access_financial_calendar', !!u.access_financial_calendar)} disabled={u.role === 'admin'} colorClass="peer-checked:bg-emerald-600" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sub-seção: Ferramentas */}
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2 mb-3 tracking-wider">
                                            <Briefcase size={14} /> Ferramentas
                                        </h4>
                                        <div className={`space-y-2 pl-2 border-l-2 border-zinc-800 ${!u.access_tools && u.role !== 'admin' ? 'opacity-50 pointer-events-none' : ''}`}>
                                            <div className="flex justify-between items-center p-2 rounded hover:bg-zinc-900/50">
                                                <span className="text-sm text-zinc-300 flex items-center gap-2"><FileScan size={14} className="text-pink-500" /> Leitor CNIS</span>
                                                <ToggleSwitch checked={u.access_tool_cnis} onChange={() => handleTogglePermission(u.id, 'access_tool_cnis', !!u.access_tool_cnis)} disabled={u.role === 'admin'} colorClass="peer-checked:bg-pink-600" />
                                            </div>
                                            <div className="flex justify-between items-center p-2 rounded hover:bg-zinc-900/50">
                                                <span className="text-sm text-zinc-300 flex items-center gap-2"><Calculator size={14} className="text-pink-500" /> Calc. GPS</span>
                                                <ToggleSwitch checked={u.access_tool_gps} onChange={() => handleTogglePermission(u.id, 'access_tool_gps', !!u.access_tool_gps)} disabled={u.role === 'admin'} colorClass="peer-checked:bg-pink-600" />
                                            </div>
                                            <div className="flex justify-between items-center p-2 rounded hover:bg-zinc-900/50">
                                                <span className="text-sm text-zinc-300 flex items-center gap-2"><Briefcase size={14} className="text-pink-500" /> Docs Builder</span>
                                                <ToggleSwitch checked={u.access_tool_docs} onChange={() => handleTogglePermission(u.id, 'access_tool_docs', !!u.access_tool_docs)} disabled={u.role === 'admin'} colorClass="peer-checked:bg-pink-600" />
                                            </div>
                                            <div className="flex justify-between items-center p-2 rounded hover:bg-zinc-900/50">
                                                <span className="text-sm text-zinc-300 flex items-center gap-2"><MapPin size={14} className="text-pink-500" /> CEP Fácil</span>
                                                <ToggleSwitch checked={u.access_tool_cep} onChange={() => handleTogglePermission(u.id, 'access_tool_cep', !!u.access_tool_cep)} disabled={u.role === 'admin'} colorClass="peer-checked:bg-pink-600" />
                                            </div>
                                            <div className="flex justify-between items-center p-2 rounded hover:bg-zinc-900/50">
                                                <span className="text-sm text-zinc-300 flex items-center gap-2"><Cpu size={14} className="text-pink-500" /> Robôs / IA</span>
                                                <ToggleSwitch checked={u.access_robots} onChange={() => handleTogglePermission(u.id, 'access_robots', !!u.access_robots)} disabled={u.role === 'admin'} colorClass="peer-checked:bg-pink-600" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Permissions;
