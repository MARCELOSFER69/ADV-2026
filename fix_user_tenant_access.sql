-- SCRIPT PARA HABILITAR O 'ACESSO HM' NO GERENCIADOR DE EQUIPE

-- Adiciona a coluna tenant_id na tabela que gerencia as permissões dos usuários (se não existir)
ALTER TABLE public.user_permissions ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'principal';

-- Garante que todos os usuários já existentes tenham 'principal' por padrão
UPDATE public.user_permissions SET tenant_id = 'principal' WHERE tenant_id IS NULL;

-- Avisar a API do Supabase
NOTIFY pgrst, 'reload schema';
