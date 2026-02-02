-- view_clients_dashboard
-- Otimização para o sistema jurídico ADV-2026
-- Esta view centraliza o cálculo de status e pendências no banco de dados,
-- evitando o download massivo de processos pelo frontend.

CREATE OR REPLACE VIEW view_clients_dashboard AS
SELECT 
    c.*,
    CASE 
        -- Status 'Ativo': Pelo menos um processo em andamento ou explicitamente 'Ativo'
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
        
        -- Status 'Inativo': Todos arquivados ou cliente sem nenhum processo
        ELSE 'Inativo'
    END AS status_calculado,
    
    -- Contagem de pendências (cardinalidade do array de texto)
    COALESCE(cardinality(c.pendencias), 0) AS pendencias_count
FROM clients c;

-- Índices recomendados para performance (Executar se ainda não existirem)
-- CREATE INDEX IF NOT EXISTS idx_cases_client_id_status ON cases(client_id, status);
-- CREATE INDEX IF NOT EXISTS idx_clients_id ON clients(id);
