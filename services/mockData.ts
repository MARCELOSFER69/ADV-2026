import { Case, CaseStatus, Client, Event, EventType, FinancialRecord, FinancialType, Branch, CaseType, CaseHistory } from '../types';

export const mockClients: Client[] = [
  {
    id: 'c1',
    nome_completo: 'Maria da Pesca Silva',
    cpf_cnpj: '123.456.789-00',
    telefone: '(98) 98765-4321',
    email: 'maria.pesca@email.com',
    data_cadastro: '2023-01-15T10:00:00Z',
    data_nascimento: '1985-05-20',
    endereco: 'Povoado Pesqueiro, Santa Inês - MA',
    captador: 'Líder Comunitário',
    filial: Branch.SANTA_INES,
    observacao: 'Pescadora artesanal, precisa renovar carteira.',
    foto: '',
    documentos: [
      { id: 'd1', nome: 'RGP.pdf', tipo: 'PDF', data_upload: '2023-01-15T10:05:00Z', url: '', path: '' }
    ]
  },
  {
    id: 'c2',
    nome_completo: 'Ana Souza (Mãe)',
    cpf_cnpj: '987.654.321-11',
    telefone: '(98) 99999-8888',
    email: '',
    data_cadastro: '2023-03-10T14:30:00Z',
    data_nascimento: '1995-08-15',
    endereco: 'Rua das Palmeiras, Centro - Aspema',
    captador: 'Indicação',
    filial: Branch.ASPEMA,
    observacao: 'Bêbe nasceu mês passado.',
    foto: '',
    documentos: []
  },
  {
    id: 'c3',
    nome_completo: 'Sr. João Aposentado',
    cpf_cnpj: '000.111.222-33',
    telefone: '(98) 3333-4444',
    email: '',
    data_cadastro: '2023-05-22T09:15:00Z',
    data_nascimento: '1958-12-01',
    endereco: 'Zona Rural, Alto Alegre',
    captador: 'Rádio',
    filial: Branch.ALTO_ALEGRE,
    observacao: 'Trabalhador rural a vida toda.',
    foto: '',
    documentos: []
  },
];

export const mockCases: Case[] = [
  {
    id: 'p1',
    client_id: 'c1',
    titulo: 'Seguro Defeso 2023/2024',
    numero_processo: 'ADM-2023-998877',
    tribunal: 'INSS',
    valor_causa: 5280.00,
    status: CaseStatus.ANALISE,
    tipo: CaseType.SEGURO_DEFESO,
    data_abertura: '2023-11-01T11:00:00Z',
    status_pagamento: 'Pendente',
    acessos: [
      {
        id: 'a1',
        nome_sistema: 'Gov.br',
        url: 'https://www.gov.br/pt-br',
        login: '123.456.789-00',
        senha: 'senha-segura-123'
      },
      {
        id: 'a2',
        nome_sistema: 'Portal do Pescador',
        url: 'https://sistemas.agricultura.gov.br/',
        login: '123.456.789-00',
      }
    ]
  },
  {
    id: 'p2',
    client_id: 'c2',
    titulo: 'Salário Maternidade Rural',
    numero_processo: '1002345-88.2023.4.01.3700',
    tribunal: 'TRF-1',
    valor_causa: 7000.00,
    status: CaseStatus.AGUARDANDO_AUDIENCIA,
    tipo: CaseType.SALARIO_MATERNIDADE,
    data_abertura: '2023-04-05T16:00:00Z',
    status_pagamento: 'Pendente',
    acessos: [
      {
        id: 'a3',
        nome_sistema: 'PJe TRF-1',
        url: 'https://pje1g.trf1.jus.br/',
        login: 'OAB-MA 12345',
        senha: 'oab-senha-forte'
      }
    ]
  },
  {
    id: 'p3',
    client_id: 'c3',
    titulo: 'Aposentadoria Rural por Idade',
    numero_processo: '5009876-12.2023.4.01.3700',
    tribunal: 'TRF-1',
    valor_causa: 85000.00,
    status: CaseStatus.EM_RECURSO,
    tipo: CaseType.APOSENTADORIA,
    data_abertura: '2023-06-01T10:00:00Z',
    status_pagamento: 'Pendente',
  },
  {
    id: 'p4',
    client_id: 'c1',
    titulo: 'BPC - Deficiência',
    numero_processo: 'INSS-BPC-001',
    tribunal: 'INSS',
    valor_causa: 1412.00,
    status: CaseStatus.CONCLUIDO_CONCEDIDO,
    tipo: CaseType.BPC_LOAS,
    data_abertura: '2024-01-20T14:00:00Z',
    status_pagamento: 'Pago',
    valor_honorarios_pagos: 420.00,
    acessos: [
      {
        id: 'a4',
        nome_sistema: 'Meu INSS',
        url: 'https://meu.inss.gov.br/',
        login: '123.456.789-00',
        senha: 'senha-do-cliente'
      }
    ]
  },
];

export const mockFinancial: FinancialRecord[] = [
  {
    id: 'f1',
    case_id: 'p1',
    titulo: 'Entrada Honorários',
    tipo: FinancialType.RECEITA,
    valor: 500.00,
    data_vencimento: '2023-11-01T00:00:00Z',
    status_pagamento: true,
  },
  {
    id: 'f2',
    case_id: 'p2',
    titulo: 'Custas Iniciais',
    tipo: FinancialType.DESPESA,
    valor: 200.50,
    data_vencimento: '2023-04-05T00:00:00Z',
    status_pagamento: true,
  },
  {
    id: 'f3',
    case_id: 'p4',
    titulo: 'Honorários Finais BPC',
    tipo: FinancialType.RECEITA,
    valor: 420.00,
    data_vencimento: '2024-02-15T00:00:00Z',
    status_pagamento: true,
  },
];

export const mockEvents: Event[] = [
  {
    id: 'e1',
    case_id: 'p2',
    titulo: 'Audiência de Instrução',
    data_hora: new Date(Date.now() + 86400000 * 2).toISOString(), // +2 days
    tipo: EventType.AUDIENCIA,
  },
  {
    id: 'e2',
    case_id: 'p1',
    titulo: 'Protocolar Requerimento',
    data_hora: new Date(Date.now() + 86400000 * 5).toISOString(), // +5 days
    tipo: EventType.ADMINISTRATIVO,
  },
  {
    id: 'e3',
    case_id: 'p4',
    titulo: 'Perícia Médica INSS',
    data_hora: new Date(Date.now() + 86400000 * 10).toISOString(),
    tipo: EventType.PERICIA,
  },
];

export const mockHistory: CaseHistory[] = [
  {
    id: 'h1',
    case_id: 'p1',
    action: 'Criação',
    details: 'Processo cadastrado no sistema.',
    user_name: 'Dr. Jayrton Noleto',
    timestamp: '2023-11-01T11:00:00Z'
  },
  {
    id: 'h2',
    case_id: 'p1',
    action: 'Mudança de Status',
    details: 'Alterado de "Inicial" para "Análise"',
    user_name: 'Dr. Jayrton Noleto',
    timestamp: '2023-11-05T14:30:00Z'
  },
  {
    id: 'h3',
    case_id: 'p4',
    action: 'Financeiro',
    details: 'Honorários definidos como "Pago" (R$ 420,00)',
    user_name: 'Dr. Jayrton Noleto',
    timestamp: '2024-02-15T10:00:00Z'
  }
];