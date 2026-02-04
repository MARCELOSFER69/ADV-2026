export type UUID = string;

export enum CaseStatus {
  PROTOCOLAR = 'A Protocolar', // NOVO STATUS INICIAL
  ANALISE = 'Análise',
  EXIGENCIA = 'Exigência',
  AGUARDANDO_AUDIENCIA = 'Aguardando Audiência',
  EM_RECURSO = 'Em Recurso',
  CONCLUIDO_CONCEDIDO = 'Concluído (Concedido)',
  CONCLUIDO_INDEFERIDO = 'Concluído (Indeferido)',
  ARQUIVADO = 'Arquivado',
}

export enum CaseType {
  SEGURO_DEFESO = 'Seguro Defeso',
  SALARIO_MATERNIDADE = 'Salário Maternidade',
  APOSENTADORIA = 'Aposentadoria',
  BPC_LOAS = 'BPC/LOAS',
  AUXILIO_DOENCA = 'Auxílio Doença',
  PENSAO_POR_MORTE = 'Pensão por Morte',
  AUXILIO_RECLUSAO = 'Auxílio Reclusão',
  AUXILIO_ACIDENTE = 'Auxílio Acidente',
  PENSAO_VITALICIA = 'Pensão Vitalícia',
  SALARIO_FAMILIA = 'Salário Família',
  AUXILIO_INCLUSAO = 'Auxílio-Inclusão',
  REVISAO = 'Revisão de Benefício',
  CTC = 'CTC',
  RECURSO = 'Recurso INSS',
  TRABALHISTA = 'Trabalhista',
  CIVIL = 'Cível/Outros',
}

export enum FinancialType {
  RECEITA = 'Receita',
  DESPESA = 'Despesa',
  COMISSAO = 'Comissão',
}

export type Category = 'expense' | 'income' | 'benefit' | 'reminder' | 'interview';
export type TransactionType = 'Receita' | 'Despesa' | 'Comissão';

export const PENDING_OPTIONS_LIST = [
  'Assinatura pendente',
  'Documento faltante',
  'Foto do rosto',
  'Senha do GOV.BR',
  'Dados bancários',
  'Outros'
];

export enum EventType {
  AUDIENCIA = 'Audiência',
  PRAZO_FATAL = 'Prazo Fatal',
  REUNIAO = 'Reunião',
  PERICIA = 'Perícia Médica',
  ADMINISTRATIVO = 'Protocolo INSS',
}

export enum Branch {
  SANTA_INES = 'Santa Inês',
  ASPEMA = 'Aspema',
  ALTO_ALEGRE = 'Alto Alegre',
  SAO_JOAO_DO_CARU = 'São João do Carú',
}

export interface ClientDocument {
  id: string;
  nome: string;
  tipo: string;
  data_upload: string;
  url: string;
  path: string;
}

export interface Captador {
  id: string;
  nome: string;
  filial: string;
}

export interface Client {
  id: UUID;
  nome_completo: string;
  cpf_cnpj: string;
  cases?: Case[]; // Added for joined queries
  telefone: string;
  email: string;
  data_cadastro: string;
  status?: 'ativo' | 'arquivado';
  senha_gov?: string;
  senha_inss?: string;
  motivo_arquivamento?: string;
  data_nascimento?: string;
  sexo?: 'Masculino' | 'Feminino';
  endereco?: string;
  nacionalidade?: string;
  estado_civil?: string;
  profissao?: string;
  rg?: string;
  orgao_emissor?: string;
  numero_casa?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  senha?: string;
  captador?: string;
  filial?: Branch | string;
  observacao?: string;
  foto?: string;
  documentos?: ClientDocument[];
  pendencias?: string[];
  aposentadoria_modalidade?: 'Rural' | 'Urbana';

  interviewStatus?: 'Pendente' | 'Agendada' | 'Concluída';
  interviewDate?: string;

  // Representante Legal (Opcional)
  representante_nome?: string;
  representante_cpf?: string;

  registered_by?: string;
  updated_by?: string;
  cnis_data?: CnisData;

