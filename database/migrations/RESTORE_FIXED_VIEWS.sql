-- ############################################################################
-- RESTAURAÇÃO DAS VIEWS DO DASHBOARD (VERSÃO BLINDADA)
-- Garante todas as colunas necessárias e resolve o sumiço dos processos
-- ############################################################################

DO $$ 
BEGIN
    -- 1. Garante que as colunas base existam para evitar erro na View
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'filial') THEN 
        ALTER TABLE cases ADD COLUMN filial TEXT; 
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'filial') THEN 
        ALTER TABLE clients ADD COLUMN filial TEXT; 
    END IF;

    -- 2. Dropar views para recriação limpa
    DROP VIEW IF EXISTS view_clients_dashboard CASCADE;
    DROP VIEW IF EXISTS view_cases_dashboard CASCADE;
END $$;

-- 3. VIEW DE CLIENTES (Restaurada com GPS Status)
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

-- 4. VIEW DE PROCESSOS (Restaurada com TODAS as colunas do Kanban)
CREATE VIEW view_cases_dashboard AS
SELECT 
    cs.*,
    c.nome_completo AS client_name,
    unaccent(c.nome_completo) AS client_name_unaccent,
    c.cpf_cnpj AS client_cpf,
    c.data_nascimento AS client_birth_date,
    c.sexo AS client_sexo,
    COALESCE(cs.filial, c.filial) AS filial_combined, -- Para uso interno se necessário
    unaccent(cs.titulo) AS titulo_unaccent
FROM cases cs
JOIN clients c ON cs.client_id = c.id;

SELECT 'SISTEMA RESTAURADO! Os processos devem voltar a aparecer agora.' as status;
