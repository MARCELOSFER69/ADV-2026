-- ############################################################################
-- ATUALIZAÇÃO DA VIEW DE CLIENTES (VERSÃO MERGE - PROCESSOS + ENTREVISTA)
-- Adiciona busca por processos preservando a lógica de entrevista do Marcelo
-- ############################################################################

DROP VIEW IF EXISTS view_clients_dashboard CASCADE;

CREATE OR REPLACE VIEW view_clients_dashboard AS
SELECT 
    c.*,
    unaccent(c.nome_completo) AS nome_completo_unaccent,
    -- NOVO: Agregação de Processos
    COALESCE((SELECT string_agg(cs.titulo, ', ') FROM cases cs WHERE cs.client_id = c.id), '') AS casos_titulos,
    COALESCE((SELECT unaccent(string_agg(cs.titulo, ', ')) FROM cases cs WHERE cs.client_id = c.id), '') AS casos_titulos_unaccent,
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
    -- PRESERVADO: Lógica de Entrevista do Marcelo
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
    -- PRESERVADO/CORRIGIDO: Status GPS
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
