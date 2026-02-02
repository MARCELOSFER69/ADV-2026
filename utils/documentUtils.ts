import { Client } from '../types';

// Helper: Substituição de Variáveis
export const replaceVariables = (text: string, client?: Client) => {
    if (!text) return '';
    let data: any = {
        nome_completo: 'JOÃO DA SILVA EXEMPLO',
        cpf_cnpj: '000.000.000-00',
        rg: '0000000',
        orgao_emissor: 'SSP/UF',
        nacionalidade: 'BRASILEIRO',
        estado_civil: 'SOLTEIRO',
        profissao: 'AUTÔNOMO',
        endereco: 'RUA DAS FLORES',
        numero_casa: '123',
        bairro: 'CENTRO',
        cidade: 'CIDADE EXEMPLO',
        uf: 'UF',
        cep: '00000-000',
        data_atual: new Date().toLocaleDateString('pt-BR')
    };

    if (client) {
        const today = new Date().toLocaleDateString('pt-BR');
        data = { ...client, data_atual: today };
    }

    return text.replace(/\{([a-zA-Z0-9_]+)\}|\[([a-zA-Z0-9_]+)\]/gi, (match, key1, key2) => {
        const key = (key1 || key2).toLowerCase();
        let val = data[key];
        if (!val) {
            if (key === 'nome' || key === 'nome_cliente') val = data['nome_completo'];
            if (key === 'cpf') val = data['cpf_cnpj'];
            if (key === 'estado') val = data['uf'];
            if (key === 'municipio') val = data['cidade'];
        }
        return val ? String(val).toUpperCase() : match;
    });
};

// Helper: Formatar Data para Preview
export const applyDateFormat = (text: string, format?: string) => {
    if (!format || format === 'default') return text;

    // Verifica se o texto parece uma data (DD/MM/AAAA)
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = text.match(dateRegex);

    if (!match) return text; // Não é data, retorna texto normal

    const [_, day, month, year] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day));

    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    switch (format) {
        case 'day': return day;
        case 'month_name': return months[date.getMonth()];
        case 'month_name_upper': return months[date.getMonth()].toUpperCase();
        case 'year': return year;
        case 'long': return `${day} de ${months[date.getMonth()]} de ${year}`;
        default: return text;
    }
};
