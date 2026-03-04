-- ############################################################################
-- REPARO DASHBOARD V2 (CORREÇÃO DE COLUNA DUPLICADA)
-- ############################################################################

DO $$ 
BEGIN
    -- 1. Garante colunas base
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'filial') THEN ALTER TABLE cases ADD COLUMN filial TEXT; END IF;
    
    -- 2. Resolve Erro 406
    ALTER TABLE IF EXISTS system_settings DISABLE ROW LEVEL SECURITY;
    CREATE TABLE IF NOT EXISTS system_settings (key TEXT PRIMARY KEY, value JSONB NOT NULL, updated_at TIMESTAMPTZ DEFAULT now());
    INSERT INTO system_settings (key, value) VALUES ('global_preferences', '{}'::jsonb) ON CONFLICT DO NOTHING;
    ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow select for all" ON system_settings;
    CREATE POLICY "Allow select for all" ON system_settings FOR SELECT USING (true);

    -- 3. Limpa views
    DROP VIEW IF EXISTS view_clients_dashboard CASCADE;
    DROP VIEW IF EXISTS view_cases_dashboard CASCADE;
END $$;

-- Recria View de Clientes
CREATE VIEW view_clients_dashboard AS SELECT c.*, unaccent(c.nome_completo) AS nome_completo_unaccent FROM clients c;

-- Recria View de Processos SEM DUPLICAR a coluna filial
-- Usamos um subquery para remover a filial original e substituir pela coalesced
CREATE VIEW view_cases_dashboard AS
SELECT 
    cs.id, cs.client_id, cs.titulo, cs.numero_processo, cs.tribunal, cs.valor_causa, 
    cs.status, cs.tipo, cs.modalidade, cs.data_abertura, cs.status_pagamento, 
    cs.valor_honorarios_pagos, cs.data_fatal, cs.honorarios_forma_pagamento, 
    cs.honorarios_recebedor, cs.honorarios_tipo_conta, cs.honorarios_conta, 
    cs.gps_lista, cs.updated_at, cs.created_at,
    c.nome_completo AS client_name, 
    unaccent(c.nome_completo) AS client_name_unaccent,
    c.cpf_cnpj AS client_cpf, 
    c.data_nascimento AS client_birth_date, 
    c.sexo AS client_sexo,
    unaccent(cs.titulo) AS titulo_unaccent,
    COALESCE(cs.filial, c.filial, 'Indefinida') AS filial
FROM cases cs
LEFT JOIN clients c ON cs.client_id = c.id;

SELECT 'DASHBOARD REPARADO (V2)! Agora pode dar F5.' as status;
