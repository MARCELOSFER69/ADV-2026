import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check(tableName, queryStr = '*') {
    console.log(`Checking query on '${tableName}' with select('${queryStr}')...`);
    const { data, error } = await supabase.from(tableName).select(queryStr).limit(1);
    if (error) {
        console.error(`❌ Error on '${tableName}':`, error.message, JSON.stringify(error));
    } else {
        console.log(`✅ Success on '${tableName}'! Data:`, data);
    }
}

async function run() {
    await check('cases');
    await check('case_installments');
    await check('financial_records');
    try {
        await check('audit_logs');
    } catch(e) { console.error(e); }
    try {
        await check('case_history');
    } catch(e) { console.error(e); }
}
run();
