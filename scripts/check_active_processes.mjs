import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('--- Buscando clientes arquivados com processos ativos ---');

    const terminal = ['Arquivado', 'Concluído (Concedido)', 'Concluído (Indeferido)', 'Concluido (Concedido)', 'Concluido (Indeferido)'];

    try {
        // 1. Pega todos os processos que NÃO são terminais
        const { data: activeCases, error: caseError } = await supabase
            .from('cases')
            .select('numero_processo, titulo, status, client_id')
            .not('status', 'in', `(${terminal.join(',')})`);

        if (caseError) {
            console.error('Erro ao buscar processos:', caseError);
            return;
        }

        console.log(`Encontrados ${activeCases.length} processos com status "ativo".`);

        // 2. Extrai IDs únicos de clientes
        const clientIds = [...new Set(activeCases.map(c => c.client_id))];

        // 3. Verifica quais desses clientes estão arquivados
        const archivedWithActive = [];
        const chunkSize = 100;
        for (let i = 0; i < clientIds.length; i += chunkSize) {
            const chunk = clientIds.slice(i, i + chunkSize);
            const { data: clients, error: clientError } = await supabase
                .from('clients')
                .select('id, nome_completo, cpf_cnpj, status')
                .in('id', chunk)
                .eq('status', 'arquivado');

            if (clientError) {
                console.error('Erro ao buscar clientes:', clientError);
                continue;
            }

            if (clients) archivedWithActive.push(...clients);
        }

        console.log(`\nTotal de clientes arquivados com processos ativos: ${archivedWithActive.length}\n`);

        if (archivedWithActive.length > 0) {
            archivedWithActive.forEach(client => {
                const clientCases = activeCases.filter(c => c.client_id === client.id);
                console.log(`Cliente: ${client.nome_completo} (${client.cpf_cnpj})`);
                clientCases.forEach(cs => {
                    console.log(`  - Case: ${cs.numero_processo || 'S/N'} | ${cs.titulo} | Status: ${cs.status}`);
                });
                console.log('---');
            });
        } else {
            console.log('Nenhum cliente arquivado possui processos ativos no momento.');
        }
    } catch (err) {
        console.error('Erro inesperado:', err.message);
    }
}

check();
