const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function run() {
    console.log('Verificando/Adicionando coluna access_whatsapp...');
    const { error } = await supabase.rpc('run_sql', {
        sql: 'ALTER TABLE user_permissions ADD COLUMN IF NOT EXISTS access_whatsapp BOOLEAN DEFAULT TRUE;'
    });

    if (error) {
        console.error('Erro ao executar SQL via RPC:', error);
        console.log('Tentando via query direta (se permitido)...');
        // Se o RPC não existir, o usuário precisará rodar no dashboard
        console.log('Por favor, execute o seguinte SQL no SQL Editor do Supabase:');
        console.log('ALTER TABLE user_permissions ADD COLUMN IF NOT EXISTS access_whatsapp BOOLEAN DEFAULT TRUE;');
    } else {
        console.log('Coluna access_whatsapp garantida com sucesso!');
    }
}

run();
