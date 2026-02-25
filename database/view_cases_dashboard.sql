-- Habilita a extensão unaccent se não existir
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Derruba a view existente para permitir mudanças nas colunas
DROP VIEW IF EXISTS view_cases_dashboard CASCADE;

CREATE VIEW view_cases_dashboard AS
SELECT 
    cs.*,
    c.nome_completo AS client_name,
    unaccent(c.nome_completo) AS client_name_unaccent,
    c.cpf_cnpj AS client_cpf,
    unaccent(cs.titulo) AS titulo_unaccent,
    c.filial AS filial,
    c.data_nascimento AS client_birth_date,
    c.sexo AS client_sexo,
    c.cidade AS client_city,
    c.captador AS captador
FROM cases cs
JOIN clients c ON cs.client_id = c.id;

-- Permissões para acesso à view (Supabase/PostgREST)
-- GRANT SELECT ON view_cases_dashboard TO authenticated;
-- GRANT SELECT ON view_cases_dashboard TO anon;
-- GRANT SELECT ON view_cases_dashboard TO service_role;
