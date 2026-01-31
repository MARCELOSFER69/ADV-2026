
import { supabase } from './supabaseClient';

export interface RetirementCalculation {
    id?: string;
    client_id: string;
    calculation_data: any;
    estimated_value?: number;
    ready_for_process?: boolean;
    promoted_to_case_id?: string;
    created_at?: string;
    updated_at?: string;
}

export const retirementService = {
    async saveCalculation(calc: RetirementCalculation) {
        const { data, error } = await supabase
            .from('retirement_calculations')
            .insert([calc])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async getByClient(clientId: string): Promise<RetirementCalculation[]> {
        const { data, error } = await supabase
            .from('retirement_calculations')
            .select('*')
            .eq('client_id', clientId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async promoteToCase(calculationId: string, caseId: string) {
        const { error } = await supabase
            .from('retirement_calculations')
            .update({ promoted_to_case_id: caseId, ready_for_process: true })
            .eq('id', calculationId);
        if (error) throw error;
    }
};
