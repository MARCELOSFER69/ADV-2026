-- ############################################################################
-- REPARO DASHBOARD V3 (TOTALMENTE BLINDADO)
-- Resolve: Colunas faltantes, Colunas duplicadas, Erro 406 e Sumiço
-- ############################################################################

DO $$ 
BEGIN
    -- 1. Garante que as colunas auditáveis existam (Prevenção de Erro 42703)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'created_at') THEN ALTER TABLE cases ADD COLUMN created_at TIMESTAMPTZ DEFAULT now(); END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'updated_at') THEN ALTER TABLE cases ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now(); END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'filial') THEN ALTER TABLE cases ADD COLUMN filial TEXT; END IF;
    
    -- 2. Resolve Erro 406 (Acesso a Configurações)
    ALTER TABLE IF EXISTS system_settings DISABLE ROW LEVEL SECURITY;
    CREATE TABLE IF NOT EXISTS system_settings (key TEXT PRIMARY KEY, value JSONB NOT NULL, updated_at TIMESTAMPTZ DEFAULT now());
    INSERT INTO system_settings (key, value) VALUES ('global_preferences', '{}'::jsonb) ON CONFLICT DO NOTHING;
    ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow select for all settings" ON system_settings;
    CREATE POLICY "Allow select for all settings" ON system_settings FOR SELECT USING (true);

    -- 3. Limpa views com segurança (CASCADE)
    DROP VIEW IF EXISTS view_clients_dashboard CASCADE;
    DROP VIEW IF EXISTS view_cases_dashboard CASCADE;
END $$;

-- 4. Recria View de Clientes (Unaccent e Status GPS)
CREATE VIEW view_clients_dashboard AS 
SELECT c.*, unaccent(c.nome_completo) AS nome_completo_unaccent 
FROM clients c;

-- 5. Recria View de Processos com Join Seguro e COALESCE de Filial
-- Usamos explicitamente as colunas para evitar o erro de colunas duplicadas ou faltantes
CREATE VIEW view_cases_dashboard AS
SELECT 
    cs.id,
    cs.client_id,
    cs.titulo,
    cs.numero_processo,
    cs.tribunal,
    cs.valor_causa,
    cs.status,
    cs.tipo,
    cs.modalidade,
    cs.data_abertura,
    cs.status_pagamento,
    cs.gps_lista,
    cs.created_at,
    cs.updated_at,
    c.nome_completo AS client_name, 
    unaccent(c.nome_completo) AS client_name_unaccent,
    c.cpf_cnpj AS client_cpf,
    c.data_nascimento AS client_birth_date,
    c.sexo AS client_sexo,
    unaccent(cs.titulo) AS titulo_unaccent,
    COALESCE(cs.filial, c.filial, 'Indefinida') AS filial -- Unifica a filial para o filtro do sistema
FROM cases cs
LEFT JOIN clients c ON cs.client_id = c.id;

SELECT 'DASHBOARD REPARADO V3! Todos os processos devem aparecer agora.' as status;
