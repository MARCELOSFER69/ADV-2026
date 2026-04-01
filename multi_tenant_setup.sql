-- SCRIPT SQL: Configuração de Multi-Tenant (Isolamento de Dados)
-- Cole este código no SQL Editor do Supabase e clique em 'RUN'

-- 1. ADICIONAR COLUNA EM TODAS AS TABELAS PRINCIPAIS
-- O valor padrão 'principal' garante que todos os dados antigos continuem existindo no módulo normal do sistema.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'principal';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'principal';
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'principal';
ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'principal';
ALTER TABLE public.office_expenses ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'principal';
ALTER TABLE public.office_balances ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'principal';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'principal';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'principal';
ALTER TABLE public.captadores ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'principal';
ALTER TABLE public.commission_receipts ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'principal';
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'principal';
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'principal';

-- 2. ATUALIZAR VIEWS EXISTENTES (view_clients_dashboard)
-- Como a view_clients_dashboard é muito importante para pesquisar clientes, 
-- precisaremos que o 'tenant_id' seja acessível dentro dela.
-- NOTA: Se o Supabase der erro por modificar a view, você precisará recriar a View
-- ou adicionar o tenant_id pelo painel Visual do Supabase na aba Views.

-- CREATE OR REPLACE VIEW public.view_clients_dashboard AS
-- SELECT
--   c.*,
--   c.tenant_id, -- NOVA COLUNA ADICIONADA
--   ... resto do código da view atual ...
-- FROM public.clients c;

-- 3. PERMISSÃO DO NOVO INQUILINO (SISTEMA SECUNDÁRIO)
-- Quando precisarem ser criados cadastros do sistema isolado,
-- o Admin (você) precisará atualizar manualmente a coluna `tenant_id`
-- desses 2 usuários na aba 'users' ou 'user_permissions' no Supabase para 'parceiros',
-- ou então enviar o tenant_id respectivo ao criar.

-- BÔNUS: Forçar API do Supabase a reconhecer as novas colunas imediatamente
NOTIFY pgrst, 'reload schema';
