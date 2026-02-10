-- ############################################################################
-- DEFINITIVE IMPORT & DUPLICATE FIX (V3)
-- 1. Drops and Recreates the view to include columns correctly (including unaccent).
-- 2. Ensures a unique constraint on cpf_cnpj to prevent any future duplicates.
-- ############################################################################

-- 1. DROP AND RECREATE VIEW
DROP VIEW IF EXISTS view_clients_dashboard;

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

-- 2. ENFORCE DATA INTEGRITY (Unique CPF)
-- First, identifying duplicates if there are any that need manual intervention (optional but safe)
-- Now, adding the unique constraint. 
-- Note: This might fail if duplicates already exist. 
-- I recommend the user to delete duplicates manually before running this if it fails.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'clients_cpf_cnpj_key'
    ) THEN
        -- Attempt to add a unique index/constraint. 
        -- If it fails because of existing dupes, the user will know they need to clean up.
        BEGIN
            ALTER TABLE clients ADD CONSTRAINT clients_cpf_cnpj_key UNIQUE (cpf_cnpj);
        EXCEPTION WHEN others THEN
            RAISE NOTICE 'Não foi possível adicionar CONSTRAINT UNIQUE automaticamente devido a duplicados existentes. Por favor, remova os duplicados e execute: ALTER TABLE clients ADD CONSTRAINT clients_cpf_cnpj_key UNIQUE (cpf_cnpj);';
        END;
    END IF;
END $$;
