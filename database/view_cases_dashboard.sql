-- view_cases_dashboard
-- Otimização para o sistema jurídico ADV-2026
-- Esta view centraliza a busca de processos com dados dos clientes,
-- permitindo filtros eficientes por nome e CPF sem joins no frontend.

CREATE OR REPLACE VIEW view_cases_dashboard AS
SELECT 
    cs.*,
    c.nome_completo AS client_name,
    c.cpf_cnpj AS client_cpf
FROM cases cs
JOIN clients c ON cs.client_id = c.id;

-- Permissões para acesso à view (Supabase/PostgREST)
-- GRANT SELECT ON view_cases_dashboard TO authenticated;
-- GRANT SELECT ON view_cases_dashboard TO anon;
-- GRANT SELECT ON view_cases_dashboard TO service_role;
