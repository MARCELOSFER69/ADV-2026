
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { CaseType, CaseStatus, Client, Case } from '../types';
import { Hourglass, ChevronRight, User, Eye, Briefcase, Phone, MessageCircle, AlertCircle, X, MapPin, Calculator, Check, Clock, AlertTriangle, FileText, Search, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import CaseDetailsModal from '../components/modals/CaseDetailsModal';
import PendencyIndicator from '../components/ui/PendencyIndicator';

interface RetirementCandidate {
    client: Client;
    age: { years: number; months: number };
    ruralRemaining: number;
    urbanRemaining: number;
    bestChance: 'Rural' | 'Urbana';
    yearsRemaining: number;
}


interface DetailedCalculation {
    type: 'Urbana' | 'Rural' | 'Híbrida';
    ageTarget: number;
    contributionTargetMonths: number;
    currentAge: number;
    currentContributionMonths: number;
    isAgeOk: boolean;
    isContributionOk: boolean;
}

const RetirementCard: React.FC<{
    candidate: RetirementCandidate;
    onClick: () => void;
    onUpdateClient: (client: Client) => void;
    onOpenCnisDetails: (client: Client, calculation: DetailedCalculation) => void;
    onAddCnis: (client: Client) => void;
    globalTrigger: number;
    activeHoverId: string | null;
    setActiveHoverId: (id: string | null) => void;
}> = ({ candidate, onClick, onUpdateClient, onOpenCnisDetails, onAddCnis, globalTrigger, activeHoverId, setActiveHoverId }) => {
    const [localTrigger, setLocalTrigger] = useState(0);
    const isHovered = activeHoverId === candidate.client.id;

    React.useEffect(() => {
        if (!isHovered) {
            setLocalTrigger(globalTrigger);
        }
    }, [globalTrigger]);

    // Inicializa com o valor do banco SE existir, senão usa o bestChance
    const initialMode = candidate.client.aposentadoria_modalidade || candidate.bestChance;
    const [mode, setMode] = useState<'Rural' | 'Urbana'>(initialMode);

    const handleModeChange = (newMode: 'Rural' | 'Urbana') => {
        setMode(newMode);
        // Persistir no banco de dados "para todos"
        onUpdateClient({
            ...candidate.client,
            aposentadoria_modalidade: newMode
        });
    };

    const cnisData = candidate.client.cnis_data;
    const totalMonths = useMemo(() => {
        if (!cnisData?.totalTime) return 0;
        return (cnisData.totalTime.years * 12) + cnisData.totalTime.months + (cnisData.totalTime.days >= 15 ? 1 : 0);
    }, [cnisData]);

    const targetAge = mode === 'Rural'
        ? (candidate.client.sexo === 'Masculino' ? 60 : 55)
        : (candidate.client.sexo === 'Masculino' ? 65 : 62);

    const contributionTarget = mode === 'Urbana' ? 180 : 0; // 15 anos em meses

    const isAgeEligible = (candidate.age.years + candidate.age.months / 12) >= targetAge;
    const isContributionEligible = mode === 'Rural' || totalMonths >= contributionTarget;

    // Se for Urbana e não tiver tempo suficiente, verificar se seria elegível hibrido (mesma idade mas tempo >= 180)
    const isHybridCandidate = mode === 'Urbana' && !isContributionEligible && totalMonths > 0;

    // Recalcular baseados no modo selecionado
    const displayRemaining = mode === 'Rural' ? candidate.ruralRemaining : candidate.urbanRemaining;
    const isEligible = isAgeEligible && isContributionEligible;

    const hasPendencias = candidate.client.pendencias && candidate.client.pendencias.length > 0;

    const avatarClass = isEligible
        ? 'bg-emerald-500 text-black font-bold'
        : (hasPendencias ? 'bg-red-600 text-white animate-pulse' : 'bg-zinc-700 text-zinc-300');

    const formatTimeRemaining = (val: number) => {
        if (val <= 0) return "Já atingiu idade";
        const years = Math.floor(val);
        const months = Math.floor((val - years) * 12);
        if (years === 0) return `${months} meses`;
        return `${years} anos e ${months} meses`;
    };



    const getThematicColor = () => {
        if (isEligible) return '#10b981';
        if (displayRemaining <= 1) return '#84cc16'; // Lime
        if (displayRemaining <= 3) return '#eab308'; // Yellow/Gold
        if (displayRemaining <= 5) return '#f97316'; // Orange
        return '#64748b'; // Slate
    };

    const calculation: DetailedCalculation = {
        type: mode,
        ageTarget: targetAge,
        contributionTargetMonths: contributionTarget,
        currentAge: candidate.age.years + (candidate.age.months / 12),
        currentContributionMonths: totalMonths,
        isAgeOk: isAgeEligible,
        isContributionOk: isContributionEligible
    };

    return (
        <motion.div
            initial={false}
            animate={{ scale: isEligible ? 1.02 : 1 }}
            className={`relative p-[1.5px] rounded-xl group/card transition-all ${isEligible ? 'shadow-[0_10px_30px_rgba(16,185,129,0.2)]' : ''}`}
            onMouseEnter={() => setActiveHoverId(candidate.client.id)}
            onMouseLeave={() => setActiveHoverId(null)}
        >
            {/* Tracing Border for Eligible - Slow and Elegant */}
            {isEligible && (
                <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                    <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,transparent_25%,#10b981_50%,transparent_75%)] animate-[spin_8s_linear_infinite] opacity-30 blur-[2px]" />
                </div>
            )}

            <div
                onClick={(e) => {
                    // Evita abrir o modal se clicar nos botões de toggle ou link de cnis
                    if ((e.target as HTMLElement).closest('.mode-toggle') || (e.target as HTMLElement).closest('.cnis-link')) return;
                    onClick();
                }}
                className={`
                    relative rounded-xl p-5 cursor-pointer transition-all group bg-[#0f1014] h-full
                    ${isEligible
                        ? 'border border-emerald-500/30'
                        : 'border border-zinc-800 hover:border-zinc-700 hover:shadow-lg'
                    }
                `}
            >
                {/* Progress Bar Background - Premium Animated Line */}
                <div className="absolute bottom-0 left-0 right-0 h-[3px] overflow-visible rounded-b-xl bg-zinc-800/30">
                    <svg key={localTrigger} className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
                        <motion.line
                            x1="0"
                            y1="1.5"
                            x2="100%"
                            y2="1.5"
                            strokeWidth="3"
                            strokeLinecap="round"
                            initial={{ pathLength: 0, stroke: "rgba(113, 113, 122, 0.5)" }}
                            animate={{
                                pathLength: (isEligible ? 100 : Math.max(5, (100 - (displayRemaining * 20)))) / 100,
                                stroke: isHovered
                                    ? getThematicColor()
                                    : (isEligible
                                        ? ["rgba(113, 113, 122, 0.5)", "#10b981", "rgba(113, 113, 122, 0.5)", "#10b981", "rgba(113, 113, 122, 0.5)", "#10b981", "#10b981"]
                                        : "rgba(113, 113, 122, 0.5)")
                            }}
                            transition={{
                                pathLength: { duration: 2, ease: "easeInOut" },
                                stroke: isHovered
                                    ? { duration: 0.2 }
                                    : { duration: 3, delay: 2, times: [0, 0.16, 0.33, 0.5, 0.66, 0.83, 1] }
                            }}
                        />
                    </svg>
                </div>

                <div className="flex justify-between items-start mb-4">
                    <PendencyIndicator pendencies={candidate.client.pendencias} align="left">
                        <div className="flex items-center gap-4 cursor-help">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold border-2 border-transparent shadow-sm relative transition-all duration-300 ${avatarClass} ${hasPendencias ? 'shadow-[0_0_15px_rgba(225,29,72,0.2)]' : ''}`}>
                                {candidate.client.nome_completo.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <h4 className="font-bold text-zinc-100 text-base group-hover:text-white transition-colors line-clamp-1">
                                    {candidate.client.nome_completo}
                                </h4>
                                <p className="text-xs text-zinc-500 mt-0.5">{candidate.age.years} anos • {candidate.client.sexo}</p>
                            </div>
                        </div>
                    </PendencyIndicator>
                    {isEligible && (
                        <span className="text-[10px] font-bold bg-emerald-500 text-black px-2 py-1 rounded shadow-[0_0_10px_rgba(16,185,129,0.6)]">
                            ELEGÍVEL
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2 mb-3 mode-toggle bg-black/40 p-1 rounded-lg border border-white/5 w-fit">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleModeChange('Rural'); }}
                        className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${mode === 'Rural' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        RURAL
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleModeChange('Urbana'); }}
                        className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${mode === 'Urbana' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        URBANA
                    </button>
                </div>

                <div className="bg-[#09090b] rounded-lg p-3 border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                    <div className="flex justify-between items-end mb-1">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Modalidade {mode}</span>
                        <span className={`text-sm font-bold ${isEligible ? 'text-emerald-400' : 'text-zinc-200'}`}>
                            {formatTimeRemaining(displayRemaining)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <p className="text-[10px] text-zinc-600">
                            Meta: {targetAge} anos {mode === 'Urbana' ? '+ 180 contrib.' : ''}
                        </p>
                        {mode === 'Urbana' && (
                            <div className="text-[10px] font-mono cnis-link">
                                {cnisData ? (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onOpenCnisDetails(candidate.client, calculation); }}
                                        className={`flex items-center gap-1 hover:underline ${isContributionEligible ? 'text-emerald-500' : 'text-yellow-500'}`}
                                    >
                                        <Calculator size={10} /> {totalMonths} meses
                                    </button>
                                ) : (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onAddCnis(candidate.client); }}
                                        className="text-red-500 hover:underline flex items-center gap-1"
                                    >
                                        <AlertCircle size={10} /> S/ CNIS
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                    {isHybridCandidate && (
                        <div className="mt-2 pt-2 border-t border-zinc-800 flex items-center gap-1 animate-pulse">
                            <span className="text-[9px] font-bold text-yellow-500 uppercase">Sugestão: Híbrida?</span>
                            <Briefcase size={8} className="text-yellow-500" />
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

const Retirements: React.FC = () => {
    const { clients, cases, showToast, setCurrentView, setClientToView, updateClient } = useApp();
    const [selectedCase, setSelectedCase] = useState<Case | null>(null);
    const [selectedCandidate, setSelectedCandidate] = useState<RetirementCandidate | null>(null);
    const [calculationDetail, setCalculationDetail] = useState<{ client: Client, calc: DetailedCalculation } | null>(null);

    // Estados dos Filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [filterGender, setFilterGender] = useState<'Todos' | 'Masculino' | 'Feminino'>('Todos');
    const [filterModality, setFilterModality] = useState<'Todas' | 'Rural' | 'Urbana'>('Todas');
    const [filterStatus, setFilterStatus] = useState<'Todos' | 'Elegíveis' | 'Pendentes'>('Todos');
    const [filterPeriod, setFilterPeriod] = useState<number>(60); // Default 5 anos (60 meses)
    const [globalTrigger, setGlobalTrigger] = useState(0);
    const [activeHoverId, setActiveHoverId] = useState<string | null>(null);

    React.useEffect(() => {
        const interval = setInterval(() => {
            setGlobalTrigger(prev => prev + 1);
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    const periodOptions = [
        { label: '1 mês', value: 1 },
        { label: '2 meses', value: 2 },
        { label: '3 meses', value: 3 },
        { label: '4 meses', value: 4 },
        { label: '6 meses', value: 6 },
        { label: '8 meses', value: 8 },
        { label: '10 meses', value: 10 },
        { label: '1 ano', value: 12 },
        { label: '2 anos', value: 24 },
        { label: '3 anos', value: 36 },
        { label: '5 anos', value: 60 },
        { label: '10 anos', value: 120 },
    ];

    // 1. Filtrar Processos de Aposentadoria em Andamento
    const activeRetirements = cases.filter(c =>
        c.tipo === CaseType.APOSENTADORIA &&
        c.status !== CaseStatus.ARQUIVADO
    );

    // 2. Calcular Candidatos (Futuras Aposentadorias)
    const candidates: RetirementCandidate[] = useMemo(() => {
        const clientsWithActiveRetirements = new Set(
            cases
                .filter(c => c.tipo === CaseType.APOSENTADORIA && c.status !== CaseStatus.ARQUIVADO)
                .map(c => c.client_id)
        );

        return clients
            .filter(client => !clientsWithActiveRetirements.has(client.id))
            .map(client => {
                if (!client.data_nascimento || !client.sexo) return null;

                const birth = new Date(client.data_nascimento);
                const today = new Date();
                let years = today.getFullYear() - birth.getFullYear();
                let months = today.getMonth() - birth.getMonth();
                if (months < 0) {
                    years--;
                    months += 12;
                }

                const isMale = client.sexo === 'Masculino';

                // Usamos a modalidade preferida do cliente se existir, senão calculamos a melhor chance
                const preferredMode = client.aposentadoria_modalidade;

                const ruralTarget = isMale ? 60 : 55;
                const urbanTarget = isMale ? 65 : 62;

                const ruralRemaining = Math.max(0, ruralTarget - years - (months / 12));
                const urbanRemaining = Math.max(0, urbanTarget - years - (months / 12));

                const bestChance = ruralRemaining <= urbanRemaining ? 'Rural' : 'Urbana';

                // Se o cliente já tem uma modalidade definida no banco, usamos ela para o filtro de tempo
                const activeMode = preferredMode || bestChance;
                const yearsRemaining = activeMode === 'Rural' ? ruralRemaining : urbanRemaining;

                return {
                    client,
                    age: { years, months },
                    ruralRemaining,
                    urbanRemaining,
                    bestChance,
                    yearsRemaining
                };
            })
            .filter((c): c is RetirementCandidate => c !== null)
            // Aplicação dos Filtros
            .filter(c => {
                // Filtro de Busca (Nome ou CPF)
                const searchLower = searchTerm.toLowerCase();
                const matchesSearch = c.client.nome_completo.toLowerCase().includes(searchLower) ||
                    c.client.cpf_cnpj?.includes(searchTerm);

                // Filtro de Gênero
                const matchesGender = filterGender === 'Todos' || c.client.sexo === filterGender;

                // Filtro de Modalidade
                const modalidadeAtual = c.client.aposentadoria_modalidade || c.bestChance;
                const matchesModality = filterModality === 'Todas' || modalidadeAtual === filterModality;

                // Filtro de Status (Elegíveis / Pendentes)
                const totalMonths = (c.client.cnis_data?.totalTime?.years * 12 || 0) +
                    (c.client.cnis_data?.totalTime?.months || 0);
                const targetAge = (c.client.aposentadoria_modalidade || c.bestChance) === 'Rural'
                    ? (c.client.sexo === 'Masculino' ? 60 : 55)
                    : (c.client.sexo === 'Masculino' ? 65 : 62);
                const contributionTarget = (c.client.aposentadoria_modalidade || c.bestChance) === 'Urbana' ? 180 : 0;

                const isAgeEligible = (c.age.years + c.age.months / 12) >= targetAge;
                const isContrEligible = (c.client.aposentadoria_modalidade || c.bestChance) === 'Rural' || totalMonths >= contributionTarget;
                const isEligible = isAgeEligible && isContrEligible;
                const hasPendencias = c.client.pendencias && c.client.pendencias.length > 0;

                const matchesStatus = filterStatus === 'Todos' ||
                    (filterStatus === 'Elegíveis' && isEligible) ||
                    (filterStatus === 'Pendentes' && hasPendencias);

                // Filtro de Período
                const matchesPeriod = c.yearsRemaining <= filterPeriod / 12;

                return matchesSearch && matchesGender && matchesModality && matchesStatus && matchesPeriod;
            })
            .sort((a, b) => a.yearsRemaining - b.yearsRemaining);
    }, [clients, cases, searchTerm, filterGender, filterModality, filterStatus, filterPeriod]);

    const handleWhatsAppClick = (phone: string | undefined) => {
        if (!phone) return;
        const cleanNumber = phone.replace(/\D/g, '');
        const fullNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;
        window.open(`https://wa.me/${fullNumber}`, '_blank');
    };

    const handleViewFullProfile = (clientId: string, tab?: 'info' | 'docs' | 'credentials' | 'history' | 'cnis') => {
        setClientToView(clientId, tab);
        setCurrentView('clients');
    };

    const formatTimeRemaining = (val: number) => {
        if (val <= 0) return "Já atingiu idade";
        const years = Math.floor(val);
        const months = Math.floor((val - years) * 12);
        if (years === 0) return `${months} meses`;
        return `${years} anos e ${months} meses`;
    };

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-4">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-gold-500/10 rounded-2xl text-gold-500 border border-gold-500/20 shadow-lg shadow-gold-500/5 transition-transform hover:scale-105">
                        <Hourglass size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white font-serif tracking-tight">
                            Gestão de Aposentadorias
                        </h1>
                        <p className="text-slate-400 text-[11px] md:text-xs font-medium mt-0.5 opacity-80 uppercase tracking-widest">
                            Acompanhamento de processos e prospecção de futuros aposentados.
                        </p>
                    </div>
                </div>
            </div>

            {/* SEÇÃO 1: FUTURAS APOSENTADORIAS (FUNIL) */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <AlertCircle size={20} className="text-gold-500" />
                        Próximas Aposentadorias (Projeção)
                    </h3>
                </div>

                {/* BARRA DE FILTROS */}
                <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 space-y-4">
                    <div className="flex flex-col lg:flex-row gap-4">
                        {/* Busca */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar por nome ou CPF..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-gold-500/50 transition-colors"
                            />
                        </div>

                        <div className="flex flex-wrap gap-3">
                            {/* Gênero */}
                            <select
                                value={filterGender}
                                onChange={(e) => setFilterGender(e.target.value as any)}
                                className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-gold-500/50 cursor-pointer"
                            >
                                <option value="Todos" className="bg-[#18181b]">Todos Gêneros</option>
                                <option value="Masculino" className="bg-[#18181b]">Masculino</option>
                                <option value="Feminino" className="bg-[#18181b]">Feminino</option>
                            </select>

                            {/* Modalidade */}
                            <select
                                value={filterModality}
                                onChange={(e) => setFilterModality(e.target.value as any)}
                                className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-gold-500/50 cursor-pointer"
                            >
                                <option value="Todas" className="bg-[#18181b]">Todas Modalidades</option>
                                <option value="Urbana" className="bg-[#18181b]">Urbana</option>
                                <option value="Rural" className="bg-[#18181b]">Rural</option>
                            </select>

                            {/* Status */}
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value as any)}
                                className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-gold-500/50 cursor-pointer"
                            >
                                <option value="Todos" className="bg-[#18181b]">Todos Status</option>
                                <option value="Elegíveis" className="bg-[#18181b]">Elegíveis</option>
                                <option value="Pendentes" className="bg-[#18181b]">Com Pendências</option>
                            </select>

                            {/* Período */}
                            <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg px-3 py-2">
                                <Clock size={14} className="text-zinc-500" />
                                <span className="text-[10px] font-bold text-zinc-500 uppercase mr-1">Faltando:</span>
                                <select
                                    value={filterPeriod}
                                    onChange={(e) => setFilterPeriod(Number(e.target.value))}
                                    className="bg-transparent text-xs text-white font-medium focus:outline-none cursor-pointer"
                                >
                                    {periodOptions.map(opt => (
                                        <option key={opt.value} value={opt.value} className="bg-[#18181b]">{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Limpar Filtros */}
                            {(searchTerm !== '' || filterGender !== 'Todos' || filterModality !== 'Todas' || filterStatus !== 'Todos' || filterPeriod !== 60) && (
                                <button
                                    onClick={() => {
                                        setSearchTerm('');
                                        setFilterGender('Todos');
                                        setFilterModality('Todas');
                                        setFilterStatus('Todos');
                                        setFilterPeriod(60);
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-400 hover:text-red-300 bg-red-400/10 rounded-lg border border-red-400/20 transition-colors"
                                >
                                    <X size={14} /> Limpar
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <p className="text-[10px] text-zinc-500 font-medium">
                            Mostrando <span className="text-zinc-300">{candidates.length}</span> prospectos encontrados
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {candidates.length > 0 ? candidates.map((candidate) => (
                        <RetirementCard
                            key={candidate.client.id}
                            candidate={candidate}
                            onClick={() => setSelectedCandidate(candidate)}
                            onUpdateClient={updateClient}
                            onOpenCnisDetails={(client, calc) => setCalculationDetail({ client, calc })}
                            onAddCnis={(client) => handleViewFullProfile(client.id, 'cnis')}
                            globalTrigger={globalTrigger}
                            activeHoverId={activeHoverId}
                            setActiveHoverId={setActiveHoverId}
                        />
                    )) : (
                        <div className="col-span-full py-16 text-center text-zinc-500 bg-[#0f1014] border border-dashed border-zinc-800 rounded-xl">
                            <p>Nenhum cliente próximo da aposentadoria (5 anos) sem processo ativo encontrado.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="w-full h-px bg-zinc-800 my-8"></div>


            {/* SEÇÃO 2: PROCESSOS EM ANDAMENTO */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Briefcase size={20} className="text-gold-500" />
                    Processos em Andamento
                </h3>

                <div className="bg-[#0f1117] border border-white/5 rounded-2xl shadow-2xl relative">
                    {/* Subtle gradient overlay to match premium look */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold-500/20 to-transparent" />

                    {activeRetirements.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-white/[0.02] border-b border-white/5">
                                        <th className="px-8 py-5 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Cliente / Identificação</th>
                                        <th className="px-6 py-5 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Processo / Detalhes</th>
                                        <th className="px-6 py-5 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Status Atual</th>
                                        <th className="px-8 py-5 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.03]">
                                    {activeRetirements.map(caseItem => {
                                        const client = clients.find(c => c.id === caseItem.client_id);
                                        const hasPendencias = client?.pendencias && client.pendencias.length > 0;

                                        // Status Configuration
                                        const getStatusConfig = (status: CaseStatus) => {
                                            switch (status) {
                                                case CaseStatus.ANALISE:
                                                    return { color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-500/20', dot: 'bg-blue-400' };
                                                case CaseStatus.CONCLUIDO_CONCEDIDO:
                                                    return { color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-500/20', dot: 'bg-emerald-400' };
                                                case CaseStatus.CONCLUIDO_INDEFERIDO:
                                                    return { color: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-500/20', dot: 'bg-rose-400' };
                                                default:
                                                    return { color: 'text-gold-500', bg: 'bg-gold-500/10', border: 'border-gold-500/20', dot: 'bg-gold-500' };
                                            }
                                        };
                                        const sCfg = getStatusConfig(caseItem.status);

                                        return (
                                            <tr key={caseItem.id} className="hover:bg-white/[0.02] transition-all duration-300 group">
                                                <td className="px-8 py-5">
                                                    <PendencyIndicator pendencies={client?.pendencias} align="left">
                                                        <div className="flex items-center gap-4 cursor-help">
                                                            <div className={`
                                                                w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-500 relative
                                                                ${hasPendencias
                                                                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-[0_0_10px_rgba(225,29,72,0.1)]'
                                                                    : 'bg-zinc-800 text-zinc-300 border border-zinc-700/50 group-hover:border-gold-500/30'
                                                                }
                                                            `}>
                                                                {client?.nome_completo.substring(0, 2).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-zinc-100 group-hover:text-gold-500 transition-colors duration-300 tracking-tight flex items-center gap-2">
                                                                    {client?.nome_completo}
                                                                </p>
                                                                <p className="text-[11px] text-zinc-500 font-mono mt-0.5 tracking-tighter">{client?.cpf_cnpj}</p>
                                                            </div>
                                                        </div>
                                                    </PendencyIndicator>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="p-2 rounded-lg bg-white/5 border border-white/5 text-zinc-400 group-hover:text-gold-500 transition-colors">
                                                            {caseItem.titulo.toLowerCase().includes('rural') ? <MapPin size={14} /> : <Briefcase size={14} />}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-semibold text-zinc-200">{caseItem.titulo}</p>
                                                            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{caseItem.numero_processo || 'S/N'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className={`
                                                        inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-xl
                                                        ${sCfg.bg} ${sCfg.color} ${sCfg.border} backdrop-blur-sm
                                                    `}>
                                                        <div className={`w-1.5 h-1.5 rounded-full ${sCfg.dot} shadow-[0_0_8px_currentColor] animate-pulse`} />
                                                        {caseItem.status}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <button
                                                        onClick={() => setSelectedCase(caseItem)}
                                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800/50 hover:bg-gold-500 text-zinc-400 hover:text-black font-bold text-[10px] uppercase tracking-widest transition-all duration-300 border border-white/5 hover:border-gold-400 group/btn"
                                                    >
                                                        <span>Detalhes</span>
                                                        <ChevronRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-20 text-center flex flex-col items-center justify-center gap-4 bg-white/[0.01]">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-zinc-700">
                                <Hourglass size={32} />
                            </div>
                            <div>
                                <h4 className="text-white font-bold opacity-80">Nenhuma Aposentadoria</h4>
                                <p className="text-zinc-500 text-sm mt-1">Não há processos de aposentadoria em andamento no momento.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL DETALHES CANDIDATO - VIA PORTAL */}
            {selectedCandidate && createPortal(
                <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-2 sm:p-6 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-[#09090b] border border-white/10 rounded-[32px] max-w-3xl w-full overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col md:flex-row h-fit max-h-[95vh] animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
                        {/* Left Side: Visual/Status */}
                        <div className="w-full md:w-2/5 bg-gradient-to-br from-zinc-800 to-zinc-950 p-8 flex flex-col items-center justify-center text-center relative border-r border-white/5">
                            <div className="absolute top-6 left-6 md:hidden">
                                <button onClick={() => setSelectedCandidate(null)} className="p-2 bg-white/5 rounded-full text-white/50 hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className={`w-32 h-32 rounded-3xl flex items-center justify-center text-4xl font-black shadow-2xl mb-6 border-4 border-white/10 ${selectedCandidate.yearsRemaining <= 0
                                ? 'bg-emerald-500 text-black shadow-emerald-500/20'
                                : (selectedCandidate.client.pendencias && selectedCandidate.client.pendencias.length > 0 ? 'bg-red-600 text-white animate-pulse' : 'bg-zinc-800 text-zinc-100')
                                }`}>
                                {selectedCandidate.client.nome_completo.substring(0, 2).toUpperCase()}
                            </div>

                            <h3 className="text-2xl font-black text-white leading-tight mb-2 uppercase tracking-tighter">{selectedCandidate.client.nome_completo}</h3>
                            <p className="text-zinc-400 font-mono text-xs tracking-widest bg-black/20 px-3 py-1 rounded-full border border-white/5">{selectedCandidate.client.cpf_cnpj}</p>

                            <div className="mt-8 pt-8 border-t border-white/5 w-full">
                                <span className={`text-xs font-black px-4 py-1.5 rounded-full border tracking-[0.2em] uppercase ${selectedCandidate.yearsRemaining <= 0
                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                    : 'bg-gold-500/10 text-gold-500 border-gold-500/20'}`}>
                                    {selectedCandidate.yearsRemaining <= 0 ? 'Elegível Agora' : 'Em Prospecção'}
                                </span>
                            </div>
                        </div>

                        {/* Right Side: Data/Actions */}
                        <div className="flex-1 p-8 sm:p-12 relative flex flex-col bg-[#09090b]">
                            <div className="absolute top-8 right-8 hidden md:block">
                                <button onClick={() => setSelectedCandidate(null)} className="p-2 hover:bg-white/5 rounded-full text-zinc-500 hover:text-white transition-all">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="flex-1 space-y-8">
                                <div>
                                    <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-4">Análise de Tempo</h4>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <p className="text-sm text-zinc-500 font-medium">Idade Atual</p>
                                            <p className="text-2xl font-black text-white">{selectedCandidate.age.years} anos</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm text-zinc-500 font-medium">Tempo Restante</p>
                                            <p className="text-2xl font-black text-emerald-400">{formatTimeRemaining(selectedCandidate.yearsRemaining)}</p>
                                        </div>
                                    </div>
                                    <div className="mt-6 p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-gold-500/10 text-gold-500">
                                                <Briefcase size={16} />
                                            </div>
                                            <span className="text-sm font-bold text-zinc-300">Modalidade Proposta</span>
                                        </div>
                                        <span className="text-sm font-black text-white uppercase tracking-wider">{selectedCandidate.bestChance}</span>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-4">Contato e Localização</h4>
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-3 group">
                                            <MapPin size={18} className="text-zinc-700 group-hover:text-gold-500 shrink-0 mt-0.5 transition-colors" />
                                            <p className="text-zinc-400 text-sm font-medium leading-relaxed">{selectedCandidate.client.endereco || 'Endereço não informado'}</p>
                                        </div>
                                        <div className="flex items-center gap-3 group">
                                            <Phone size={18} className="text-zinc-700 group-hover:text-emerald-500 shrink-0 transition-colors" />
                                            <p className="text-zinc-400 text-sm font-medium">{selectedCandidate.client.telefone || 'Sem telefone'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-12 flex gap-4">
                                {selectedCandidate.client.telefone && (
                                    <button
                                        onClick={() => handleWhatsAppClick(selectedCandidate.client.telefone)}
                                        className="flex-1 bg-[#25D366] hover:bg-[#22c35e] text-black h-14 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl shadow-emerald-500/10 active:scale-[0.98]"
                                    >
                                        <MessageCircle size={18} /> WhatsApp
                                    </button>
                                )}
                                <button
                                    onClick={() => handleViewFullProfile(selectedCandidate.client.id, 'cnis')}
                                    className="flex-1 bg-white/5 hover:bg-white/10 text-white h-14 rounded-2xl font-black text-xs uppercase tracking-widest border border-white/5 transition-all active:scale-[0.98]"
                                >
                                    Ver Cadastro
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* MODAL DETALHES DE CÁLCULO / CNIS */}
            {calculationDetail && (
                <div
                    onClick={() => setCalculationDetail(null)}
                    className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-[#09090b] border border-zinc-800 rounded-2xl max-w-lg w-full my-auto shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh]"
                    >
                        <div className="p-4 sm:p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 flex-shrink-0">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Calculator className="text-orange-500" /> Detalhamento do Cálculo
                            </h3>
                            <button onClick={() => setCalculationDetail(null)} className="text-zinc-500 hover:text-white transition-colors p-1 hover:bg-white/5 rounded"><X size={20} /></button>
                        </div>
                        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-xl font-bold text-zinc-300 flex-shrink-0">
                                    {(calculationDetail.client.nome_completo || '??').substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-bold text-white line-clamp-1">{calculationDetail.client.nome_completo}</p>
                                    <p className="text-xs text-zinc-500">Aposentadoria {calculationDetail.calc.type}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className={`p-4 rounded-xl border ${calculationDetail.calc.isAgeOk ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-zinc-900 border-zinc-800'}`}>
                                    <p className="text-[10px] font-bold text-zinc-500 uppercase mb-2">Critério: Idade</p>
                                    <div className="flex justify-between items-end">
                                        <span className="text-2xl font-bold text-white">{Math.floor(calculationDetail.calc.currentAge || 0)}a</span>
                                        <span className={`text-xs font-bold ${calculationDetail.calc.isAgeOk ? 'text-emerald-500' : 'text-zinc-500'}`}>
                                            Meta: {calculationDetail.calc.ageTarget}a
                                        </span>
                                    </div>
                                    <div className="mt-2 text-[10px] font-medium">
                                        {calculationDetail.calc.isAgeOk ? (
                                            <span className="text-emerald-500 flex items-center gap-1"><Check size={10} /> Requisito atingido</span>
                                        ) : (
                                            <span className="text-zinc-500 flex items-center gap-1"><Clock size={10} /> Falta {Math.max(0, calculationDetail.calc.ageTarget - Math.floor(calculationDetail.calc.currentAge || 0))} anos</span>
                                        )}
                                    </div>
                                </div>

                                <div className={`p-4 rounded-xl border ${calculationDetail.calc.isContributionOk ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-yellow-500/5 border-yellow-500/20'}`}>
                                    <p className="text-[10px] font-bold text-zinc-500 uppercase mb-2">Critério: Contribuição</p>
                                    <div className="flex justify-between items-end">
                                        <span className="text-2xl font-bold text-white">{calculationDetail.calc.currentContributionMonths || 0}m</span>
                                        <span className={`text-xs font-bold ${calculationDetail.calc.isContributionOk ? 'text-emerald-500' : 'text-yellow-500'}`}>
                                            Meta: {calculationDetail.calc.contributionTargetMonths}m
                                        </span>
                                    </div>
                                    <div className="mt-2 text-[10px] font-medium">
                                        {calculationDetail.calc.isContributionOk ? (
                                            <span className="text-emerald-500 flex items-center gap-1"><Check size={10} /> Requisito atingido</span>
                                        ) : (
                                            <span className="text-yellow-500 flex items-center gap-1"><AlertTriangle size={10} /> Falta {calculationDetail.calc.contributionTargetMonths - (calculationDetail.calc.currentContributionMonths || 0)} meses</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                                <h4 className="text-xs font-bold text-zinc-400 uppercase mb-3 flex items-center gap-2">
                                    <FileText size={12} /> Vínculos Extraídos do CNIS
                                </h4>
                                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                                    {calculationDetail.client.cnis_data?.bonds?.length ? calculationDetail.client.cnis_data.bonds.map(bond => (
                                        <div key={bond.id} className="text-[10px] flex justify-between items-center py-2.5 border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 px-2 rounded -mx-2 transition-colors">
                                            <span className="text-zinc-300 font-medium truncate flex-1 pr-4" title={bond.company}>{bond.company}</span>
                                            <span className="text-zinc-500 font-mono flex-shrink-0">{bond.durationString}</span>
                                        </div>
                                    )) : (
                                        <p className="text-[10px] text-zinc-600 text-center py-4">Nenhum vínculo detalhado encontrado.</p>
                                    )}
                                </div>
                            </div>

                            {!calculationDetail.calc.isContributionOk && (calculationDetail.calc.currentContributionMonths || 0) > 0 && (
                                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                                    <p className="text-xs text-yellow-500 leading-relaxed font-medium">
                                        <strong>Análise Técnica:</strong> O cliente não possui tempo suficiente para Aposentadoria Urbana. Recomenda-se verificar a possibilidade de <strong>Aposentadoria Híbrida</strong> se houver tempo rural comprovável.
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex flex-col sm:flex-row justify-end gap-3 flex-shrink-0">
                            <button onClick={() => { handleViewFullProfile(calculationDetail.client.id, 'cnis'); setCalculationDetail(null); }} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-bold transition-colors w-full sm:w-auto">Ver CNIS Completo</button>
                            <button onClick={() => setCalculationDetail(null)} className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold transition-colors w-full sm:w-auto">Fechar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DETALHES PROCESSO */}
            {selectedCase && (
                <CaseDetailsModal
                    caseItem={selectedCase}
                    onClose={() => setSelectedCase(null)}
                    onSelectCase={setSelectedCase}
                    onViewClient={(clientId) => {
                        setClientToView(clientId);
                        setCurrentView('clients');
                        setSelectedCase(null);
                    }}
                />
            )}
        </div>
    );
};

export default Retirements;