  // RGP & REAP
  rgp_status?: 'Ativo' | 'Suspenso' | 'Cancelado' | 'Pendente';
  rgp_localidade?: string;
  rgp_numero?: string;
  rgp_local_exercicio?: string;
  rgp_data_primeiro?: string;
  reap_status?: 'Regular' | 'Pendente Anual' | 'Não Realizada';
  reap_ano_base?: number;
  updated_at?: string;
  gps_status_calculado?: 'puxada' | 'pendente' | 'regular' | null;
}

export interface Task {
  id: UUID;
  case_id: UUID;
  titulo: string;
  concluido: boolean;
}

export interface SystemAccess {
  id: UUID;
  nome_sistema: string;
  url: string;
  login: string;
  senha?: string;
}

export interface BotUpdateLog {
  id: UUID;
  case_id: UUID;
  bot_name: string;
  raw_response?: any;
  changes_detected?: any;
  created_at: string;
}

export interface SystemNotification {
  id: UUID;
  client_id: UUID;
  case_id?: UUID;
  message: string;
  severity: 'baixa' | 'media' | 'alta' | 'critica';
  status: 'pendente' | 'enviado' | 'erro';
  error_log?: string;
  scheduled_for: string;
  sent_at?: string;
  created_at: string;
}

export interface RetirementCalculation {
  id: UUID;
  client_id: UUID;
  calculation_data: any;
  estimated_value?: number;
  ready_for_process: boolean;
  promoted_to_case_id?: UUID;
  created_at: string;
  updated_at: string;
}

export interface GPS {
  id: string;
  competencia: string;
  valor: number;
  status: 'Pendente' | 'Puxada' | 'Paga';
  data_pagamento?: string;

  // Detalhes de Pagamento (GPS)
  forma_pagamento?: 'Boleto' | 'Pix';
  pagador?: string;
}

export interface Case {
  id: UUID;
  client_id: UUID;
  numero_processo: string;
  tribunal: string;
  valor_causa: number;
  status: CaseStatus;
  tipo: CaseType | string;
  modalidade?: string;
  data_abertura: string;
  titulo: string;
  forma_recebimento?: 'Completo' | 'Parcelado';
  acessos?: SystemAccess[];
  status_pagamento: 'Pendente' | 'Parcial' | 'Pago';
  valor_honorarios_pagos?: number;

  // Detalhes de Pagamento de Honorários (Processo)
  honorarios_forma_pagamento?: 'Especie' | 'Conta';
  honorarios_recebedor?: string;
  honorarios_tipo_conta?: 'PF' | 'PJ';
  honorarios_conta?: string;

  drive_folder_id?: string;
  motivo_arquivamento?: string;
  data_fatal?: string;
  fase_atual?: string;
  gps_lista?: GPS[];
  metadata?: Record<string, any>;
  anotacoes?: string;

  // Campos da View (Dashboard/Listas Otimizadas)
  client_name?: string;
  client_cpf?: string;
  captador?: string; // Para filtro "Meus Processos"

  registered_by?: string;
  updated_by?: string;
  updated_at?: string;
}

export interface CaseInstallment {
  id: UUID;
  case_id: UUID;
  parcela_numero: number;
  data_vencimento: string;
  valor: number;
  pago: boolean;
  data_pagamento?: string;
  destino?: 'Escritório' | 'Cliente';

  // Detalhes de Pagamento da Parcela
  forma_pagamento?: 'Especie' | 'Conta';
  recebedor?: string;
  tipo_conta?: 'PF' | 'PJ';
  conta?: string;
}

export interface CaseHistory {
  id: UUID;
  case_id: UUID;
  action: string;
  details: string;
  user_name: string;
  timestamp: string;
}

export interface ClientHistory {
  id: UUID;
  client_id: UUID;
  action: string;
  details: string;
  user_name: string;
  timestamp: string;
}

export interface CommissionReceipt {
  id: UUID;
  captador_nome: string;
  cpf_captador?: string;
  valor_total: number;
  data_geracao: string;
  arquivo_url?: string;
  status: 'pending' | 'signed';
  status_assinatura?: 'pendente' | 'assinado';
}

