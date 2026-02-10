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
    { key: 'email', label: 'Email' },
    { key: 'data_nascimento', label: 'Data de Nascimento' },
    { key: 'sexo', label: 'Sexo' },
    { key: 'profissao', label: 'Profissão' },
    { key: 'endereco', label: 'Logradouro' },
    { key: 'numero_casa', label: 'Número' },
    { key: 'bairro', label: 'Bairro' },
    { key: 'cidade', label: 'Cidade' },
    { key: 'uf', label: 'UF' },
    { key: 'cep', label: 'CEP' },
    { key: 'filial', label: 'Filial' },
    { key: 'captador', label: 'Captador' },
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
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
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
const COLUMN_MAP: Record<string, keyof Client | '_pendencia'> = {
    'nome': 'nome_completo',
    'nome completo': 'nome_completo',
    'name': 'nome_completo',
    'cpf': 'cpf_cnpj',
    'cpf/cnpj': 'cpf_cnpj',
    'cpf_cnpj': 'cpf_cnpj',
    'captador': 'captador',
    'senha': 'senha_gov',
    'senha gov': 'senha_gov',
    'senha_gov': 'senha_gov',
    'cep': 'cep',
    'filial': 'filial',
    'pendencia': '_pendencia' as any,
    'pendências': '_pendencia' as any,
    'pendencias': '_pendencia' as any,
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

                    // Map each column by normalized header name
                    Object.keys(row).forEach(header => {
                        const normalized = normalizeString(header);
                        const field = COLUMN_MAP[normalized];

                        if (field === '_pendencia' as any) {
                            // Parse pendencia column
                            rawPendencias = parsePendencias(String(row[header] || ''));
                            return;
                        }

                        if (field && field !== '_pendencia') {
                            let value = String(row[header] || '').trim();

                            // Format CPF if numeric
                            if (field === 'cpf_cnpj' && value) {
                                value = value.replace(/\D/g, '');
                                if (value.length <= 11) {
                                    value = value.padStart(11, '0');
                                }
                            }

                            // Format CEP
                            if (field === 'cep' && value) {
                                value = value.replace(/\D/g, '');
                                if (value.length === 8) {
                                    value = value.replace(/^(\d{5})(\d)/, '$1-$2');
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
    const headers = ['Nome', 'CPF', 'Captador', 'Senha Gov', 'CEP', 'Pendência'];
    const exampleRow = ['Maria da Silva', '000.000.000-00', 'João Captador', 'senha123', '65000-000', 'Duas Etapas'];

    const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);

    // Set column widths
    ws['!cols'] = [
        { wch: 30 }, // Nome
        { wch: 18 }, // CPF
        { wch: 25 }, // Captador
        { wch: 15 }, // Senha Gov
        { wch: 12 }, // CEP
        { wch: 30 }, // Pendência
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
