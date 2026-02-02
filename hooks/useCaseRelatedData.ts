import { useQuery } from '@tanstack/react-query';
import { fetchFinancialsByCaseId } from '../services/financialService';
import { fetchCaseEvents, fetchCaseTasks } from '../services/casesService';
import { FinancialRecord, Event, Task } from '../types';

export const useCaseRelatedData = (caseId: string) => {
    // 1. Financeiro do Caso
    const {
        data: financials = [],
        isLoading: isLoadingFinancials,
        refetch: refetchFinancials
    } = useQuery({
        queryKey: ['case_financials', caseId],
        queryFn: () => fetchFinancialsByCaseId(caseId),
        enabled: !!caseId
    });

    // 2. Eventos do Caso
    const {
        data: events = [],
        isLoading: isLoadingEvents,
        refetch: refetchEvents
    } = useQuery({
        queryKey: ['case_events', caseId],
        queryFn: (() => fetchCaseEvents(caseId)) as any,
        enabled: !!caseId
    });

    // 3. Tarefas do Caso
    const {
        data: tasks = [],
        isLoading: isLoadingTasks,
        refetch: refetchTasks
    } = useQuery({
        queryKey: ['case_tasks', caseId],
        queryFn: (() => fetchCaseTasks(caseId)) as any,
        enabled: !!caseId
    });

    return {
        financials: financials as FinancialRecord[],
        events: events as Event[],
        tasks: tasks as Task[],
        isLoading: isLoadingFinancials || isLoadingEvents || isLoadingTasks,
        refetchAll: () => {
            refetchFinancials();
            refetchEvents();
            refetchTasks();
        },
        refetchFinancials,
        refetchEvents,
        refetchTasks
    };
};
