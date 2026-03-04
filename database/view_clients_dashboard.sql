-- view_clients_dashboard
-- Otimização para o sistema jurídico ADV-2026

DROP VIEW IF EXISTS view_clients_dashboard CASCADE;

CREATE OR REPLACE VIEW view_clients_dashboard AS
SELECT 
    c.*,
    unaccent(c.nome_completo) AS nome_completo_unaccent,
    CASE 
        -- Status 'Ativo': Pelo menos um processo em andamento
        WHEN EXISTS (
            SELECT 1 FROM cases cs 
            WHERE cs.client_id = c.id 
            AND cs.status IN (
                'Ativo', 
                'Em Recurso', 
                'Análise', 
                'A Protocolar', 
                'Exigência', 
                'Aguardando Audiência'
            )
        ) THEN 'Ativo'
        
        -- Status 'Concedido': Se não houver ativos, verifica se há algum concedido
        WHEN EXISTS (
            SELECT 1 FROM cases cs 
            WHERE cs.client_id = c.id 
            AND cs.status = 'Concluído (Concedido)'
        ) THEN 'Concedido'

        -- Status 'Indeferido': Se não houver ativos nem concedidos, verifica se há algum indeferido
        WHEN EXISTS (
            SELECT 1 FROM cases cs 
            WHERE cs.client_id = c.id 
            AND cs.status = 'Concluído (Indeferido)'
        ) THEN 'Indeferido'
        
        -- Status 'Inativo': O cliente existe mas não possui NENHUM processo cadastrado
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

    -- Títulos dos casos agregados para exibição simplificada
    (
        SELECT string_agg(cs.titulo, ', ') 
        FROM cases cs 
        WHERE cs.client_id = c.id
        AND cs.status != 'Arquivado'
    ) AS casos_titulos,
    (
        SELECT unaccent(COALESCE(string_agg(cs.titulo, ', '), ''))
        FROM cases cs 
        WHERE cs.client_id = c.id
        AND cs.status != 'Arquivado'
    ) AS casos_titulos_unaccent,

    -- Nova coluna para Situação GPS (Cálculo no Banco)
    (
        SELECT 
            CASE 
                -- 1. Se existir qualquer processo ativo com pelo menos uma guia NÃO PAGA
                WHEN EXISTS (
                    SELECT 1 FROM cases cs 
                    WHERE cs.client_id = c.id 
                    AND cs.status NOT IN ('Concluído (Concedido)', 'Arquivado')
                    AND EXISTS (
                        SELECT 1 FROM jsonb_array_elements(cs.gps_lista) AS g 
                        WHERE g->>'status' != 'Paga'
                    )
                ) THEN 'puxada'
                
                -- 2. Se existir qualquer processo ativo SEM NENHUMA GUIA
                WHEN EXISTS (
                    SELECT 1 FROM cases cs 
                    WHERE cs.client_id = c.id 
                    AND cs.status NOT IN ('Concluído (Concedido)', 'Arquivado')
                    AND (cs.gps_lista IS NULL OR jsonb_array_length(cs.gps_lista) = 0)
                ) THEN 'pendente'
                
                -- 3. Se houver processos ativos e nada pendente -> REGULAR
                WHEN EXISTS (
                    SELECT 1 FROM cases cs 
                    WHERE cs.client_id = c.id 
                    AND cs.status NOT IN ('Concluído (Concedido)', 'Arquivado')
                ) THEN 'regular'
                
                ELSE 'pendente'
            END
    ) AS gps_status_calculado
FROM clients c;
