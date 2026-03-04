-- Versão Marcelo V2: Refina a lógica de "Inativo" e adiciona "Indeferido" (Vermelho)
DROP VIEW IF EXISTS view_clients_dashboard CASCADE;

CREATE OR REPLACE VIEW view_clients_dashboard AS
SELECT 
    c.*,
    unaccent(c.nome_completo) AS nome_completo_unaccent,
    COALESCE((SELECT string_agg(cs.tipo || COALESCE(' (' || cs.modalidade || ')', ''), ', ') FROM cases cs WHERE cs.client_id = c.id), '') AS casos_titulos,
    COALESCE((SELECT unaccent(string_agg(cs.tipo || COALESCE(' (' || cs.modalidade || ')', ''), ', ')) FROM cases cs WHERE cs.client_id = c.id), '') AS casos_titulos_unaccent,
    CASE 
        -- Prioridade 1: Qualquer processo ativo
        WHEN EXISTS (
            SELECT 1 FROM cases cs 
            WHERE cs.client_id = c.id 
            AND cs.status IN ('Ativo', 'Em Recurso', 'Análise', 'A Protocolar', 'Exigência', 'Aguardando Audiência')
        ) THEN 'Ativo'
        -- Prioridade 2: Sem ativos, mas com algum concedido
        WHEN EXISTS (
            SELECT 1 FROM cases cs 
            WHERE cs.client_id = c.id 
            AND cs.status IN ('Concluído (Concedido)', 'Concedido')
        ) THEN 'Concedido'
        -- Prioridade 3: Sem ativos/concedidos, mas TEM processos (Ex: Indeferido, Arquivado)
        WHEN EXISTS (
            SELECT 1 FROM cases cs 
            WHERE cs.client_id = c.id
        ) THEN 'Indeferido'
        -- Prioridade 4: Absolutamente NENHUM processo
        ELSE 'Inativo'
    END AS status_calculado,
    COALESCE(cardinality(c.pendencias), 0) AS pendencias_count,
    (unaccent(upper(c.cidade)) IN ('ANAJATUBA', 'ARAIOSES', 'BACABAL', 'BOM JARDIM', 'ICATU', 'MAGALHAES DE ALMEIDA', 'MATINHA', 'PACO DO LUMIAR', 'PEDRO DO ROSARIO', 'PINDARE-MIRIM', 'PINHEIRO', 'PIO XII', 'RAPOSA', 'SANTA INES', 'SANTA LUZIA DO PARUA', 'SANTA QUITERIA DO MARANHAO', 'SAO BERNARDO', 'SAO JOAO BATISTA', 'SAO JOSE DE RIBAMAR', 'SAO LUIS', 'TUTOIA', 'URBANO SANTOS', 'VIANA', 'ZE DOCA')) AS is_entrevista,
    (SELECT CASE WHEN EXISTS (SELECT 1 FROM cases cs WHERE cs.client_id = c.id AND cs.status NOT IN ('Concluído (Concedido)', 'Concedido', 'Arquivado') AND EXISTS (SELECT 1 FROM jsonb_array_elements(cs.gps_lista) AS g WHERE g->>'status' != 'Paga')) THEN 'puxada' WHEN EXISTS (SELECT 1 FROM cases cs WHERE cs.client_id = c.id AND cs.status NOT IN ('Concluído (Concedido)', 'Concedido', 'Arquivado') AND (cs.gps_lista IS NULL OR jsonb_array_length(cs.gps_lista) = 0)) THEN 'pendente' WHEN EXISTS (SELECT 1 FROM cases cs WHERE cs.client_id = c.id AND cs.status NOT IN ('Concluído (Concedido)', 'Concedido', 'Arquivado')) THEN 'regular' ELSE 'pendente' END) AS gps_status_calculado
FROM clients c;
