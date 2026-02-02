import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchCasesData, fetchAllCasesData, fetchCaseById } from '../services/casesService';
import { Case } from '../types';

interface UseCasesFilters {
    search?: string;
    tipo?: string;
    status?: string;
    category?: 'Judicial' | 'Administrativo' | 'Seguro Defeso' | 'Todos';
    viewMode?: 'active' | 'archived';
    sortKey?: string;
    sortDirection?: 'asc' | 'desc';
    [key: string]: any;
}

/**
 * Custom hook para carregar processos de forma otimizada usando React Query.
 */
export const useCases = (page: number, perPage: number, filters: UseCasesFilters) => {
    const { search, ...restFilters } = filters;

    const { data, isLoading, error, isPlaceholderData, refetch } = useQuery({
        queryKey: ['cases', page, filters],
        queryFn: () => fetchCasesData(page, perPage, search, restFilters),
        placeholderData: keepPreviousData,
    });

    return {
        data: (data?.data as Case[]) || [],
        isLoading: isLoading || (isPlaceholderData && !data),
        error,
        totalCount: (data?.count as number) || 0,
        isPlaceholderData,
        refetch
    };
};

// ... existing code ...
export const useAllCases = () => {
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['cases', 'all'],
        queryFn: () => fetchAllCasesData(),
    });

    return {
        data: (data as Case[]) || [],
        isLoading: isLoading,
        error,
        refetch
    };
};

export const useCase = (id: string | undefined) => {
    return useQuery({
        queryKey: ['case', id],
        queryFn: () => fetchCaseById(id!),
        enabled: !!id,
    });
};

export const useKanbanCases = () => {
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['cases', 'kanban'],
        queryFn: () => import('../services/casesService').then(m => m.fetchKanbanCases()),
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    });

    return {
        data: (data as Case[]) || [],
        isLoading: isLoading,
        error,
        refetch
    };
};
