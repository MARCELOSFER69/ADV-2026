import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchFinancialRecords, FinancialFilters } from '../services/financialService';
import { FinancialRecord } from '../types';

interface UseFinancialProps {
    periodMode: 'month' | 'year' | 'all';
    selectedDate: Date;
    filters?: FinancialFilters;
    enabled?: boolean;
}

export const useFinancial = ({ periodMode, selectedDate, filters = {}, enabled = true }: UseFinancialProps) => {
    // Calcular Start e End Date baseados no modo
    const getDates = () => {
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth(); // 0-indexed

        let startDate = '';
        let endDate = '';

        if (periodMode === 'month') {
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0); // Último dia do mês
            startDate = firstDay.toISOString().split('T')[0];
            endDate = lastDay.toISOString().split('T')[0];
        } else if (periodMode === 'year') {
            const firstDay = new Date(year, 0, 1);
            const lastDay = new Date(year, 11, 31);
            startDate = firstDay.toISOString().split('T')[0];
            endDate = lastDay.toISOString().split('T')[0];
        } else {
            // 'all' - definindo um range bem amplo ou lidando no service
            // Para 'all', passamos datas extremas ou o service trata.
            // Vamos passar datas "infinitas" práticas.
            startDate = '1900-01-01';
            endDate = '2100-12-31';
        }

        return { startDate, endDate };
    };

    const { startDate, endDate } = getDates();

    const { data, isLoading, error, refetch, isPlaceholderData } = useQuery({
        queryKey: ['financial', periodMode, startDate, endDate, filters],
        queryFn: () => fetchFinancialRecords(startDate, endDate, filters),
        placeholderData: keepPreviousData,
        enabled: enabled,
        staleTime: 1000 * 60 * 5, // Cache por 5 minutos
    });

    const { data: summaryData } = useQuery({
        queryKey: ['financial_summary', periodMode, startDate, endDate],
        queryFn: () => import('../services/financialService').then(m => m.fetchFinancialSummary(startDate, endDate)),
        enabled: enabled,
        staleTime: 1000 * 60 * 10, // Cache por 10 minutos
    });

    return {
        data: (data as FinancialRecord[]) || [],
        summary: summaryData,
        isLoading,
        error,
        refetch,
        isPlaceholderData
    };
};
