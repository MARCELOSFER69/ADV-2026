require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testUpdate() {
    console.log("🕵️ Iniciando teste de escrita no banco...");

    // 1. Buscar um cliente que sabemos que existe (pelo RGP do print)
    // RGP do print: MAPA04976502317
    const { data: clients, error: searchError } = await supabase
        .from('clients')
        .select('id, nome_completo, rgp_numero, rgp_local_exercicio, rgp_data_primeiro')
        .ilike('rgp_numero', '%04976502317%') // Busca flexível
        .limit(1);

    if (searchError || !clients || clients.length === 0) {
        console.error("❌ Erro ao buscar cliente teste (ou não encontrado):", searchError);
        return;
    }

    const client = clients[0];
    console.log(`✅ Cliente encontrado: ${client.nome_completo} (ID: ${client.id})`);
    console.log(`📊 Dados atuais: Exercicio='${client.rgp_local_exercicio}', Data='${client.rgp_data_primeiro}'`);

    // 2. Tentar atualizar as colunas "problemáticas"
    const updatePayload = {
        rgp_local_exercicio: 'TESTE_DEBUG_ROBO_RIO',
        rgp_data_primeiro: '01/01/2026'
        // updated_at removido para teste de cache
    };

    console.log("💾 Tentando atualizar com:", updatePayload);

    const { data: updated, error: updateError } = await supabase
        .from('clients')
        .update(updatePayload)
        .eq('id', client.id)
        .select();

    if (updateError) {
        console.error("❌ FALHA AO ATUALIZAR:", updateError);
    } else {
        console.log("✅ Atualização bem sucedida!");
        console.log("📝 Dados retornados:", updated);
    }
}

testUpdate();
