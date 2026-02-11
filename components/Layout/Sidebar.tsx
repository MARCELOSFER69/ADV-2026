import React, { useState, useEffect, useMemo, memo } from 'react';
import { useApp } from '../../context/AppContext';
import {
    LayoutDashboard, Users, Scale, DollarSign, LogOut, Hourglass, Camera, X,
    Save, Trash2, Loader2, FileScan, Briefcase, ChevronDown, Calculator,
    Shield, Gavel, FileText, Building, HandCoins, CalendarCheck, Bell,
    UserCog, User, Stethoscope, MessageSquare, Cpu, Download,
    Sun, Moon, Monitor, Bot, Settings, MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BRAND_CONFIG } from '../../logoData';
import NotificationsPanel from '../ui/NotificationsPanel';
import SettingsModal from '../modals/SettingsModal';

// --- SUB-COMPONENT: SIDEBAR ITEM (Already Memoized) ---
const SidebarItem = React.memo(({ item, isActive, waitingChatsCount, onClick }: { item: any, isActive: boolean, waitingChatsCount: number, onClick: (id: any) => void }) => {
    return (
        <motion.button
            onClick={() => item.onClick ? item.onClick() : onClick(item.id)}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.95 }}
            className="w-full flex items-center h-14 group/item relative"
        >
            {isActive && (
                <motion.div
                    layoutId="active-indicator"
                    className="absolute left-0 h-8 w-1 bg-gold-500 rounded-r shadow-[0_0_10px_#ca8a04]"
                />
            )}
            <div className="min-w-[70px] flex items-center justify-center">
                <div className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 relative ${isActive ? 'bg-gold-600 text-white shadow-lg shadow-gold-600/20' : 'text-slate-400 group-hover/item:text-gold-500'}`}>
                    {item.icon && <item.icon size={20} />}

                    {/* Badge for WhatsApp Queue */}
                    {item.id === 'whatsapp' && waitingChatsCount > 0 && (
                        <div className="absolute -top-1 -right-1 z-20 min-w-[18px] h-[18px] bg-red-600 text-white text-[10px] font-black flex items-center justify-center rounded-full border-[3px] border-navy-950 shadow-sm animate-pulse">
                            {waitingChatsCount}
                        </div>
                    )}
                </div>
            </div>
            <span
                className={`whitespace-nowrap overflow-hidden text-sm font-medium transition-all duration-300 ${isActive ? 'text-white' : 'text-slate-400 group-hover/item:text-white'} w-0 opacity-0 group-hover:w-auto group-hover:opacity-100 ml-1`}
            >
                {item.label}
            </span>
        </motion.button>
    );
});

// --- INNER COMPONENT: HEAVY UI (Memoized) ---
interface SidebarViewProps {
    currentView: string;
    onNavigate: (viewId: any, typeFilter?: string) => void;
    onLogout: () => void;
    user: any; // User object ref
    mergedPreferences: any;
    unreadCount: number;
    waitingChatsCount: number;
    setIsAssistantOpen: (open: boolean) => void;
    onOpenProfile: () => void;
    onOpenNotifications: () => void;
    isNotificationsOpen: boolean;
    permissions: {
        isAdmin: boolean;
        canViewFinancial: boolean;
        canViewCases: boolean;
        canViewClients: boolean;
        canViewTools: boolean;
        canViewWhatsApp: boolean;
        canViewPersonal: boolean;
        canViewRobots: boolean;
        canViewRetirements: boolean;
        canViewExpertise: boolean;
        canViewEvents: boolean;
    };
    onOpenSettings: () => void;
    isSettingsOpen: boolean;
    caseTypeFilter: string;
}

const SidebarView = memo(({
    currentView, onNavigate, onLogout, user, mergedPreferences, unreadCount, waitingChatsCount,
    setIsAssistantOpen, onOpenProfile, onOpenNotifications, isNotificationsOpen, permissions,
    onOpenSettings, isSettingsOpen, caseTypeFilter
}: SidebarViewProps) => {

    // Local State for Accordions (UI logic only)
    const [isToolsOpen, setIsToolsOpen] = useState(false);
    const [isCasesOpen, setIsCasesOpen] = useState(false);
    const [isFinancialOpen, setIsFinancialOpen] = useState(false);
    const [expandedCaseCategory, setExpandedCaseCategory] = useState<string | null>(null);

    // Auto-open/close accordions based on view (Effect stays local to View)
    useEffect(() => {
        const isToolView = ['cnis', 'gps-calculator', 'document-builder', 'cep-facil', 'robots'].includes(currentView);
        const isCaseView = ['cases-judicial', 'cases-administrative', 'cases-insurance', 'cases', 'expertise', 'events'].includes(currentView);
        const isFinancialView = ['financial', 'office-expenses', 'commissions', 'financial-calendar'].includes(currentView);

        setIsToolsOpen(isToolView);
        setIsCasesOpen(isCaseView);
        setIsFinancialOpen(isFinancialView);

        // Reset sub-categories if not in a case view
        if (!isCaseView) {
            setExpandedCaseCategory(null);
        }
    }, [currentView]);

    const { isAdmin, canViewFinancial, canViewCases, canViewClients, canViewTools, canViewWhatsApp, canViewPersonal, canViewRobots, canViewRetirements, canViewExpertise, canViewEvents } = permissions;

    const mainItemsBeforeCases = useMemo(() => [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        ...(canViewClients ? [{ id: 'clients', label: 'Clientes', icon: Users }] : []),
        ...(mergedPreferences?.assistantTriggerPosition === 'sidebar' ? [{ id: 'clara', label: 'Clara Copilot', icon: Bot, onClick: () => setIsAssistantOpen(true) }] : []),
        ...(canViewWhatsApp ? [{ id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare }] : []),
    ], [canViewClients, mergedPreferences?.assistantTriggerPosition, canViewWhatsApp, setIsAssistantOpen]);

    const mainItemsAfterCases = useMemo(() => [
        ...(canViewRetirements ? [{ id: 'retirements', label: 'Aposentadorias', icon: Hourglass }] : []),
    ], [canViewRetirements]);

    const judicialSubItems = [
        { id: 'Aposentadoria', label: 'Aposentadoria' },
        { id: 'Salário Maternidade', label: 'Salário Família/Materno' },
        { id: 'BPC/LOAS', label: 'BPC/LOAS' },
        { id: 'Auxílio Doença', label: 'Auxílio Doença' },
        { id: 'Pensão por Morte', label: 'Pensão por Morte' },
    ];

    const administrativeSubItems = [
        { id: 'Aposentadoria', label: 'Aposentadoria' },
        { id: 'Salário Maternidade', label: 'Salário Família/Materno' },
        { id: 'BPC/LOAS', label: 'BPC/LOAS' },
        { id: 'Auxílio Doença', label: 'Auxílio Doença' },
        { id: 'Pensão por Morte', label: 'Pensão por Morte' },
        { id: 'Seguro Defeso', label: 'Seguro Defeso' },
    ];

    const caseItems = useMemo(() => [
        ...(canViewCases && user?.permissions?.access_cases_judicial ? [{ id: 'cases-judicial', label: 'Judicial', icon: Gavel, subItems: judicialSubItems }] : []),
        ...(canViewCases && user?.permissions?.access_cases_administrative ? [{ id: 'cases-administrative', label: 'Administrativo', icon: FileText, subItems: administrativeSubItems }] : []),
        ...(canViewExpertise ? [{ id: 'expertise', label: 'Perícias', icon: Stethoscope }] : []),
        ...(canViewEvents ? [{ id: 'events', label: 'Eventos', icon: CalendarCheck }] : []),
    ], [canViewCases, user?.permissions, canViewExpertise, canViewEvents]);

    const toolItems = useMemo(() => [
        ...(canViewTools && user?.permissions?.access_tool_cnis ? [{ id: 'cnis', label: 'Leitor CNIS', icon: FileScan }] : []),
        ...(canViewTools && user?.permissions?.access_tool_gps ? [{ id: 'gps-calculator', label: 'Calculadora GPS', icon: Calculator }] : []),
        ...(canViewTools && user?.permissions?.access_tool_docs ? [{ id: 'document-builder', label: 'Criador Modelos', icon: Briefcase }] : []),
        ...(canViewTools && user?.permissions?.access_tool_cep ? [{ id: 'cep-facil', label: 'CEP Fácil', icon: MapPin }] : []),
        ...(canViewTools && (user?.permissions?.access_robots || canViewRobots) ? [{ id: 'robots', label: 'Robôs', icon: Cpu }] : []),
    ], [canViewTools, user?.permissions, canViewRobots]);

    const financialItems = useMemo(() => [
        ...(canViewFinancial ? [{ id: 'financial', label: 'Visão Geral', icon: DollarSign }] : []),
        ...(canViewFinancial && user?.permissions?.access_financial_calendar ? [{ id: 'financial-calendar', label: 'Agenda Receb.', icon: CalendarCheck }] : []),
        ...(canViewFinancial && user?.permissions?.access_commissions ? [{ id: 'commissions', label: 'Comissões', icon: HandCoins }] : []),
        ...(canViewFinancial && user?.permissions?.access_office_expenses ? [{ id: 'office-expenses', label: 'Despesas Fixas', icon: Building }] : []),
    ], [canViewFinancial, user?.permissions]);

    const getInitials = (name: string) => {
        const cleanName = name ? name.trim() : '';
        if (!cleanName) return 'DR';
        const parts = cleanName.split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return parts[0].substring(0, 2).toUpperCase();
    };

    const menuVariants = {
        open: { height: 'auto', opacity: 1, transition: { duration: 0.4 } },
        collapsed: { height: 0, opacity: 0, transition: { duration: 0.3 } }
    };

    const itemVariants = {
        hidden: { x: -10, opacity: 0 },
        visible: { x: 0, opacity: 1 }
    };

    return (
        <>
            {/* Placeholder */}
            <div className="hidden md:block w-[70px] h-screen shrink-0 relative z-50 group/sidebar-wrapper">
                <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 opacity-0 group-hover/sidebar-wrapper:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <aside className="flex flex-col w-[70px] hover:w-64 bg-navy-950/95 backdrop-blur-xl border-r border-white/5 h-screen absolute top-0 left-0 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group z-50 overflow-hidden shadow-2xl hover:shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)]">

                    {/* Header Logo */}
                    <div className="h-20 flex items-center justify-center border-b border-white/5 shrink-0 overflow-hidden relative bg-navy-950/50">
                        <div className="w-full h-full flex items-center justify-center px-2 group-hover:px-4 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
                            {BRAND_CONFIG.logoBase64 ? (
                                <div className="relative w-full h-full flex items-center justify-center">
                                    <img src={BRAND_CONFIG.logoBase64} alt={BRAND_CONFIG.sidebarName} className="max-h-10 group-hover:max-h-12 w-auto object-contain transition-all duration-500 rounded-xl" style={{ filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.3))' }} />
                                </div>
                            ) : (
                                <div className="w-10 h-10 border-2 border-gold-500 transform rotate-45 flex items-center justify-center rounded-xl bg-navy-900/50 backdrop-blur-sm"><Scale className="text-gold-500 transform -rotate-45" size={20} /></div>
                            )}
                        </div>
                    </div>

                    <nav className="flex-1 py-4 space-y-2 overflow-y-auto overflow-x-hidden custom-scrollbar overscroll-contain bg-navy-950">
                        {mainItemsBeforeCases.map(item => (
                            <SidebarItem key={item.id} item={item} isActive={currentView === item.id} waitingChatsCount={waitingChatsCount} onClick={onNavigate} />
                        ))}

                        <button onClick={onOpenNotifications} className="w-full flex items-center h-14 group/notif relative active-scale">
                            {isNotificationsOpen && <div className="absolute left-0 h-8 w-1 bg-gold-500 rounded-r opacity-0 group-hover:opacity-100 transition-opacity" />}
                            <div className="min-w-[70px] flex items-center justify-center">
                                <div className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 relative ${isNotificationsOpen ? 'bg-navy-900 text-gold-500' : 'text-slate-400 group-hover/notif:text-gold-500'}`}>
                                    <Bell size={20} />
                                    {unreadCount > 0 && <div className="absolute -top-1 -right-1 z-20 min-w-[18px] h-[18px] bg-red-600 text-white text-[10px] font-black flex items-center justify-center rounded-full border-[3px] border-navy-950 shadow-sm animate-pulse">{unreadCount}</div>}
                                </div>
                            </div>
                            <span className="whitespace-nowrap overflow-hidden text-sm font-medium transition-all duration-300 text-slate-400 group-hover/notif:text-white w-0 opacity-0 group-hover:w-auto group-hover:opacity-100 group-hover:ml-1">Notificações</span>
                        </button>

                        {canViewCases && (
                            <div>
                                <button onClick={() => setIsCasesOpen(!isCasesOpen)} className="w-full flex items-center h-14 group/cases active-scale">
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
                                <AnimatePresence>
                                    {isCasesOpen && (
                                        <motion.div initial="collapsed" animate="open" exit="collapsed" variants={menuVariants} className="overflow-hidden space-y-1 bg-navy-950/50">
                                            {caseItems.map((item, i) => {
                                                const isActive = currentView === item.id;
                                                const hasSubItems = item.subItems && item.subItems.length > 0;
                                                const isExpanded = expandedCaseCategory === item.id;

                                                return (
                                                    <div key={item.id} className="w-full">
                                                        <motion.button
                                                            variants={itemVariants}
                                                            initial="hidden"
                                                            animate="visible"
                                                            transition={{ delay: i * 0.05 }}
                                                            onClick={() => {
                                                                if (hasSubItems) {
                                                                    setExpandedCaseCategory(isExpanded ? null : item.id);
                                                                }
                                                                onNavigate(item.id);
                                                            }}
                                                            className="w-full flex items-center h-10 group/subitem relative active-scale"
                                                        >
                                                            <div className="min-w-[70px] flex justify-end pr-6"></div>
                                                            <div className={`flex flex-1 items-center justify-between gap-3 whitespace-nowrap overflow-hidden w-0 opacity-0 group-hover:w-auto group-hover:opacity-100 transition-all duration-300 pl-2 rounded-lg py-1.5 pr-3 ${isActive ? 'bg-navy-900 text-gold-500' : 'text-slate-500 hover:text-slate-300 hover:bg-navy-900/50'}`}>
                                                                <div className="flex items-center gap-3">
                                                                    <item.icon size={16} />
                                                                    <span className="text-sm">{item.label}</span>
                                                                </div>
                                                                {hasSubItems && (
                                                                    <ChevronDown size={12} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                                                )}
                                                            </div>
                                                        </motion.button>

                                                        {hasSubItems && isExpanded && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                className="overflow-hidden space-y-1 ml-[70px]"
                                                            >
                                                                {item.subItems.map((sub, si) => {
                                                                    const isSubActive = currentView === item.id && caseTypeFilter === sub.id;
                                                                    return (
                                                                        <button
                                                                            key={sub.id}
                                                                            onClick={() => {
                                                                                (onNavigate as any)(item.id, sub.id);
                                                                            }}
                                                                            className={`w-full text-left py-1.5 pl-8 pr-3 text-[11px] font-medium transition-colors uppercase tracking-wider flex items-center gap-2 ${isSubActive ? 'text-gold-500' : 'text-slate-500 hover:text-slate-300'}`}
                                                                        >
                                                                            <span className={`w-1.5 h-px shrink-0 transition-colors ${isSubActive ? 'bg-gold-500' : 'bg-slate-700'}`} />
                                                                            {sub.label}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </motion.div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        {mainItemsAfterCases.map(item => (<SidebarItem key={item.id} item={item} isActive={currentView === item.id} waitingChatsCount={waitingChatsCount} onClick={onNavigate} />))}

                        {canViewFinancial && (
                            <div>
                                <button onClick={() => setIsFinancialOpen(!isFinancialOpen)} className="w-full flex items-center h-14 group/fin">
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
                                <AnimatePresence>
                                    {isFinancialOpen && (
                                        <motion.div initial="collapsed" animate="open" exit="collapsed" variants={menuVariants} className="overflow-hidden space-y-1 bg-navy-950/50">
                                            {financialItems.map((item, i) => {
                                                const isActive = currentView === item.id;
                                                return (
                                                    <motion.button key={item.id} variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: i * 0.05 }} onClick={() => onNavigate(item.id)} className="w-full flex items-center h-10 group/subitem relative">
                                                        <div className="min-w-[70px] flex justify-end pr-6"></div>
                                                        <div className={`flex items-center gap-3 whitespace-nowrap overflow-hidden w-0 opacity-0 group-hover:w-auto group-hover:opacity-100 transition-all duration-300 pl-2 rounded-lg py-1.5 pr-3 ${isActive ? 'bg-navy-900 text-gold-500' : 'text-slate-500 hover:text-slate-300 hover:bg-navy-900/50'}`}>
                                                            <item.icon size={16} /><span className="text-sm">{item.label}</span>
                                                        </div>
                                                    </motion.button>
                                                )
                                            })}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        <div className="py-2 px-4"><div className="w-full h-px bg-slate-800 my-2 opacity-50"></div></div>

                        {canViewTools && (
                            <div>
                                <button onClick={() => setIsToolsOpen(!isToolsOpen)} className="w-full flex items-center h-14 group/tools">
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
                                <AnimatePresence>
                                    {isToolsOpen && (
                                        <motion.div initial="collapsed" animate="open" exit="collapsed" variants={menuVariants} className="overflow-hidden space-y-1 bg-navy-950/50">
                                            {toolItems.map((item, i) => {
                                                const isActive = currentView === item.id;
                                                return (
                                                    <motion.button key={item.id} variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: i * 0.05 }} onClick={() => onNavigate(item.id)} className="w-full flex items-center h-10 group/subitem relative">
                                                        <div className="min-w-[70px] flex justify-end pr-6"></div>
                                                        <div className={`flex items-center gap-3 whitespace-nowrap overflow-hidden w-0 opacity-0 group-hover:w-auto group-hover:opacity-100 transition-all duration-300 pl-2 rounded-lg py-1.5 pr-3 ${isActive ? 'bg-navy-900 text-gold-500' : 'text-slate-500 hover:text-slate-300 hover:bg-navy-900/50'}`}>
                                                            <item.icon size={16} /><span className="text-sm">{item.label}</span>
                                                        </div>
                                                    </motion.button>
                                                )
                                            })}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        {(canViewPersonal) && (
                            <button onClick={() => onNavigate('personal')} className="w-full flex items-center h-14 group/personal relative">
                                {currentView === 'personal' && <div className="absolute left-0 h-8 w-1 bg-purple-500 rounded-r opacity-0 group-hover:opacity-100 transition-opacity" />}
                                <div className="min-w-[70px] flex items-center justify-center">
                                    <div className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 ${currentView === 'personal' ? 'bg-purple-900/50 text-purple-500' : 'text-slate-400 group-hover/personal:text-purple-500'}`}>
                                        <User size={20} />
                                    </div>
                                </div>
                                <span className={`whitespace-nowrap overflow-hidden text-sm font-medium transition-all duration-300 ${currentView === 'personal' ? 'text-white' : 'text-slate-400 group-hover/personal:text-white'} w-0 opacity-0 group-hover:w-auto group-hover:opacity-100 group-hover:ml-1`}>Pessoal</span>
                            </button>
                        )}

                        {!(window as any).electronAPI?.isDesktop && (
                            <button onClick={() => onNavigate('download')} className="w-full flex items-center h-14 group/dl relative mt-4">
                                {currentView === 'download' && <div className="absolute left-0 h-8 w-1 bg-emerald-500 rounded-r opacity-0 group-hover:opacity-100 transition-opacity" />}
                                <div className="min-w-[70px] flex items-center justify-center">
                                    <div className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 ${currentView === 'download' ? 'bg-emerald-900/50 text-emerald-500' : 'text-slate-400 group-hover/dl:text-emerald-500'}`}>
                                        <Download size={20} />
                                    </div>
                                </div>
                                <span className={`whitespace-nowrap overflow-hidden text-sm font-medium transition-all duration-300 ${currentView === 'download' ? 'text-white' : 'text-slate-400 group-hover/dl:text-white'} w-0 opacity-0 group-hover:w-auto group-hover:opacity-100 group-hover:ml-1`}>Baixar App</span>
                            </button>
                        )}

                        {isAdmin && (
                            <>
                                <div className="py-2 px-4"><div className="w-full h-px bg-slate-800 my-2 opacity-50"></div></div>
                                <button onClick={() => onNavigate('permissions')} className="w-full flex items-center h-14 group/admin relative">
                                    {currentView === 'permissions' && <div className="absolute left-0 h-8 w-1 bg-red-500 rounded-r opacity-0 group-hover:opacity-100 transition-opacity" />}
                                    <div className="min-w-[70px] flex items-center justify-center">
                                        <div className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 ${currentView === 'permissions' ? 'bg-red-900/50 text-red-500' : 'text-slate-400 group-hover/admin:text-red-500'}`}>
                                            <UserCog size={20} />
                                        </div>
                                    </div>
                                    <span className={`whitespace-nowrap overflow-hidden text-sm font-medium transition-all duration-300 ${currentView === 'permissions' ? 'text-white' : 'text-slate-400 group-hover/admin:text-white'} w-0 opacity-0 group-hover:w-auto group-hover:opacity-100 group-hover:ml-1`}>Gerenciar Equipe</span>
                                </button>
                            </>
                        )}

                        {/* Botão de Configurações */}
                        <button onClick={onOpenSettings} className="w-full flex items-center h-14 group/settings relative">
                            {isSettingsOpen && <div className="absolute left-0 h-8 w-1 bg-gold-500 rounded-r opacity-0 group-hover:opacity-100 transition-opacity" />}
                            <div className="min-w-[70px] flex items-center justify-center">
                                <div className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 ${isSettingsOpen ? 'bg-navy-900 text-gold-500' : 'text-slate-400 group-hover/settings:text-gold-500'}`}>
                                    <Settings size={20} />
                                </div>
                            </div>
                            <span className="whitespace-nowrap overflow-hidden text-sm font-medium transition-all duration-300 text-slate-400 group-hover/settings:text-white w-0 opacity-0 group-hover:w-auto group-hover:opacity-100 group-hover:ml-1">Configurações</span>
                        </button>
                    </nav>

                    {/* Footer User */}
                    <div className="h-20 border-t border-white/5 shrink-0 bg-navy-950/50 backdrop-blur-md flex items-center overflow-hidden">
                        <div className="min-w-[70px] flex items-center justify-center">
                            <button onClick={onOpenProfile} className="w-10 h-10 rounded-full bg-navy-800/50 border border-white/10 flex items-center justify-center text-xs font-bold text-gold-500 overflow-hidden hover:border-gold-500 transition-all shadow-sm group-hover:scale-105" title="Editar Perfil">
                                {user?.avatar ? <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" /> : getInitials(user?.name || '')}
                            </button>
                        </div>
                        <div className="flex-1 min-w-0 whitespace-nowrap overflow-hidden w-0 opacity-0 group-hover:w-auto group-hover:opacity-100 transition-all duration-500 group-hover:ml-1">
                            <button onClick={onOpenProfile} className="text-left">
                                <p className="text-sm font-bold text-slate-200 truncate hover:text-gold-500 transition-colors">{user?.name}</p>
                                <p className="text-[10px] text-slate-500 truncate uppercase tracking-wider">{isAdmin ? 'Administrador' : 'Colaborador'}</p>
                            </button>
                        </div>
                        <div className="whitespace-nowrap overflow-hidden w-0 opacity-0 group-hover:w-auto group-hover:opacity-100 transition-all duration-500 pr-3">
                            <button onClick={onLogout} className="text-slate-500 hover:text-red-500 transition-colors p-2 hover:bg-white/5 rounded-lg" title="Sair"><LogOut size={18} /></button>
                        </div>
                    </div>
                </aside>
            </div>
        </>
    );
});

// --- WRAPPER COMPONENT: CONNECTS TO CONTEXT ---
const Sidebar: React.FC = () => {
    const {
        currentView, setCurrentView, logout, user, updateUserProfile,
        notifications, mergedPreferences, saveUserPreferences,
        isAssistantOpen, setIsAssistantOpen,
        waitingChatsCount, setCaseTypeFilter, caseTypeFilter
    } = useApp();

    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Edit Profile Local State
    const [isSaving, setIsSaving] = useState(false);
    const [editName, setEditName] = useState('');
    const [editAvatar, setEditAvatar] = useState('');
    const [editTheme, setEditTheme] = useState<'standard' | 'dark' | 'white'>('standard');

    const unreadCount = notifications.length;

    // Derived Permissions
    const permissions = useMemo(() => {
        const SUPER_ADMIN_EMAIL = 'marcelofernando@escritorio.com';
        const isSuperAdmin = user?.email?.trim().toLowerCase() === SUPER_ADMIN_EMAIL.trim().toLowerCase();
        const isAdmin = isSuperAdmin || user?.permissions?.role === 'admin';

        // Helper to check permission, defaulting to true for admins if field is missing/null
        const checkPerm = (field: string) => {
            const val = (user?.permissions as any)?.[field];
            if (val === false) return false;
            if (val === true) return true;
            return isAdmin; // Fallback for admins if not explicitly set
        };

        return {
            isAdmin,
            canViewFinancial: checkPerm('access_financial'),
            canViewCases: checkPerm('access_cases'),
            canViewClients: checkPerm('access_clients'),
            canViewTools: checkPerm('access_tools'),
            canViewWhatsApp: checkPerm('access_whatsapp'),
            canViewPersonal: checkPerm('access_personal'),
            canViewRobots: checkPerm('access_robots'),
            canViewRetirements: checkPerm('access_retirements'),
            canViewExpertise: checkPerm('access_expertise'),
            canViewEvents: checkPerm('access_events'),
        };
    }, [user]);

    const handleNavigation = React.useCallback((viewId: any, typeFilter?: string) => {
        setCurrentView(viewId);
        setCaseTypeFilter(typeFilter || 'all');
        setIsNotificationsOpen(false);
    }, [setCurrentView, setCaseTypeFilter]);

    // --- Profile Handlers ---
    useEffect(() => {
        if (isProfileModalOpen && user) {
            setEditName(user.name || '');
            setEditAvatar(user.avatar || '');
            setEditTheme(mergedPreferences.theme || 'standard');
        }
    }, [isProfileModalOpen, user, mergedPreferences.theme]);

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
                    if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } }
                    else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
                    canvas.width = width; canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
                img.onerror = reject;
            };
            reader.onerror = reject;
        });
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try { setEditAvatar(await compressImage(file)); } catch (error) { console.error("Erro foto", error); }
        }
    };

    const handleSaveProfile = async () => {
        setIsSaving(true);
        await updateUserProfile({ name: editName, avatar: editAvatar });
        await saveUserPreferences({ theme: editTheme });
        setIsSaving(false);
        setIsProfileModalOpen(false);
    };

    // --- Render View + Modals ---
    return (
        <>
            <SidebarView
                currentView={currentView}
                onNavigate={handleNavigation}
                onLogout={logout}
                user={user}
                mergedPreferences={mergedPreferences}
                unreadCount={unreadCount}
                waitingChatsCount={waitingChatsCount}
                setIsAssistantOpen={setIsAssistantOpen}
                onOpenProfile={() => setIsProfileModalOpen(true)}
                onOpenNotifications={() => setIsNotificationsOpen(!isNotificationsOpen)}
                isNotificationsOpen={isNotificationsOpen}
                permissions={permissions}
                onOpenSettings={() => setIsSettingsOpen(true)}
                isSettingsOpen={isSettingsOpen}
                caseTypeFilter={caseTypeFilter}
            />

            <NotificationsPanel isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} notifications={notifications} />

            {/* Settings Modal */}
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

            {/* Profile Modal (kept here as it needs state form logic) */}
            {isProfileModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-[#09090b] border border-zinc-800 rounded-xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
                            <h3 className="text-xl font-bold text-white font-serif">Editar Perfil</h3>
                            <button onClick={() => setIsProfileModalOpen(false)} className="text-zinc-500 hover:text-white p-1 rounded hover:bg-zinc-800"><X size={20} /></button>
                        </div>
                        <div className="flex flex-col items-center mb-6">
                            <div className="relative group cursor-pointer">
                                <div className="w-24 h-24 rounded-full bg-[#0f1014] border-2 border-gold-500/50 flex items-center justify-center overflow-hidden shadow-lg">
                                    {editAvatar ? <img src={editAvatar} alt="Profile" className="w-full h-full object-cover" /> : <span className="text-3xl font-bold text-gold-500">{user?.name ? user.name[0] : 'U'}</span>}
                                </div>
                                <label className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                                    <Camera size={24} className="mb-1" /><span className="text-[10px] font-medium">Alterar Foto</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                                </label>
                            </div>
                            {editAvatar && <button onClick={() => setEditAvatar('')} className="mt-2 text-xs text-red-400 hover:text-red-300 flex items-center gap-1"><Trash2 size={12} /> Remover foto</button>}
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 uppercase mb-1">Nome Completo</label>
                                <input className="w-full bg-[#0f1014] border border-zinc-800 rounded-lg px-3 py-2.5 text-zinc-200 focus:border-yellow-600 outline-none" value={editName} onChange={(e) => setEditName(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 uppercase mb-3">Tema do Sistema</label>
                                <div className="grid grid-cols-3 gap-3">
                                    <button onClick={() => setEditTheme('standard')} className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all active-scale ${editTheme === 'standard' ? 'bg-navy-900 border-gold-500 text-gold-500' : 'bg-[#0f1014] border-zinc-800 text-zinc-500'}`}><Monitor size={20} /><span className="text-[10px] font-bold uppercase">Padrão</span></button>
                                    <button onClick={() => setEditTheme('dark')} className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all active-scale ${editTheme === 'dark' ? 'bg-zinc-900 border-gold-500 text-gold-500' : 'bg-[#0f1014] border-zinc-800 text-zinc-500'}`}><Moon size={20} /><span className="text-[10px] font-bold uppercase">Deep Dark</span></button>
                                    <button onClick={() => setEditTheme('white')} className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all active-scale ${editTheme === 'white' ? 'bg-slate-100 border-gold-500 text-gold-600' : 'bg-[#0f1014] border-zinc-800 text-zinc-500'}`}><Sun size={20} /><span className="text-[10px] font-bold uppercase">White</span></button>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-zinc-800">
                            <button onClick={() => setIsProfileModalOpen(false)} className="px-4 py-2 text-zinc-400 hover:text-white rounded-lg" disabled={isSaving}>Cancelar</button>
                            <button onClick={handleSaveProfile} disabled={isSaving} className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg flex items-center gap-2">{isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}{isSaving ? 'Salvando...' : 'Salvar'}</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default React.memo(Sidebar);
