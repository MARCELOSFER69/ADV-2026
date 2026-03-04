-- ############################################################################
-- SUPER REPARO DASHBOARD & SEGURANÇA (VERSÃO DEFINITIVA)
-- Resolve: Processos Sumidos, Erro 406, Erro de Filtro por Filial
-- ############################################################################

DO $$ 
BEGIN
    -- 1. GARANTIA DE COLUNAS BASE (Caso tenham sumido em alguma migração)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'filial') THEN ALTER TABLE cases ADD COLUMN filial TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'filial') THEN ALTER TABLE clients ADD COLUMN filial TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'sexo') THEN ALTER TABLE clients ADD COLUMN sexo TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'data_nascimento') THEN ALTER TABLE clients ADD COLUMN data_nascimento DATE; END IF;

    -- 2. REPARO DE SEGURANÇA (system_settings) - Resolve Erro 406
    -- Reset total para garantir que não haja conflitos de políticas
    ALTER TABLE IF EXISTS system_settings DISABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Enable read access for all users" ON system_settings;
    DROP POLICY IF EXISTS "Allow select for all" ON system_settings;
    
    -- Se a tabela não existir, cria
    CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now()
    );

    -- Habilita RLS de forma permissiva para leitura
    ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Allow select for all" ON system_settings FOR SELECT USING (true);
    CREATE POLICY "Allow all for authenticated" ON system_settings FOR ALL USING (auth.role() = 'authenticated');

    -- Garante que exista um valor padrão para não dar erro no .single()
    INSERT INTO system_settings (key, value) 
    VALUES ('global_preferences', '{}'::jsonb)
    ON CONFLICT (key) DO NOTHING;

    -- 3. LIMPEZA DE VIEWS PARA RECONSTRUÇÃO
    DROP VIEW IF EXISTS view_clients_dashboard CASCADE;
    DROP VIEW IF EXISTS view_cases_dashboard CASCADE;
END $$;

-- 4. RECRIAÇÃO DA VIEW DE CLIENTES (Com Filtros e Contadores)
CREATE VIEW view_clients_dashboard AS
SELECT 
    c.*,
    unaccent(c.nome_completo) AS nome_completo_unaccent,
    COALESCE(cardinality(c.pendencias), 0) AS pendencias_count
FROM clients c;

-- 5. RECRIAÇÃO DA VIEW DE PROCESSOS (BLINDADA)
-- Join: LEFT JOIN para não sumir se o cliente estiver desalinhado
-- Filial: COALESCE para garantir que apareça nos filtros mesmo se preenchido só no cliente
CREATE VIEW view_cases_dashboard AS
SELECT 
    cs.*,
    c.nome_completo AS client_name,
    unaccent(c.nome_completo) AS client_name_unaccent,
    c.cpf_cnpj AS client_cpf,
    c.data_nascimento AS client_birth_date, -- Coluna essencial pro Kanban
    c.sexo AS client_sexo,               -- Coluna essencial pro Kanban
    unaccent(cs.titulo) AS titulo_unaccent,
    COALESCE(cs.filial, c.filial, 'Indefinida') AS filial -- FUNDAMENTAL PARA O FILTRO SANTA INÊS
FROM cases cs
LEFT JOIN clients c ON cs.client_id = c.id;

SELECT 'DASHBOARD REPARADO! Por favor, atualize a página (F5).' as status;