export interface FinancialRecord {
  id: UUID;
  case_id?: UUID;
  client_id?: UUID;
  titulo: string;
  tipo: FinancialType;
  tipo_movimentacao?: string;
  valor: number;
  data_vencimento: string;
  status_pagamento: boolean;
  is_office_expense?: boolean;
  captador_nome?: string;
  receipt_id?: string;

  // --- NOVOS CAMPOS PARA O FINANCEIRO ---
  forma_pagamento?: string;
  recebedor?: string;
  tipo_conta?: string;
  conta?: string;
  is_honorary?: boolean;
  clients?: { nome_completo: string; cpf_cnpj: string };
  cases?: { titulo: string; numero_processo: string; client_id: UUID };
}

export interface OfficeExpense {
  id: UUID;
  titulo: string;
  valor: number;
  data_despesa: string;
  created_at?: string;
  status?: 'Pago' | 'Pendente';
  observacao?: string;
  pagador?: string;
  tipo_conta?: 'PF' | 'PJ';
  conta?: string;

  // Novos campos para GPS/Guia
  forma_pagamento?: string;
  recebedor?: string;
  paid_with_balance_id?: string;
}

export interface OfficeBalance {
  id: UUID;
  valor_inicial: number;
  data_entrada: string;
  descricao?: string;
  pagador?: string;
  tipo_conta?: 'PF' | 'PJ';
  conta?: string;
  forma_pagamento?: string;
  created_at?: string;
}

// --- NOVA INTERFACE: Credencial Pessoal ---
export interface PersonalCredential {
  id: string;
  nome_pessoa: string;
  site_nome: string;
  site_url: string;
  cpf_login: string;
  senha: string;
  observacao?: string;
}

export interface Event {
  id: UUID;
  case_id: UUID;
  titulo: string;
  data_hora: string;
  tipo: EventType | string;
  cidade?: string;
}

export type FieldType = 'text' | 'image';

export interface FieldMark {
  id: string;
  type: FieldType;
  template: string;
  src?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  page: number;
  fontSize: number;
  isBold: boolean;
  dateFormat?: string;
  textAlign?: 'left' | 'center' | 'right';
  autoFit?: boolean;
}

export interface DocumentTemplate {
  id: string;
  titulo: string;
  arquivo_url?: string;
  html_content?: string;
  campos_config: FieldMark[];
  base_type: 'pdf' | 'html';
}

export interface Reminder {
  id: UUID;
  user_id: string;
  title: string;
  date: string;
  completed: boolean;
}

export interface AppNotification {
  id: string;
  type: 'expense' | 'income' | 'benefit' | 'reminder' | 'interview';
  title: string;
  message: string;
  date: string;
  amount: number;
  urgency: 'today' | 'tomorrow' | 'upcoming';
  clientName?: string;
  clientId?: string;
  caseId?: string;
  status: 'unread' | 'read';
}

export interface Chat {
  id: UUID;
  client_id: UUID;
  client_name: string;
  remote_jid: string;
  status: 'waiting' | 'active' | 'closed' | 'finished';
  assigned_to?: string; // user_name or user_id
  assigned_to_id?: string;
  last_message?: string;
  last_message_at: string;
  unread_count: number;
}

export interface ChatMessage {
  id: UUID;
  chat_id: UUID;
  sender_type: 'client' | 'user' | 'system';
  sender_name: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export type ViewState =
  | 'dashboard'
  | 'clients'
  | 'cases'
  | 'cases-judicial'
  | 'cases-administrative'
  | 'cases-insurance'
  | 'financial'
  | 'office-expenses'
  | 'commissions'
  | 'financial-calendar'
  | 'retirements'
  | 'cnis'
  | 'gps-calculator'
  | 'document-builder'
  | 'robots'
  | 'permissions'
  | 'whatsapp'
  | 'personal'
  | 'download';

export interface BrasilApiCompany {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  descricao_situacao_cadastral: string;
  logradouro: string;
  numero: string;
  bairro: string;
  municipio: string;
  uf: string;
  ddd_telefone_1: string;
}

export type CaseColumnId = 'titulo' | 'cliente' | 'numero' | 'status' | 'tipo' | 'tribunal' | 'valor' | 'data_abertura' | 'pagamento';

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  order: number;
}

