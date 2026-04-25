const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function run() {
    try {
        const env = fs.readFileSync('.env', 'utf8');
        const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
        const keyMatch = env.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=(.*)/) || env.match(/VITE_SUPABASE_ANON_KEY=(.*)/);
        
        const url = urlMatch ? urlMatch[1].trim() : null;
        const key = keyMatch ? keyMatch[1].trim() : null;

        if (!url || !key) {
            console.error("Missing URL or KEY");
            return;
        }

        const supabase = createClient(url, key, {
            auth: { persistSession: false }
        });

        const sql = `
            CREATE OR REPLACE VIEW view_cases_dashboard AS
            SELECT 
                cs.*,
                c.nome_completo AS client_name,
                unaccent(c.nome_completo) AS client_name_unaccent,
                c.cpf_cnpj AS client_cpf,
                c.data_nascimento AS client_birth_date,
                c.sexo AS client_sexo,
                c.captador AS captador,
                c.cidade AS client_city,
                unaccent(cs.titulo) AS titulo_unaccent,
                COALESCE(cs.filial, c.filial, 'Indefinida') AS filial
            FROM cases cs
            LEFT JOIN clients c ON cs.client_id = c.id;
        `;

        // Using Supabase RPC to execute SQL or we just write SQL locally and run it via Supabase if possible.
        // Wait, running raw SQL via JS SDK requires an RPC. If there's no exec_sql RPC, it won't work.
    } catch(e) {
        console.error(e);
    }
}
run();
