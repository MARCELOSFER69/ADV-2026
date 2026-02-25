import * as XLSX from 'xlsx';
import { Client, Captador } from '../types';
import { fetchAddressByCep } from './cepService';
import { checkCpfExists } from './clientsService';
import { supabase } from './supabaseClient';

export interface ImportLogEntry {
    userId: string;
    userName: string;
    filial: string;
    fileName: string;
    totalRows: number;
    importedCount: number;
    skippedCount: number;
    captadoresAdded: number;
    clientNames: string[];
    clientIds: string[];
    errors: string[];
}

/**
 * Save an import log entry to the database
 */
export async function saveImportLog(log: ImportLogEntry): Promise<void> {
    try {
        await supabase.from('import_logs').insert({
            user_id: log.userId,
            user_name: log.userName,
            filial: log.filial,
            file_name: log.fileName,
            total_rows: log.totalRows,
            imported_count: log.importedCount,
            skipped_count: log.skippedCount,
            captadores_added: log.captadoresAdded,
            client_names: log.clientNames,
            client_ids: log.clientIds,
            errors: log.errors,
        });
    } catch (err) {
        console.error('Erro ao salvar log de importação:', err);
    }
}

/**
 * Fetch import logs from the database
 */
export async function fetchImportLogs(limit = 20): Promise<any[]> {
    try {
        const { data, error } = await supabase
            .from('import_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Erro ao buscar logs de importação:', err);
        return [];
    }
}

// Campos que são considerados obrigatórios para um cadastro completo
export const REQUIRED_CLIENT_FIELDS: { key: keyof Client; label: string }[] = [
    { key: 'nome_completo', label: 'Nome Completo' },
    { key: 'cpf_cnpj', label: 'CPF/CNPJ' },
    { key: 'telefone', label: 'Telefone' },
    { key: 'rg', label: 'RG' },
    { key: 'sexo', label: 'Sexo' },
    { key: 'data_nascimento', label: 'Data de Nascimento' },
    { key: 'endereco', label: 'Endereço' },
    { key: 'bairro', label: 'Bairro' },
    { key: 'cidade', label: 'Cidade' },
    { key: 'uf', label: 'UF' },
    { key: 'cep', label: 'CEP' },
];

/**
 * Returns an array of labels for fields that are missing/empty in the client
 */
export function getIncompleteFields(client: Partial<Client>): string[] {
    return REQUIRED_CLIENT_FIELDS
        .filter(f => {
            const val = client[f.key];
            return val === undefined || val === null || val === '';
        })
        .map(f => f.label);
}

/**
 * Check if a client imported has incomplete data
 */
export function isClientIncomplete(client: Partial<Client>): boolean {
    return getIncompleteFields(client).length > 0;
}

/**
 * Normalize a string by removing accents and converting to lowercase.
 * Used for accent-insensitive matching of captador names.
 */
export function normalizeString(str: string): string {
    if (!str) return '';
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\u00a0/g, ' ') // Substitui NBSP (alt+255) por espaço comum
        .toLowerCase()
        .trim();
}

/**
 * Find a matching captador from the existing list, using accent-insensitive comparison.
 * Returns the exact captador name from the system (preserving original casing/accents).
 */
export function matchCaptador(rawName: string, captadores: Captador[], filial: string): string {
    if (!rawName) return '';
    const normalizedInput = normalizeString(rawName);

    // Filter captadores by filial first, then match by normalized name
    const filialCaptadores = captadores.filter(c => c.filial === filial);
    const match = filialCaptadores.find(c => normalizeString(c.nome) === normalizedInput);

    if (match) return match.nome;

    // If no match in filial, try all captadores as fallback
    const globalMatch = captadores.find(c => normalizeString(c.nome) === normalizedInput);
    if (globalMatch) return globalMatch.nome;

    // No match found, return the raw name from the spreadsheet
    return rawName.trim();
}

