import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    let queryAll = supabase.from('view_clients_dashboard').select('*', { count: 'exact', head: true });
    const resAll = await queryAll;
    console.log("Total rows in DB:", resAll.count);
    
    let queryNotArchived = supabase.from('view_clients_dashboard').select('*', { count: 'exact', head: true });
    queryNotArchived = queryNotArchived.not('status', 'ilike', 'arquivado');
    const resNotArchived = await queryNotArchived;
    console.log("Total rows NOT archived (not ilike):", resNotArchived.count);

    let queryNotArchivedEq = supabase.from('view_clients_dashboard').select('*', { count: 'exact', head: true });
    queryNotArchivedEq = queryNotArchivedEq.neq('status', 'arquivado');
    const resNotArchivedEq = await queryNotArchivedEq;
    console.log("Total rows NOT archived (neq):", resNotArchivedEq.count);

    let queryStatusNull = supabase.from('view_clients_dashboard').select('*', { count: 'exact', head: true });
    queryStatusNull = queryStatusNull.is('status', null);
    const resStatusNull = await queryStatusNull;
    console.log("Total rows with status NULL:", resStatusNull.count);
}
run();
