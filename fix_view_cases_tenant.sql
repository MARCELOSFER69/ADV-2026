-- SCRIPT PARA RECRIAR A VIEW DE PROCESSOS (CASES) E ADICIONAR A COLUNA TENANT_ID NELA
-- Corrigido para remover a coluna 'filial' duplicada.

DROP VIEW IF EXISTS view_cases_dashboard CASCADE;

CREATE VIEW view_cases_dashboard AS
SELECT 
    cs.*,
    c.nome_completo AS client_name,
    unaccent(c.nome_completo) AS client_name_unaccent,
    c.cpf_cnpj AS client_cpf,
    unaccent(cs.titulo) AS titulo_unaccent
FROM cases cs
JOIN clients c ON cs.client_id = c.id;

-- Forçar API do Supabase a atualizar e injetar a view no cache
NOTIFY pgrst, 'reload schema';