// Column name mapping (Excel header → client field)
const COLUMN_MAP: Record<string, keyof Client | '_pendencia' | '_reap_2021' | '_reap_2022' | '_reap_2023' | '_reap_2024' | '_reap_2025'> = {
    'nome': 'nome_completo',
    'nome completo': 'nome_completo',
    'name': 'nome_completo',
    'cpf': 'cpf_cnpj',
    'cpf/cnpj': 'cpf_cnpj',
    'cpf_cnpj': 'cpf_cnpj',
    'sexo': 'sexo',
    'nascimento': 'data_nascimento',
    'data de nascimento': 'data_nascimento',
    'data_nascimento': 'data_nascimento',
    'rg': 'rg',
    'orgao': 'orgao_emissor',
    'orgao emissor': 'orgao_emissor',
    'orgao_emissor': 'orgao_emissor',
    'emissao': 'orgao_emissor',
    'telefone': 'telefone',
    'contato': 'telefone',
    'profissao': 'profissao',
    'profisso': 'profissao',
    'ocupacao': 'profissao',
    'cargo': 'profissao',
    'captador': 'captador',
    'whatsapp': 'telefone',
    'senha': 'senha_gov',
    'senha gov': 'senha_gov',
    'senha_gov': 'senha_gov',
    'cep': 'cep',
    'endereco': 'endereco',
    'rua': 'endereco',
    'logradouro': 'endereco',
    'numero': 'numero_casa',
    'numero_casa': 'numero_casa',
    'bairro': 'bairro',
    'cidade': 'cidade',
    'municipio': 'cidade',
    'uf': 'uf',
    'estado': 'uf',
    'filial': 'filial',
    'pendencia': '_pendencia' as any,
    'pendências': '_pendencia' as any,
    'pendencias': '_pendencia' as any,
    'reap 2021': '_reap_2021' as any,
    'reap 2022': '_reap_2022' as any,
    'reap 2023': '_reap_2023' as any,
    'reap 2024': '_reap_2024' as any,
    'reap 2025': '_reap_2025' as any,
    'reap2021': '_reap_2021' as any,
    'reap2022': '_reap_2022' as any,
    'reap2023': '_reap_2023' as any,
    'reap2024': '_reap_2024' as any,
    'reap2025': '_reap_2025' as any,
    'reap 21': '_reap_2021' as any,
    'reap 22': '_reap_2022' as any,
    'reap 23': '_reap_2023' as any,
    'reap 24': '_reap_2024' as any,
    'reap 25': '_reap_2025' as any,
};

// Map pendencia values from Excel to the system's PENDING_OPTIONS
const PENDENCIA_MAP: Record<string, string> = {
    'senha': 'Senha',
    'duas etapas': 'Duas Etapas',
    'bronze': 'Nível da Conta (Bronze)',
    'nivel da conta': 'Nível da Conta (Bronze)',
    'nível da conta': 'Nível da Conta (Bronze)',
    'nível da conta (bronze)': 'Nível da Conta (Bronze)',
    'receita federal': 'Pendência na Receita Federal',
    'pendencia na receita federal': 'Pendência na Receita Federal',
    'pendência na receita federal': 'Pendência na Receita Federal',
    'documentacao incompleta': 'Documentação Incompleta',
    'documentação incompleta': 'Documentação Incompleta',
    'documentacao': 'Documentação Incompleta',
    'documentação': 'Documentação Incompleta',
};

/**
 * Parse a pendencia string from Excel into system-recognized pendencia values
 */
function parsePendencias(raw: string): string[] {
    if (!raw) return [];
    // Support multiple pendencias separated by comma, semicolon, or pipe
    const parts = raw.split(/[,;|]/).map(p => p.trim()).filter(Boolean);

    return parts.map(part => {
        const normalized = normalizeString(part);
        return PENDENCIA_MAP[normalized] || part.trim();
    });
}

/**
 * Parse an Excel (.xlsx) file and return an array of partial Client objects
 */
