import { useMemo } from 'react';
import { useAllCases } from './useCases';
import { useAllClients } from './useClients';
import { CaseType, CaseStatus, ProjectFilters, RetirementCandidate } from '../types';

export const useRetirementProjections = (filters: ProjectFilters) => {
    const { data: cases = [] } = useAllCases();
    const { data: clients = [] } = useAllClients();

    const candidates = useMemo(() => {
        // Find clients who ALREADY have an active retirement process
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
                const preferredMode = client.aposentadoria_modalidade;

                const ruralTarget = isMale ? 60 : 55;
                const urbanTarget = isMale ? 65 : 62;

                const ruralRemaining = Math.max(0, ruralTarget - years - (months / 12));
                const urbanRemaining = Math.max(0, urbanTarget - years - (months / 12));

                const bestChance = ruralRemaining <= urbanRemaining ? 'Rural' : 'Urbana';
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
            .filter(c => {
                // Search term (Name or CPF)
                if (filters.searchTerm) {
                    const searchLower = filters.searchTerm.toLowerCase();
                    const matchesSearch = c.client.nome_completo.toLowerCase().includes(searchLower) ||
                        c.client.cpf_cnpj?.includes(filters.searchTerm);
                    if (!matchesSearch) return false;
                }

                // Gender
                if (filters.gender !== 'Todos') {
                    if (c.client.sexo !== filters.gender) return false;
                }

                // Modality
                const modalidadeAtual = c.client.aposentadoria_modalidade || c.bestChance;
                if (filters.modality !== 'Todas') {
                    if (filters.modality === 'Híbrida') {
                        // Lógica para sugestão de Híbrida: Urbana mas Rural é melhor/próxima
                        const isHybridSuggested = modalidadeAtual === 'Urbana' && c.urbanRemaining > 0 && c.ruralRemaining < c.urbanRemaining;
                        if (!isHybridSuggested && c.client.aposentadoria_modalidade !== 'Híbrida') return false;
                    } else if (modalidadeAtual !== filters.modality) {
                        return false;
                    }
                }

                // Status (Eligible / Pending)
                if (filters.status !== 'Todos') {
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

                    if (filters.status === 'Elegíveis' && !isEligible) return false;
                    if (filters.status === 'Pendentes' && !hasPendencias) return false;
                }

                // Years Remaining (Period)
                if (c.yearsRemaining > filters.period / 12) return false;

                // Branch
                if (filters.branch !== 'Todas') {
                    if (c.client.filial !== filters.branch) return false;
                }

                return true;
            })
            .sort((a, b) => a.yearsRemaining - b.yearsRemaining);
    }, [clients, cases, filters]);

    return { candidates, isLoading: false }; // isLoading could be hooked to useAllCases/useAllClients states
};
