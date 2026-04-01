import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Erro: SUPABASE_URL e SUPABASE_KEY devem estar no arquivo .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function bulkArchive(lines, reason = 'Arquivamento em massa via script', dryRun = false) {
    console.log(`\n--- Iniciando ${dryRun ? 'DRY-RUN' : 'ARQUIVAMENTO'} para ${lines.length} entradas ---\n`);

    const results = {
        archived: [],
        notFound: [],
        multipleFound: [],
        errors: []
    };

    for (const line of lines) {
        if (!line.trim()) continue;

        // Tenta separar Nome e CPF (formato: Nome <TAB> CPF ou Nome <ESPAÇO> CPF)
        let name = line.trim();
        let cpf = null;

        if (line.includes('\t')) {
            const parts = line.split('\t');
            name = parts[0].trim();
            cpf = parts[1]?.trim()?.replace(/\D/g, '');
        } else {
            // Tenta detectar CPF no final da linha (11 dígitos ou formato com pontos/traço)
            const cpfMatch = line.match(/(\d{3}\.?\d{3}\.?\d{3}-?\d{2})$/);
            if (cpfMatch) {
                cpf = cpfMatch[0].replace(/\D/g, '');
                name = line.replace(cpfMatch[0], '').trim();
            }
        }

        try {
            let clients = [];
            let error = null;

            if (cpf && cpf.length === 11) {
                // Formata CPF para o padrão do banco (000.000.000-00)
                const formattedCpf = cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
                const res = await supabase
                    .from('clients')
                    .select('id, nome_completo, status, cpf_cnpj')
                    .or(`cpf_cnpj.eq.${cpf},cpf_cnpj.eq.${formattedCpf}`);
                clients = res.data;
                error = res.error;
            } else {
                const res = await supabase
                    .from('clients')
                    .select('id, nome_completo, status, cpf_cnpj')
                    .ilike('nome_completo', `%${name}%`);
                clients = res.data;
                error = res.error;
            }

            if (error) throw error;

            if (!clients || clients.length === 0) {
                results.notFound.push(line);
                console.log(`[!] Não encontrado: ${line}`);
            } else if (clients.length > 1) {
                // Tenta encontrar um match exato por nome se não usou CPF
                const exactMatch = clients.find(c => c.nome_completo.toLowerCase() === name.toLowerCase());
                if (exactMatch) {
                    await processClient(exactMatch, name, reason, dryRun, results);
                } else {
                    results.multipleFound.push({ line, found: clients.map(c => `${c.nome_completo} (${c.cpf_cnpj})`) });
                    console.log(`[?] Múltiplos encontrados para "${line}": ${clients.map(c => c.nome_completo).join(', ')}`);
                }
            } else {
                await processClient(clients[0], name, reason, dryRun, results);
            }
        } catch (err) {
            results.errors.push({ line, error: err.message });
            console.error(`[X] Erro ao processar "${name}":`, err.message);
        }
    }

    console.log('\n--- Resumo ---');
    console.log(`Processados (Arquivados ou já estavam): ${results.archived.length}`);
    console.log(`Não encontrados: ${results.notFound.length}`);
    console.log(`Múltiplos/Ambiguidade: ${results.multipleFound.length}`);
    console.log(`Erros: ${results.errors.length}`);

    return results;
}

async function processClient(client, originalName, reason, dryRun, results) {
    if (client.status === 'arquivado') {
        console.log(`[-] Já arquivado: ${client.nome_completo}`);
        results.archived.push(client.nome_completo);
        return;
    }

    if (dryRun) {
        console.log(`[DRY] Seria arquivado: ${client.nome_completo}`);
    } else {
        const { error } = await supabase
            .from('clients')
            .update({
                status: 'arquivado',
                motivo_arquivamento: reason,
                updated_at: new Date().toISOString()
            })
            .eq('id', client.id);

        if (error) throw error;
        console.log(`[OK] Arquivado: ${client.nome_completo}`);
    }
    results.archived.push(client.nome_completo);
}

// Se executado diretamente
if (process.argv[1].includes('bulk_archive_clients.mjs')) {
    const args = process.argv.slice(2);
    const filePath = args.find(a => a.startsWith('--file='))?.split('=')[1];
    const dryRun = args.includes('--dry-run');
    const reason = args.find(a => a.startsWith('--reason='))?.split('=')[1];

    if (!filePath) {
        console.log('Uso: node scripts/bulk_archive_clients.mjs --file=lista.txt [--dry-run] [--reason="motivo"]');
        process.exit(0);
    }

    const names = fs.readFileSync(filePath, 'utf-8').split('\n').map(n => n.trim()).filter(n => n);
    bulkArchive(names, reason, dryRun);
}

export { bulkArchive };