export interface SectionConfig {
  id: string;
  label: string;
  visible: boolean;
  order: number;
}

export interface TabConfig {
  id: string;
  label: string;
  visible: boolean;
  order: number;
  sections?: SectionConfig[];
}

export type WidgetType =
  | 'kpi-income'
  | 'kpi-expense'
  | 'kpi-active-cases'
  | 'kpi-new-clients'
  | 'kpi-success-rate'
  | 'chart-financial'
  | 'chart-types'
  | 'chart-funnel'
  | 'chart-origin'
  | 'radar-financial'
  | 'list-agenda'
  | 'list-shortcuts'
  | 'list-receivables'
  | 'list-audit'
  | 'list-insurance-due'
  | 'list-top-captadores'
  | 'kpi-stagnation'
  | 'chart-cash-flow'
  | 'calendar-reminders'
  | 'sticky-note'
  | 'text-welcome'
  | 'list-tasks'
  | 'list-deadlines'
  | 'list-birthdays'
  | 'list-captadores-detailed'
  | 'list-pendencias-overview'
  | 'kpi-total-processes-branch'
  | 'kpi-total-processes-type'
  | 'kpi-expected-fees'
  | 'list-bot-updates'
  | 'list-whatsapp-queue';

export type WidgetPeriod = 'this_month' | 'last_month' | 'this_year' | 'all_time';

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  width: 1 | 2 | 3 | 4;
  order: number;
  config?: {
    title?: string;
    period?: WidgetPeriod;
    dataType?: 'financial' | 'clients' | 'cases';
    chartType?: 'area' | 'bar';
    viewMode?: 'list' | 'calendar';
    goal?: number;
    financialViewMode?: 'all' | 'income' | 'profit';
  }
}

export interface UserPreferences {
  theme?: 'standard' | 'dark' | 'white';
  casesViewMode?: 'kanban' | 'list';
  casesColumns?: ColumnConfig[];
  clientsViewMode?: 'list' | 'grid';
  clientsColumns?: ColumnConfig[];
  dashboardLayout?: DashboardWidget[];
  customModalities?: Record<string, string[]>;
  customCaseTypes?: string[];
  assistantTriggerPosition?: 'floating' | 'sidebar';
  kanbanColumnWidth?: number;
  kanbanCardScale?: number;
  clientsFontSize?: number;
  clientsCardScale?: number;
  casesFontSize?: number;
  clientDetailsLayout?: TabConfig[];
  caseDetailsLayout?: {
    tabs?: TabConfig[];
    sections?: SectionConfig[];
  };
  lowPerformanceMode?: boolean;
  estimatedFeePercentage?: number;
}

export interface UserPermission {
  id: string;
  email: string;
  nome: string;
  role: 'admin' | 'colaborador';

  // Permissões Macro
  access_dashboard: boolean;
  access_clients: boolean;
  access_cases: boolean;
  access_financial: boolean;
  access_tools: boolean;
  access_whatsapp?: boolean;

  // Permissões Granulares
  access_personal: boolean;

  // Tipos de Processos
  access_cases_judicial?: boolean;
  access_cases_administrative?: boolean;
  access_cases_insurance?: boolean;

  // Ferramentas Específicas
  access_tool_cnis?: boolean;
  access_tool_gps?: boolean;
  access_tool_docs?: boolean;
  access_robots?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  avatar?: string;
  preferences?: UserPreferences;
  permissions?: UserPermission;
}

// --- CNIS Types ---
export interface CnisDuration {
  years: number;
  months: number;
  days: number;
}

export interface CnisBond {
  id: string;
  company: string;
  startDate: string;
  endDate: string;
  duration: CnisDuration;
  durationString: string;
  isActive: boolean;
}

export interface CnisBenefit {
  id: string;
  benefitNumber: string;
  species: string;
  status: string;
  startDate: string;
  endDate?: string;
}

export interface CnisData {
  lastUpdate: string;
  fileName?: string;
  totalTime: CnisDuration;
  bonds: CnisBond[];
  benefits: CnisBenefit[];
}
