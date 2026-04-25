import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Simulating clients fetch...");
    let query = supabase.from('view_clients_dashboard').select('*', { count: 'exact' });
    
    // Tenant filter as in code
    // query = query.eq('tenant_id', 'principal');

    console.log("Adding regular filters");
    query = query.not('status', 'ilike', 'arquivado');
    query = query.eq('status_calculado', 'Ativo');

    console.log("Executing query...");
    const { data, count, error } = await query.range(0, 10);
    
    if (error) {
        console.error("ERROR:", error.message, error.details);
    } else {
        console.log("SUCCESS! Row count:", data.length, "Total:", count);
    }
}
run();
