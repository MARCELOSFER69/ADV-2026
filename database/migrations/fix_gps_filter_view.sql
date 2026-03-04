-- ############################################################################
-- FIX GPS FILTER LOGIC (V5)
-- Recreates view_clients_dashboard with more inclusive GPS status logic.
-- Ensures 'pendente' is the default for clients with no cases or no guides.
-- ############################################################################

DROP VIEW IF EXISTS view_clients_dashboard CASCADE;

CREATE VIEW view_clients_dashboard AS
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
                -- 1. REGULAR (PAGO): Se houver pelo menos UMA guia marcada como 'Paga'
                WHEN EXISTS (
                    SELECT 1 FROM cases cs 
                    WHERE cs.client_id = c.id 
                    AND EXISTS (
                        SELECT 1 FROM jsonb_array_elements(cs.gps_lista) AS g 
                        WHERE g->>'status' = 'Paga'
                    )
                ) THEN 'regular'
                
                -- 2. PUXADA (A PAGAR): Se houver guias puxadas mas NENHUMA é 'Paga'
                WHEN EXISTS (
                    SELECT 1 FROM cases cs 
                    WHERE cs.client_id = c.id 
                    AND cs.gps_lista IS NOT NULL AND jsonb_array_length(cs.gps_lista) > 0
                ) THEN 'puxada'
                
                -- 3. PENDENTE: Fallback para todos os outros casos (sem guias ou sem processos)
                ELSE 'pendente'
            END
    ) AS gps_status_calculado
FROM clients c;
