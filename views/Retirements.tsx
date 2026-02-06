
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { useAllCases } from '../hooks/useCases';
import { useAllClients } from '../hooks/useClients';
import { CaseType, CaseStatus, Client, Case, Branch } from '../types';
import { Hourglass, ChevronRight, Briefcase, MapPin, AlertCircle, X, Search, Filter, Clock } from 'lucide-react';
import CaseDetailsModal from '../components/modals/CaseDetailsModal';
import PendencyIndicator from '../components/ui/PendencyIndicator';
import { RetirementCard, RetirementCandidate, DetailedCalculation } from '../components/retirement/RetirementCard';
import { RetirementCandidateModal } from '../components/retirement/RetirementCandidateModal';
import { RetirementCalculationDetails } from '../components/retirement/RetirementCalculationDetails';
import BranchSelector from '../components/Layout/BranchSelector';


const Retirements: React.FC = () => {
    const { showToast, setCurrentView, setClientToView, updateClient, globalBranchFilter } = useApp();
    const { data: cases = [] } = useAllCases();
    const { data: clients = [] } = useAllClients();
    const [selectedCase, setSelectedCase] = useState<Case | null>(null);
    const [selectedCandidate, setSelectedCandidate] = useState<RetirementCandidate | null>(null);
    const [calculationDetail, setCalculationDetail] = useState<{ client: Client, calc: DetailedCalculation } | null>(null);

    // Estados dos Filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [filterGender, setFilterGender] = useState<'Todos' | 'Masculino' | 'Feminino'>('Todos');
    const [filterModality, setFilterModality] = useState<'Todas' | 'Rural' | 'Urbana'>('Todas');
    const [filterStatus, setFilterStatus] = useState<'Todos' | 'Elegíveis' | 'Pendentes'>('Todos');
    const [filterPeriod, setFilterPeriod] = useState<number>(60); // Default 5 anos (60 meses)
    const [filterBranch, setFilterBranch] = useState<Branch | 'Todas'>('Todas');
    const [globalTrigger, setGlobalTrigger] = useState(0);
    const [activeHoverId, setActiveHoverId] = useState<string | null>(null);

    // Sincroniza filtro global de filial
    React.useEffect(() => {
        if (globalBranchFilter !== 'all') {
            setFilterBranch(globalBranchFilter as Branch);
        } else {
            setFilterBranch('Todas');
        }
    }, [globalBranchFilter]);

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
    const activeRetirements = cases.filter(c => {
        const client = clients.find(cl => cl.id === c.client_id);
        const matchesBranch = filterBranch === 'Todas' || client?.filial === filterBranch;

        return c.tipo === CaseType.APOSENTADORIA &&
            c.status !== CaseStatus.ARQUIVADO &&
            matchesBranch;
    });

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

                // Filtro de Filial
                const matchesBranch = filterBranch === 'Todas' || c.client.filial === filterBranch;

                return matchesSearch && matchesGender && matchesModality && matchesStatus && matchesPeriod && matchesBranch;
            })
            .sort((a, b) => a.yearsRemaining - b.yearsRemaining);
    }, [clients, cases, searchTerm, filterGender, filterModality, filterStatus, filterPeriod, filterBranch]);

    const handleWhatsAppClick = (phone: string | undefined) => {
        if (!phone) return;
        const cleanNumber = phone.replace(/\D/g, '');
        const fullNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;
        window.open(`https://wa.me/${fullNumber}`, '_blank');
    };

    const handleViewFullProfile = (clientId: string, tab?: 'info' | 'docs' | 'credentials' | 'history' | 'cnis' | 'rgp') => {
        setClientToView(clientId, tab as any);
        setCurrentView('clients');
    };

    return (
        <div className="h-full overflow-y-auto custom-scrollbar space-y-8 pb-10 pr-2">
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
                <div className="flex items-center gap-3">
                    <BranchSelector />
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

                            {/* Filial */}
                            <select
                                value={filterBranch}
                                onChange={(e) => setFilterBranch(e.target.value as any)}
                                className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-gold-500/50 cursor-pointer"
                            >
                                <option value="Todas" className="bg-[#18181b]">Todas as Filiais</option>
                                {Object.values(Branch).map(branch => (
                                    <option key={branch} value={branch} className="bg-[#18181b]">{branch}</option>
                                ))}
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
                            {(searchTerm !== '' || filterGender !== 'Todos' || filterModality !== 'Todas' || filterStatus !== 'Todos' || filterPeriod !== 60 || filterBranch !== 'Todas') && (
                                <button
                                    onClick={() => {
                                        setSearchTerm('');
                                        setFilterGender('Todos');
                                        setFilterModality('Todas');
                                        setFilterStatus('Todos');
                                        setFilterPeriod(60);
                                        setFilterBranch('Todas');
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
                <RetirementCandidateModal
                    selectedCandidate={selectedCandidate}
                    onClose={() => setSelectedCandidate(null)}
                    onWhatsAppClick={handleWhatsAppClick}
                    onViewFullProfile={(clientId, tab) => handleViewFullProfile(clientId, tab)}
                />,
                document.body
            )}

            {/* MODAL DETALHES DE CÁLCULO / CNIS */}
            {calculationDetail && createPortal(
                <RetirementCalculationDetails
                    client={calculationDetail.client}
                    calc={calculationDetail.calc}
                    onClose={() => setCalculationDetail(null)}
                    onViewFullProfile={(clientId, tab) => handleViewFullProfile(clientId, tab as any)}
                />,
                document.body
            )}

            {/* MODAL DETALHES PROCESSO */}
            {selectedCase && (
                <CaseDetailsModal
                    caseItem={selectedCase}
                    onClose={() => setSelectedCase(null)}
                    onViewClient={(clientId) => {
                        handleViewFullProfile(clientId);
                        setSelectedCase(null);
                    }}
                />
            )}
        </div>
    );
};

export default Retirements;
