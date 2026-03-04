-- ############################################################################
-- ATUALIZAÇÃO DA VIEW DE CLIENTES (AGREGAÇÃO DE PROCESSOS)
-- Adiciona a coluna 'casos_titulos' para visualização e busca
-- ############################################################################

DO $$ 
BEGIN
    -- Limpa a view anterior
    DROP VIEW IF EXISTS view_clients_dashboard CASCADE;
END $$;

CREATE VIEW view_clients_dashboard AS
SELECT 
    c.*,
    unaccent(c.nome_completo) AS nome_completo_unaccent,
    COALESCE(cardinality(c.pendencias), 0) AS pendencias_count,
    -- Agregação dos títulos dos processos
    COALESCE((
        SELECT string_agg(cs.titulo, ', ') 
        FROM cases cs 
        WHERE cs.client_id = c.id
    ), '') AS casos_titulos,
    -- Versão para busca rápida
    COALESCE((
        SELECT unaccent(string_agg(cs.titulo, ', ')) 
        FROM cases cs 
        WHERE cs.client_id = c.id
    ), '') AS casos_titulos_unaccent,
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

SELECT 'VIEW DE CLIENTES ATUALIZADA COM SUCESSO!' as status;
