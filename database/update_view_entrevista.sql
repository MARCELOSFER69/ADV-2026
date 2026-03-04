-- update_view_entrevista_v2.sql
-- Adiciona a coluna is_entrevista à view_clients_dashboard
-- Use DROP VIEW primeiro para evitar erro de renomeação de colunas no Postgres/Supabase

DROP VIEW IF EXISTS view_clients_dashboard;

CREATE OR REPLACE VIEW view_clients_dashboard AS
SELECT 
    c.*,
    unaccent(c.nome_completo) AS nome_completo_unaccent,
    CASE 
        -- Status 'Ativo'
        WHEN EXISTS (
            SELECT 1 FROM cases cs 
            WHERE cs.client_id = c.id 
            AND cs.status IN (
                'Ativo', 'Em Recurso', 'Análise', 'A Protocolar', 'Exigência', 'Aguardando Audiência'
            )
        ) THEN 'Ativo'
        -- Status 'Concedido'
        WHEN EXISTS (
            SELECT 1 FROM cases cs 
            WHERE cs.client_id = c.id 
            AND cs.status = 'Concluído (Concedido)'
        ) THEN 'Concedido'
        -- Status 'Inativo'
        ELSE 'Inativo'
    END AS status_calculado,
    
    COALESCE(cardinality(c.pendencias), 0) AS pendencias_count,

    -- Nova coluna: is_entrevista (Cidades da Lista CML)
    (
        unaccent(upper(c.cidade)) IN (
            'ANAJATUBA', 'ARAIOSES', 'BACABAL', 'BOM JARDIM', 'ICATU', 
            'MAGALHAES DE ALMEIDA', 'MATINHA', 'PACO DO LUMIAR', 
            'PEDRO DO ROSARIO', 'PINDARE-MIRIM', 'PINHEIRO', 'PIO XII', 
            'RAPOSA', 'SANTA INES', 'SANTA LUZIA DO PARUA', 
            'SANTA QUITERIA DO MARANHAO', 'SAO BERNARDO', 'SAO JOAO BATISTA', 
            'SAO JOSE DE RIBAMAR', 'SAO LUIS', 'TUTOIA', 'URBANO SANTOS', 
            'VIANA', 'ZE DOCA'
        )
    ) AS is_entrevista,

    -- Situação GPS
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
                ELSE 'pendente'
            END
    ) AS gps_status_calculado
FROM clients c;
