import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchClientsData, fetchAllClientsData, fetchClientById } from '../services/clientsService';
import { Client } from '../types';

interface UseClientsFilters {
    search?: string;
    filial?: string;
    captador?: string;
    city?: string;
    sexo?: string;
    status?: string;
    pendencia?: string;
    sortKey?: string;
    sortDirection?: 'asc' | 'desc';
    [key: string]: any;
}

interface UseClientsProps {
    page: number;
    perPage: number;
    filters: UseClientsFilters;
}

/**
 * Custom hook para carregar clientes de forma otimizada usando React Query.
 * Desacopla o carregamento do AppContext e gerencia cache/estados de loading.
 */
export const useClients = ({ page, perPage, filters }: UseClientsProps) => {
    const { search, ...restFilters } = filters;

    const { data, isLoading, error, isPlaceholderData, refetch } = useQuery({
        queryKey: ['clients', page, perPage, filters],
        queryFn: () => fetchClientsData(page, perPage, search, restFilters),
        placeholderData: keepPreviousData,
    });

    return {
        data: (data?.data as Client[]) || [],
        isLoading: isLoading || (isPlaceholderData && !data), // Mantém loading se não houver dados anteriores
        error,
        totalCount: (data?.count as number) || 0,
        isPlaceholderData,
        refetch
    };
};

// ... existing code ...
export const useAllClients = () => {
    return useQuery({
        queryKey: ['clients', 'all'],
        queryFn: fetchAllClientsData,
        staleTime: 1000 * 60 * 10, // 10 minutes
    });
};

export const useClient = (id: string | undefined) => {
    return useQuery({
        queryKey: ['client', id],
        queryFn: () => fetchClientById(id!),
        enabled: !!id,
    });
};
