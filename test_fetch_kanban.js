import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Simulating fetchKanbanCases...");
    let query = supabase
        .from('view_cases_dashboard')
        .select('id, tipo, modalidade, titulo, numero_processo, status, valor_causa, client_id, data_abertura, client_name, client_cpf, filial, client_birth_date, client_sexo')
        .eq('tenant_id', 'principal')
        .neq('status', 'Arquivado')
        .limit(2);

    const { data, error } = await query;
    
    if (error) {
        console.error("KANBAN FETCH ERROR:", error);
    } else {
        console.log("KANBAN FETCH SUCCESS! Got rows:", data.length);
        console.log(data);
    }
}
run();
