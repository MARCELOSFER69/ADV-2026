-- Migração para habilitar busca insensível a acentos
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Atualizando view_clients_dashboard para incluir busca unaccent
CREATE OR REPLACE VIEW view_clients_dashboard AS
SELECT 
    c.*,
    unaccent(c.nome_completo) AS nome_completo_unaccent,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM cases cs 
            WHERE cs.client_id = c.id 
            AND cs.status IN ('Ativo', 'Em Recurso', 'Análise', 'A Protocolar', 'Exigência', 'Aguardando Audiência')
        ) THEN 'Ativo'
        WHEN EXISTS (
            SELECT 1 FROM cases cs 
            WHERE cs.client_id = c.id 
            AND cs.status = 'Concluído (Concedido)'
        ) THEN 'Concedido'
        ELSE 'Inativo'
    END AS status_calculado,
    COALESCE(cardinality(c.pendencias), 0) AS pendencias_count,
    (
        SELECT 
            CASE 
                WHEN EXISTS (
                    SELECT 1 FROM cases cs 
                    WHERE cs.client_id = c.id 
                    AND cs.status NOT IN ('Concluído (Concedido)', 'Arquivado')
                    AND EXISTS (
                        SELECT 1 FROM jsonb_array_elements(cs.gps_lista) AS g 
                        WHERE g->>'status' != 'Paga'
                    )
                ) THEN 'puxada'
                WHEN EXISTS (
                    SELECT 1 FROM cases cs 
                    WHERE cs.client_id = c.id 
                    AND cs.status NOT IN ('Concluído (Concedido)', 'Arquivado')
                    AND (cs.gps_lista IS NULL OR jsonb_array_length(cs.gps_lista) = 0)
                ) THEN 'pendente'
                WHEN EXISTS (
                    SELECT 1 FROM cases cs 
                    WHERE cs.client_id = c.id 
                    AND cs.status NOT IN ('Concluído (Concedido)', 'Arquivado')
                ) THEN 'regular'
                ELSE NULL
            END
    ) AS gps_status_calculado
FROM clients c;

-- Atualizando view_cases_dashboard para incluir busca unaccent
CREATE OR REPLACE VIEW view_cases_dashboard AS
SELECT 
    cs.*,
    c.nome_completo AS client_name,
    unaccent(c.nome_completo) AS client_name_unaccent,
    c.cpf_cnpj AS client_cpf,
    unaccent(cs.titulo) AS titulo_unaccent
FROM cases cs
JOIN clients c ON cs.client_id = c.id;
