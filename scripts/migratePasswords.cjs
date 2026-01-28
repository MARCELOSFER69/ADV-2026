const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');
const { encryptData, decryptData } = require('../utils/cryptoUtils.cjs');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Erro: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são necessários no .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function migrate() {
    console.log('🔍 Iniciando migração de senhas...');

    const { data: clients, error } = await supabase
        .from('clients')
        .select('*');

    if (error) {
        console.error('❌ Erro ao buscar clientes:', error);
        return;
    }

    console.log(`📊 Encontrados ${clients.length} clientes. Verificando senhas...`);

    let updatedCount = 0;

    for (const client of clients) {
        let needsUpdate = false;
        const updates = {};

        // Verificar senha_gov
        if (client.senha_gov !== undefined && client.senha_gov !== null && client.senha_gov.trim().length > 0) {
            const decrypted = await decryptData(client.senha_gov);
            if (decrypted === client.senha_gov) {
                console.log(`🔒 Criptografando senha_gov de ${client.nome_completo}...`);
                updates.senha_gov = await encryptData(client.senha_gov);
                needsUpdate = true;
            }
        }

        // Verificar senha_inss (apenas se a coluna existir no objeto retornado)
        if (client.senha_inss !== undefined && client.senha_inss !== null && client.senha_inss.trim().length > 0) {
            const decrypted = await decryptData(client.senha_inss);
            if (decrypted === client.senha_inss) {
                console.log(`🔒 Criptografando senha_inss de ${client.nome_completo}...`);
                updates.senha_inss = await encryptData(client.senha_inss);
                needsUpdate = true;
            }
        }

        if (needsUpdate) {
            const { error: updateError } = await supabase
                .from('clients')
                .update(updates)
                .eq('id', client.id);

            if (updateError) {
                console.error(`❌ Erro ao atualizar cliente ${client.nome_completo}:`, updateError);
            } else {
                updatedCount++;
            }
        }
    }

    console.log(`\n✅ Migração concluída! ${updatedCount} clientes foram atualizados.`);
}

migrate();
