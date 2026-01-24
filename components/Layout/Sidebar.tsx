import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
    LayoutDashboard, Users, Scale, DollarSign, LogOut, Hourglass, Camera, X,
    Save, Trash2, Loader2, FileScan, Briefcase, ChevronDown, Calculator,
    Shield, Gavel, FileText, Building, HandCoins, CalendarCheck, Bell,
    UserCog, User, Stethoscope, MessageSquare, Cpu
} from 'lucide-react';
import { BRAND_CONFIG } from '../../logoData';
import NotificationsPanel from '../ui/NotificationsPanel';

const Sidebar: React.FC = () => {
    const { currentView, setCurrentView, logout, user, updateUserProfile, notifications } = useApp();
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

    // Accordion States
    const [isToolsOpen, setIsToolsOpen] = useState(false);
    const [isCasesOpen, setIsCasesOpen] = useState(false);
    const [isFinancialOpen, setIsFinancialOpen] = useState(false);

    // Profile Edit State
    const [editName, setEditName] = useState('');
    const [editAvatar, setEditAvatar] = useState('');

    // --- LÓGICA DE PERMISSÕES ---
    const SUPER_ADMIN_EMAIL = 'marcelofernando@escritorio.com';
    const isSuperAdmin = user?.email?.trim().toLowerCase() === SUPER_ADMIN_EMAIL.trim().toLowerCase();

    const isAdmin = isSuperAdmin || user?.permissions?.role === 'admin';

    const canViewFinancial = isAdmin || user?.permissions?.access_financial === true;
    const canViewCases = isAdmin || user?.permissions?.access_cases === true;
    const canViewClients = isAdmin || user?.permissions?.access_clients === true;
    const canViewTools = isAdmin || user?.permissions?.access_tools === true;
    const canViewWhatsApp = isAdmin || user?.permissions?.access_whatsapp === true;

    const unreadCount = notifications.length;

    useEffect(() => {
        if (isProfileModalOpen && user) {
            setEditName(user.name || '');
            setEditAvatar(user.avatar || '');
        }
    }, [isProfileModalOpen, user]);

    useEffect(() => {
        if (['cnis', 'gps-calculator', 'document-builder'].includes(currentView)) {
            setIsToolsOpen(true);
        }
        if (['cases-judicial', 'cases-administrative', 'cases-insurance', 'cases'].includes(currentView)) {
            setIsCasesOpen(true);
        }
        if (['financial', 'office-expenses', 'commissions', 'financial-calendar'].includes(currentView)) {
            setIsFinancialOpen(true);
        }
    }, [currentView]);

    const handleNavigation = (viewId: any) => {
        setCurrentView(viewId);
        setIsNotificationsOpen(false);
    };

    const renderSingleItem = (item: any) => {
        const isActive = currentView === item.id;
        return (
            <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className="w-full flex items-center h-14 group/item relative"
            >
                {isActive && <div className="absolute left-0 h-8 w-1 bg-gold-500 rounded-r opacity-0 group-hover:opacity-100 transition-opacity" />}
                <div className="min-w-[70px] flex items-center justify-center">
                    <div className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 ${isActive ? 'bg-gold-600 text-white shadow-lg shadow-gold-600/20' : 'text-slate-400 group-hover/item:text-gold-500'}`}>
                        {item.icon && <item.icon size={20} />}
                    </div>
                </div>
                <span className={`whitespace-nowrap overflow-hidden text-sm font-medium transition-all duration-300 ${isActive ? 'text-white' : 'text-slate-400 group-hover/item:text-white'} w-0 opacity-0 group-hover:w-auto group-hover:opacity-100 group-hover:ml-1`}>
                    {item.label}
                </span>
            </button>
        );
    };

    const mainItemsBeforeCases = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }, // Dashboard geralmente liberado, mas se quiser granular pode usar canViewDashboard
        ...(canViewClients ? [{ id: 'clients', label: 'Clientes', icon: Users }] : []),
        ...(canViewWhatsApp ? [{ id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare }] : []),
    ];

    const mainItemsAfterCases = [
        ...(canViewCases ? [{ id: 'retirements', label: 'Aposentadorias', icon: Hourglass }] : []),
    ];

    const caseItems = [
        ...((isAdmin || user?.permissions?.access_cases_judicial) ? [{ id: 'cases-judicial', label: 'Judicial', icon: Gavel }] : []),
        ...((isAdmin || user?.permissions?.access_cases_administrative) ? [{ id: 'cases-administrative', label: 'Administrativo', icon: FileText }] : []),
        ...((isAdmin || user?.permissions?.access_cases_insurance) ? [{ id: 'cases-insurance', label: 'Seguro Defeso', icon: Shield }] : []),
        { id: 'expertise', label: 'Perícias', icon: Stethoscope },
    ];

    const toolItems = [
        ...((isAdmin || user?.permissions?.access_tool_cnis) ? [{ id: 'cnis', label: 'Leitor CNIS', icon: FileScan }] : []),
        ...((isAdmin || user?.permissions?.access_tool_gps) ? [{ id: 'gps-calculator', label: 'Calculadora GPS', icon: Calculator }] : []),
        ...((isAdmin || user?.permissions?.access_tool_docs) ? [{ id: 'document-builder', label: 'Criador Modelos', icon: Briefcase }] : []),
        ...((isAdmin || user?.permissions?.access_robots) ? [{ id: 'robots', label: 'Robôs', icon: Cpu }] : []),
    ];

    const financialItems = [
        { id: 'financial', label: 'Visão Geral', icon: DollarSign },
        { id: 'financial-calendar', label: 'Agenda Receb.', icon: CalendarCheck },
        { id: 'commissions', label: 'Comissões', icon: HandCoins },
        { id: 'office-expenses', label: 'Despesas Fixas', icon: Building },
    ];

    const getInitials = (name: string) => {
        const cleanName = name ? name.trim() : '';
        if (!cleanName) return 'DR';
        const parts = cleanName.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return parts[0].substring(0, 2).toUpperCase();
    };

    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 300;
                    const MAX_HEIGHT = 300;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
        });
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const compressedBase64 = await compressImage(file);
                setEditAvatar(compressedBase64);
            } catch (error) {
                console.error("Erro ao processar imagem", error);
            }
        }
    };

    const handleRemovePhoto = () => {
        setEditAvatar('');
    };

    const handleSaveProfile = async () => {
        setIsSaving(true);
        await updateUserProfile({
            name: editName,
            avatar: editAvatar
        });
        setIsSaving(false);
        setIsProfileModalOpen(false);
    };

    return (
        <>
            <aside className="hidden md:flex flex-col w-[70px] hover:w-64 bg-navy-950 border-r border-slate-800 h-screen sticky top-0 transition-all duration-300 ease-in-out group z-50">

                {/* Header Fixo - Logo */}
                <div className="h-20 flex items-center justify-center border-b border-slate-800 shrink-0 overflow-hidden relative">
                    <div className="w-full h-full flex items-center justify-center px-2">
                        {BRAND_CONFIG.logoBase64 ? (
                            <img
                                src={BRAND_CONFIG.logoBase64}
                                alt={BRAND_CONFIG.sidebarName}
                                className="max-h-12 w-auto object-contain transition-all duration-300 group-hover:scale-110"
                            />
                        ) : (
                            <div className="w-10 h-10 border-2 border-gold-500 transform rotate-45 flex items-center justify-center rounded-lg">
                                <Scale className="text-gold-500 transform -rotate-45" size={20} />
                            </div>
                        )}
                    </div>
                </div>

                <nav className="flex-1 py-4 space-y-2 overflow-y-auto overflow-x-hidden custom-scrollbar overscroll-contain">
                    {mainItemsBeforeCases.map(renderSingleItem)}

                    <button
                        onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                        className="w-full flex items-center h-14 group/notif relative"
                    >
                        {isNotificationsOpen && <div className="absolute left-0 h-8 w-1 bg-gold-500 rounded-r opacity-0 group-hover:opacity-100 transition-opacity" />}
                        <div className="min-w-[70px] flex items-center justify-center relative">
                            <div className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 ${isNotificationsOpen ? 'bg-navy-900 text-gold-500' : 'text-slate-400 group-hover/notif:text-gold-500'}`}>
                                <Bell size={20} />
                            </div>
                            {unreadCount > 0 && (
                                <span className="absolute top-2 right-4 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2 border-navy-950 shadow-sm animate-pulse">
                                    {unreadCount}
                                </span>
                            )}
                        </div>
                        <span className="whitespace-nowrap overflow-hidden text-sm font-medium transition-all duration-300 text-slate-400 group-hover/notif:text-white w-0 opacity-0 group-hover:w-auto group-hover:opacity-100 group-hover:ml-1">
                            Notificações
                        </span>
                    </button>

                    {canViewCases && (
                        <div>
                            <button
                                onClick={() => setIsCasesOpen(!isCasesOpen)}
                                className="w-full flex items-center h-14 group/cases"
                            >
                                <div className="min-w-[70px] flex items-center justify-center">
                                    <div className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 ${['cases-judicial', 'cases-administrative', 'cases-insurance', 'cases'].includes(currentView) ? 'bg-navy-900 text-gold-500' : 'text-slate-400 group-hover/cases:text-gold-500'}`}>
                                        <Scale size={20} />
                                    </div>
                                </div>
                                <div className="flex flex-1 items-center justify-between whitespace-nowrap overflow-hidden w-0 opacity-0 group-hover:w-auto group-hover:opacity-100 transition-all duration-300 group-hover:ml-1 pr-4">
                                    <span className="text-sm font-medium text-slate-400 group-hover/cases:text-white">Processos</span>
                                    <ChevronDown size={14} className={`transition-transform duration-200 text-slate-500 ${isCasesOpen ? 'rotate-180' : ''}`} />
                                </div>
                            </button>

                            <div className={`overflow-hidden transition-all duration-300 ease-in-out space-y-1 ${isCasesOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}>
                                {caseItems.map((item) => {
                                    const isActive = currentView === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => handleNavigation(item.id)}
                                            className="w-full flex items-center h-10 group/subitem relative"
                                        >
                                            <div className="min-w-[70px] flex justify-end pr-6"></div>
                                            <div className={`flex items-center gap-3 whitespace-nowrap overflow-hidden w-0 opacity-0 group-hover:w-auto group-hover:opacity-100 transition-all duration-300 pl-2 rounded-lg py-1.5 pr-3 ${isActive ? 'bg-navy-900 text-gold-500' : 'text-slate-500 hover:text-slate-300 hover:bg-navy-900/50'}`}>
                                                <item.icon size={16} />
                                                <span className="text-sm">{item.label}</span>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {mainItemsAfterCases.map(renderSingleItem)}

                    {canViewFinancial && (
                        <div>
                            <button
                                onClick={() => setIsFinancialOpen(!isFinancialOpen)}
                                className="w-full flex items-center h-14 group/fin"
                            >
                                <div className="min-w-[70px] flex items-center justify-center">
                                    <div className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 ${['financial', 'office-expenses', 'commissions', 'financial-calendar'].includes(currentView) ? 'bg-navy-900 text-gold-500' : 'text-slate-400 group-hover/fin:text-gold-500'}`}>
                                        <DollarSign size={20} />
                                    </div>
                                </div>
                                <div className="flex flex-1 items-center justify-between whitespace-nowrap overflow-hidden w-0 opacity-0 group-hover:w-auto group-hover:opacity-100 transition-all duration-300 group-hover:ml-1 pr-4">
                                    <span className="text-sm font-medium text-slate-400 group-hover/fin:text-white">Financeiro</span>
                                    <ChevronDown size={14} className={`transition-transform duration-200 text-slate-500 ${isFinancialOpen ? 'rotate-180' : ''}`} />
                                </div>
                            </button>

                            <div className={`overflow-hidden transition-all duration-300 ease-in-out space-y-1 ${isFinancialOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}>
                                {financialItems.map((item) => {
                                    const isActive = currentView === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => handleNavigation(item.id)}
                                            className="w-full flex items-center h-10 group/subitem relative"
                                        >
                                            <div className="min-w-[70px] flex justify-end pr-6"></div>
                                            <div className={`flex items-center gap-3 whitespace-nowrap overflow-hidden w-0 opacity-0 group-hover:w-auto group-hover:opacity-100 transition-all duration-300 pl-2 rounded-lg py-1.5 pr-3 ${isActive ? 'bg-navy-900 text-gold-500' : 'text-slate-500 hover:text-slate-300 hover:bg-navy-900/50'}`}>
                                                <item.icon size={16} />
                                                <span className="text-sm">{item.label}</span>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    <div className="py-2 px-4">
                        <div className="w-full h-px bg-slate-800 my-2 opacity-50"></div>
                    </div>

                    {canViewTools && (
                        <div>
                            <button
                                onClick={() => setIsToolsOpen(!isToolsOpen)}
                                className="w-full flex items-center h-14 group/tools"
                            >
                                <div className="min-w-[70px] flex items-center justify-center">
                                    <div className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 ${['cnis', 'gps-calculator', 'document-builder'].includes(currentView) ? 'text-gold-500 bg-navy-900' : 'text-slate-400 group-hover/tools:text-gold-500'}`}>
                                        <Briefcase size={20} />
                                    </div>
                                </div>

                                <div className="flex flex-1 items-center justify-between whitespace-nowrap overflow-hidden w-0 opacity-0 group-hover:w-auto group-hover:opacity-100 transition-all duration-300 group-hover:ml-1 pr-4">
                                    <span className="text-sm font-medium text-slate-400 group-hover/tools:text-white">Ferramentas</span>
                                    <ChevronDown size={14} className={`transition-transform duration-200 text-slate-500 ${isToolsOpen ? 'rotate-180' : ''}`} />
                                </div>
                            </button>

                            <div className={`overflow-hidden transition-all duration-300 ease-in-out space-y-1 ${isToolsOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}>
                                {toolItems.map((item) => {
                                    const isActive = currentView === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => handleNavigation(item.id)}
                                            className="w-full flex items-center h-10 group/subitem relative"
                                        >
                                            <div className="min-w-[70px] flex justify-end pr-6"></div>
                                            <div className={`flex items-center gap-3 whitespace-nowrap overflow-hidden w-0 opacity-0 group-hover:w-auto group-hover:opacity-100 transition-all duration-300 pl-2 rounded-lg py-1.5 pr-3 ${isActive ? 'bg-navy-900 text-gold-500' : 'text-slate-500 hover:text-slate-300 hover:bg-navy-900/50'}`}>
                                                <item.icon size={16} />
                                                <span className="text-sm">{item.label}</span>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* --- NOVO ITEM PESSOAL --- */}
                    {/* --- NOVO ITEM PESSOAL --- */}
                    {(isAdmin || user?.permissions?.access_personal) && (
                        <button
                            onClick={() => handleNavigation('personal')}
                            className="w-full flex items-center h-14 group/personal relative"
                        >
                            {currentView === 'personal' && <div className="absolute left-0 h-8 w-1 bg-purple-500 rounded-r opacity-0 group-hover:opacity-100 transition-opacity" />}
                            <div className="min-w-[70px] flex items-center justify-center">
                                <div className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 ${currentView === 'personal' ? 'bg-purple-900/50 text-purple-500' : 'text-slate-400 group-hover/personal:text-purple-500'}`}>
                                    <User size={20} />
                                </div>
                            </div>
                            <span className={`whitespace-nowrap overflow-hidden text-sm font-medium transition-all duration-300 ${currentView === 'personal' ? 'text-white' : 'text-slate-400 group-hover/personal:text-white'} w-0 opacity-0 group-hover:w-auto group-hover:opacity-100 group-hover:ml-1`}>
                                Pessoal
                            </span>
                        </button>
                    )}
                    {/* ------------------------- */}
                    {/* ------------------------- */}

                    {isAdmin && (
                        <>
                            <div className="py-2 px-4"><div className="w-full h-px bg-slate-800 my-2 opacity-50"></div></div>
                            <button
                                onClick={() => handleNavigation('permissions')}
                                className="w-full flex items-center h-14 group/admin relative"
                            >
                                {currentView === 'permissions' && <div className="absolute left-0 h-8 w-1 bg-red-500 rounded-r opacity-0 group-hover:opacity-100 transition-opacity" />}
                                <div className="min-w-[70px] flex items-center justify-center">
                                    <div className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 ${currentView === 'permissions' ? 'bg-red-900/50 text-red-500' : 'text-slate-400 group-hover/admin:text-red-500'}`}>
                                        <UserCog size={20} />
                                    </div>
                                </div>
                                <span className={`whitespace-nowrap overflow-hidden text-sm font-medium transition-all duration-300 ${currentView === 'permissions' ? 'text-white' : 'text-slate-400 group-hover/admin:text-white'} w-0 opacity-0 group-hover:w-auto group-hover:opacity-100 group-hover:ml-1`}>
                                    Gerenciar Equipe
                                </span>
                            </button>
                        </>
                    )}

                </nav>

                {/* Rodapé do Usuário */}
                <div className="h-20 border-t border-slate-800 shrink-0 bg-navy-950 flex items-center overflow-hidden">

                    <div className="min-w-[70px] flex items-center justify-center">
                        <button
                            onClick={() => setIsProfileModalOpen(true)}
                            className="w-10 h-10 rounded-full bg-navy-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-gold-500 overflow-hidden hover:border-gold-500 transition-all shadow-sm"
                            title="Editar Perfil"
                        >
                            {user?.avatar ? (
                                <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                getInitials(user?.name || '')
                            )}
                        </button>
                    </div>

                    <div className="flex-1 min-w-0 whitespace-nowrap overflow-hidden w-0 opacity-0 group-hover:w-auto group-hover:opacity-100 transition-all duration-300 group-hover:ml-1">
                        <button onClick={() => setIsProfileModalOpen(true)} className="text-left">
                            <p className="text-sm font-bold text-slate-200 truncate hover:text-gold-500 transition-colors">{user?.name}</p>
                            <p className="text-[10px] text-slate-500 truncate uppercase tracking-wider">{isAdmin ? 'Administrador' : 'Colaborador'}</p>
                        </button>
                    </div>

                    <div className="whitespace-nowrap overflow-hidden w-0 opacity-0 group-hover:w-auto group-hover:opacity-100 transition-all duration-300 pr-3">
                        <button
                            onClick={logout}
                            className="text-slate-500 hover:text-red-500 transition-colors p-2"
                            title="Sair"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>

                </div>
            </aside>

            <NotificationsPanel
                isOpen={isNotificationsOpen}
                onClose={() => setIsNotificationsOpen(false)}
                notifications={notifications}
            />

            {isProfileModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-[#09090b] border border-zinc-800 rounded-xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
                            <h3 className="text-xl font-bold text-white font-serif">Editar Perfil</h3>
                            <button onClick={() => setIsProfileModalOpen(false)} className="text-zinc-500 hover:text-white p-1 rounded hover:bg-zinc-800">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex flex-col items-center mb-6">
                            <div className="relative group cursor-pointer">
                                <div className="w-24 h-24 rounded-full bg-[#0f1014] border-2 border-gold-500/50 flex items-center justify-center overflow-hidden shadow-lg">
                                    {editAvatar ? (
                                        <img src={editAvatar} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-3xl font-bold text-gold-500">{getInitials(editName)}</span>
                                    )}
                                </div>
                                <label className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                                    <Camera size={24} className="mb-1" />
                                    <span className="text-[10px] font-medium">Alterar Foto</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                                </label>
                            </div>
                            {editAvatar && (
                                <button
                                    onClick={handleRemovePhoto}
                                    className="mt-2 text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                                >
                                    <Trash2 size={12} /> Remover foto
                                </button>
                            )}
                            <p className="text-xs text-zinc-500 mt-2">Clique na imagem para alterar</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 uppercase mb-1">Nome Completo</label>
                                <input
                                    className="w-full bg-[#0f1014] border border-zinc-800 rounded-lg px-3 py-2.5 text-zinc-200 focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/20 outline-none transition-colors placeholder:text-zinc-600"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder="Seu nome"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-zinc-800">
                            <button
                                onClick={() => setIsProfileModalOpen(false)}
                                className="px-4 py-2 text-zinc-400 hover:text-white rounded-lg transition-colors hover:bg-white/5"
                                disabled={isSaving}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveProfile}
                                disabled={isSaving}
                                className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg font-medium shadow-lg shadow-yellow-600/20 flex items-center gap-2 transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Sidebar;
