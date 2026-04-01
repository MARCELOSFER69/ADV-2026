import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Erro: SUPABASE_URL e SUPABASE_KEY devem estar no arquivo .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function archiveCases() {
    console.log('--- Iniciando arquivamento de processos de clientes arquivados ---\n');

    try {
        // 1. Buscar todos os IDs de clientes arquivados
        const { data: archivedClients, error: clientError } = await supabase
            .from('clients')
            .select('id, nome_completo')
            .eq('status', 'arquivado');

        if (clientError) throw clientError;

        if (!archivedClients || archivedClients.length === 0) {
            console.log('Nenhum cliente arquivado encontrado.');
            return;
        }

        const clientIds = archivedClients.map(c => c.id);
        console.log(`Encontrados ${archivedClients.length} clientes arquivados.`);

        // 2. Buscar processos desses clientes que NÃO estão arquivados
        // Fazemos em blocos para evitar limites de cláusula IN (URL muito longa)
        console.log('Buscando processos ativos...');
        const casesToArchive = [];
        const chunkSize = 100;

        for (let i = 0; i < clientIds.length; i += chunkSize) {
            const chunk = clientIds.slice(i, i + chunkSize);
            const { data, error } = await supabase
                .from('cases')
                .select('id, numero_processo, titulo, status, client_id')
                .in('client_id', chunk)
                .not('status', 'eq', 'Arquivado');

            if (error) {
                console.error('Erro ao buscar processes no chunk:', error);
                continue;
            }

            if (data) casesToArchive.push(...data);
        }

        if (casesToArchive.length === 0) {
            console.log('Nenhum processo ativo encontrado para clientes arquivados.');
            return;
        }

        console.log(`Encontrados ${casesToArchive.length} processos para arquivar.`);

        // 3. Executar o arquivamento dos processos
        const caseIds = casesToArchive.map(c => c.id);

        console.log('\nExemplos de processos que serão arquivados:');
        casesToArchive.slice(0, 10).forEach(c => {
            const client = archivedClients.find(cl => cl.id === c.client_id);
            console.log(`- ${client?.nome_completo || 'Unknown'}: ${c.titulo} (${c.status})`);
        });

        // Atualização em chunks também para seguranca
        console.log('\nAtualizando status dos processos...');
        for (let i = 0; i < caseIds.length; i += chunkSize) {
            const chunk = caseIds.slice(i, i + chunkSize);
            const { error } = await supabase
                .from('cases')
                .update({
                    status: 'Arquivado',
                    updated_at: new Date().toISOString()
                })
                .in('id', chunk);

            if (error) {
                console.error('Erro ao atualizar chunk de processos:', error);
            }
        }

        console.log(`\n[OK] Sucesso: Processamento concluído.`);

    } catch (err) {
        console.error('Erro durante o processo:', err.message);
    }
}

archiveCases();
