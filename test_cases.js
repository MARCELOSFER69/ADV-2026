import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("-------------------")
    console.log("1. Checking 'cases' table directly for tenant_id...");
    const { data: casesData, error: casesError } = await supabase.from('cases').select('id, titulo, tenant_id').limit(5);
    if (casesError) console.error("Error cases:", casesError);
    else console.log("Cases 5 rows:", casesData);

    console.log("-------------------")
    console.log("2. Checking 'view_cases_dashboard' for tenant_id...");
    const { data: viewData, error: viewError } = await supabase.from('view_cases_dashboard').select('id, titulo_unaccent, tenant_id').limit(5);
    if (viewError) console.error("Error view:", viewError);
    else console.log("View 5 rows:", viewData);
    
    console.log("-------------------")
    console.log("3. Counting cases with tenant_id IS NULL...");
    const { count: nullCount } = await supabase.from('cases').select('*', { count: 'exact', head: true }).is('tenant_id', null);
    console.log(`Cases with NULL tenant_id: ${nullCount}`);

    console.log("-------------------")
    console.log("4. Counting cases with tenant_id = 'principal'...");
    const { count: princCount } = await supabase.from('cases').select('*', { count: 'exact', head: true }).eq('tenant_id', 'principal');
    console.log(`Cases with 'principal' tenant_id: ${princCount}`);
}
run();