export async function parseImportExcel(file: File): Promise<Partial<Client>[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

                if (rows.length === 0) {
                    reject(new Error('Planilha vazia'));
                    return;
                }

                const clients: Partial<Client>[] = rows.map(row => {
                    const client: Partial<Client> = {};
                    let rawPendencias: string[] = [];

                    const tempReap: Record<string, any> = {};

                    // Map each column by normalized header name
                    Object.keys(row).forEach(header => {
                        const normalized = normalizeString(header);
                        const field = COLUMN_MAP[normalized];

                        if (field === '_pendencia' as any) {
                            rawPendencias = parsePendencias(String(row[header] || ''));
                            return;
                        }

                        if (field && String(field).startsWith('_reap_')) {
                            tempReap[String(field)] = row[header];
                            return;
                        }

                        if (field && !String(field).startsWith('_')) {
                            let value = String(row[header] || '').trim();

                            // Format CPF if numeric
                            if (field === 'cpf_cnpj') {
                                value = value.replace(/\D/g, '');
                                if (value.length <= 11) {
                                    value = value.padStart(11, '0');
                                }
                            }

                            // Format CEP
                            if (field === 'cep') {
                                value = value.replace(/\D/g, '');
                                if (value.length === 8) {
                                    value = value.replace(/^(\d{5})(\d)/, '$1-$2');
                                }
                            }

                            if (field === 'data_nascimento' && value) {
                                // Se vier formatada do Excel (ex: serial date ou DD/MM/YYYY)
                                // O xlsx costuma entregar string se for via reader.readAsArrayBuffer + sheet_to_json
                                // Mas vamos garantir o formato YYYY-MM-DD
                                if (value.includes('/')) {
                                    const parts = value.split('/');
                                    if (parts.length === 3) {
                                        if (parts[2].length === 4) value = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                                        else value = `20${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                                    }
                                }
                            }

                            (client as any)[field] = value;
                        }
                    });

                    // Auto-detect "Senha" pendencia if senha_gov is empty
                    if (!client.senha_gov || client.senha_gov === '') {
                        if (!rawPendencias.includes('Senha')) {
                            rawPendencias.push('Senha');
                        }
                    }

                    // Set pendencias if any
                    if (rawPendencias.length > 0) {
                        client.pendencias = rawPendencias;
                    }

                    // --- Lógica REAP Polida (Agressiva) ---
                    const reapHistory: Record<string, boolean | number[]> = {};
                    let hasReapData = false;

                    // 2021-2024
                    [2021, 2022, 2023, 2024].forEach(year => {
                        const val = tempReap[`_reap_${year}`];
                        if (val !== undefined && val !== null && String(val).trim() !== '') {
                            const normalized = normalizeString(String(val));
                            // Se não for "não"/"pendente"/"falso", e tiver conteúdo, consideramos TRUE
                            const isNegative = normalized === 'nao' || normalized === 'no' || normalized === 'false' || normalized === '0' || normalized === 'pendente' || normalized === 'n';
                            reapHistory[String(year)] = !isNegative;
                            hasReapData = true;
                        }
                    });

                    // 2025 (Meses)
                    const val2025 = tempReap[`_reap_2025`];
                    if (val2025 !== undefined && val2025 !== null && String(val2025).trim() !== '') {
                        const str = String(val2025).toLowerCase();
                        if (str.includes('tudo') || str.includes('todos') || str.includes('completo')) {
                            reapHistory['2025'] = [4, 5, 6, 7, 8, 9, 10, 11];
                        } else {
                            const monthMap: Record<string, number> = {
                                'jan': 1, 'fev': 2, 'mar': 3, 'abr': 4, 'mai': 5, 'jun': 6,
                                'jul': 7, 'ago': 8, 'set': 9, 'out': 10, 'nov': 11, 'dez': 12
                            };
                            const monthsFound: number[] = [];
                            Object.keys(monthMap).forEach(m => {
                                if (str.includes(m)) monthsFound.push(monthMap[m]);
                            });
                            if (monthsFound.length > 0) {
                                reapHistory['2025'] = monthsFound.sort((a, b) => a - b);
                            } else {
                                // Se tem algo escrito mas não identificamos meses, marcamos como TRUE para o ano todo ou mantemos booleano?
                                // Por segurança, se tem texto mas não meses reconhecidos, marcamos como realizado.
                                reapHistory['2025'] = [4, 5, 6, 7, 8, 9, 10, 11];
                            }
                        }
                        hasReapData = true;
                    }

                    if (hasReapData) {
                        client.reap_history = reapHistory;
                        client.reap_ano_base = 2025;
                        client.reap_status = 'Regular';
                        // Se tem REAP, o RGP provavelmente está ativo
                        if (!client.rgp_status) client.rgp_status = 'Ativo';
                    }

                    return client;
                });

                // Filter out rows without name or CPF
                const validClients = clients.filter(c => c.nome_completo && c.cpf_cnpj);
                resolve(validClients);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Check which CPFs from the import list already exist in the database.
 * Returns an array of indices of duplicate clients.
 */
export async function findDuplicateCpfs(clients: Partial<Client>[]): Promise<{ index: number; existingName: string }[]> {
    const duplicates: { index: number; existingName: string }[] = [];

    // Check in batches to avoid too many requests
    for (let i = 0; i < clients.length; i++) {
        const cpf = clients[i].cpf_cnpj;
        if (!cpf) continue;

        try {
            const { exists, client: existingClient } = await checkCpfExists(cpf);
            if (exists && existingClient) {
                duplicates.push({ index: i, existingName: existingClient.nome_completo });
            }
        } catch {
            // continue on error
        }

        // Rate limit: small delay every 10 checks
        if (i % 10 === 9) {
            await new Promise(r => setTimeout(r, 100));
        }
    }

    return duplicates;
}

/**
 * Find duplicate CPFs within the spreadsheet itself.
 * Returns groups of indices that share the same CPF.
 */
export function findIntraSpreadsheetDuplicates(clients: Partial<Client>[]): { cpf: string; indices: number[]; names: string[] }[] {
    const cpfMap = new Map<string, { indices: number[]; names: string[] }>();

    clients.forEach((client, index) => {
        const cpf = (client.cpf_cnpj || '').replace(/\D/g, '');
        if (!cpf) return;

        if (cpfMap.has(cpf)) {
            cpfMap.get(cpf)!.indices.push(index);
            cpfMap.get(cpf)!.names.push(client.nome_completo || '—');
        } else {
            cpfMap.set(cpf, { indices: [index], names: [client.nome_completo || '—'] });
        }
    });

    // Only return CPFs that appear more than once
    return Array.from(cpfMap.entries())
        .filter(([_, group]) => group.indices.length > 1)
        .map(([cpf, group]) => ({ cpf, ...group }));
}

/**
 * Generate and download a template Excel file with the correct column headers.
 */
export function downloadTemplateExcel() {
    const headers = [
        'Nome', 'CPF', 'Sexo', 'Nascimento', 'RG', 'Orgao Emissor', 'Telefone',
        'Profissao', 'Captador', 'Senha Gov', 'CEP', 'Rua', 'Bairro', 'Cidade', 'UF', 'Numero',
        'Pendencia', 'REAP 2021', 'REAP 2022', 'REAP 2023', 'REAP 2024', 'REAP 2025'
    ];
    const exampleRow = [
        'Maria da Silva', '000.000.000-00', 'Feminino', '01/01/1980', '1234567', 'SSP/MA', '(98) 98888-8888',
        'Pescadora', 'João Captador', 'senha123', '65000-000', 'Rua das Flores', 'Centro', 'São Luís', 'MA', '123',
        'Duas Etapas', 'Sim', 'Sim', 'Sim', 'Sim', 'Abr, Mai, Jun, Jul'
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);

    // Set column widths
    ws['!cols'] = [
        { wch: 30 }, // Nome
        { wch: 18 }, // CPF
        { wch: 12 }, // Sexo
        { wch: 15 }, // Nascimento
        { wch: 12 }, // RG
        { wch: 15 }, // Orgao
        { wch: 18 }, // Telefone
        { wch: 20 }, // Profissao
        { wch: 25 }, // Captador
        { wch: 15 }, // Senha
        { wch: 12 }, // CEP
        { wch: 30 }, // Rua
        { wch: 20 }, // Bairro
        { wch: 20 }, // Cidade
        { wch: 5 },  // UF
        { wch: 10 }, // Numero
        { wch: 30 }, // Pendencia
        { wch: 10 }, // REAP 2021
        { wch: 10 }, // REAP 2022
        { wch: 10 }, // REAP 2023
        { wch: 10 }, // REAP 2024
        { wch: 30 }, // REAP 2025
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo');
    XLSX.writeFile(wb, 'modelo_importacao_clientes.xlsx');
}

/**
 * Enrich a client with address info from CEP API
 */
export async function enrichClientWithCep(client: Partial<Client>): Promise<Partial<Client>> {
    if (!client.cep) return client;

    const rawCep = client.cep.replace(/\D/g, '');
    if (rawCep.length !== 8) return client;

    try {
        const address = await fetchAddressByCep(rawCep);
        if (address) {
            return {
                ...client,
                endereco: address.logradouro || client.endereco,
                bairro: address.bairro || client.bairro,
                cidade: address.localidade || client.cidade,
                uf: address.uf || client.uf,
            };
        }
    } catch (err) {
        console.warn('Erro ao buscar CEP:', rawCep, err);
    }
    return client;
}
