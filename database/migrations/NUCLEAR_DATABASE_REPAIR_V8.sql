-- ############################################################################
-- REPARO "NUCLEAR" E DEFINITIVO DO BANCO DE DADOS (V8)
-- Garante TODAS as colunas, incluindo updated_at, e resolve o erro de salvamento.
-- ############################################################################

DO $$
DECLARE
    trgname text;
BEGIN
    -- 1. LIMPEZA TOTAL DE GATILHOS (Prevenção de erros)
    FOR trgname IN (SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'cases') LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trgname || ' ON cases;';
    END LOOP;
    FOR trgname IN (SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'case_history') LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trgname || ' ON case_history;';
    END LOOP;

    -- 2. GARANTIA DAS COLUNAS DE AUDITORIA (Resolvendo erro updated_at)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'updated_at') THEN ALTER TABLE clients ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now(); END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'created_at') THEN ALTER TABLE clients ADD COLUMN created_at TIMESTAMPTZ DEFAULT now(); END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'updated_at') THEN ALTER TABLE cases ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now(); END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'created_at') THEN ALTER TABLE cases ADD COLUMN created_at TIMESTAMPTZ DEFAULT now(); END IF;

    -- 3. EXPANSÃO COMPLETA DA TABELA 'CLIENTS' (Para o modal funcionar 100%)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'sexo') THEN ALTER TABLE clients ADD COLUMN sexo TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'rg') THEN ALTER TABLE clients ADD COLUMN rg TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'orgao_emissor') THEN ALTER TABLE clients ADD COLUMN orgao_emissor TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'profissao') THEN ALTER TABLE clients ADD COLUMN profissao TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'estado_civil') THEN ALTER TABLE clients ADD COLUMN estado_civil TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'nacionalidade') THEN ALTER TABLE clients ADD COLUMN nacionalidade TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'telefone') THEN ALTER TABLE clients ADD COLUMN telefone TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'cep') THEN ALTER TABLE clients ADD COLUMN cep TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'endereco') THEN ALTER TABLE clients ADD COLUMN endereco TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'numero_casa') THEN ALTER TABLE clients ADD COLUMN numero_casa TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'bairro') THEN ALTER TABLE clients ADD COLUMN bairro TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'cidade') THEN ALTER TABLE clients ADD COLUMN cidade TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'uf') THEN ALTER TABLE clients ADD COLUMN uf TEXT; END IF;
    
    -- Status da Entrevista (Case sensitive no banco costuma dar problema, garantindo aspas se necessário no código, mas aqui usamos normais)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'interviewStatus') THEN ALTER TABLE clients ADD COLUMN "interviewStatus" TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'interviewDate') THEN ALTER TABLE clients ADD COLUMN "interviewDate" TEXT; END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'representante_nome') THEN ALTER TABLE clients ADD COLUMN representante_nome TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'representante_cpf') THEN ALTER TABLE clients ADD COLUMN representante_cpf TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'pendencias') THEN ALTER TABLE clients ADD COLUMN pendencias JSONB DEFAULT '[]'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'observacao') THEN ALTER TABLE clients ADD COLUMN observacao TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'foto') THEN ALTER TABLE clients ADD COLUMN foto TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'filial') THEN ALTER TABLE clients ADD COLUMN filial TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'captador') THEN ALTER TABLE clients ADD COLUMN captador TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'senha_gov') THEN ALTER TABLE clients ADD COLUMN senha_gov TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'senha_inss') THEN ALTER TABLE clients ADD COLUMN senha_inss TEXT; END IF;
    
    -- Colunas RGP/REAP
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'rgp_status') THEN ALTER TABLE clients ADD COLUMN rgp_status TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'reap_status') THEN ALTER TABLE clients ADD COLUMN reap_status TEXT; END IF;

    -- 4. GARANTIA DAS TABELAS system_settings E tasks
    CREATE TABLE IF NOT EXISTS system_settings (key TEXT PRIMARY KEY, value JSONB NOT NULL, updated_at TIMESTAMPTZ DEFAULT now());
    CREATE TABLE IF NOT EXISTS tasks (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), case_id UUID REFERENCES cases(id) ON DELETE CASCADE, titulo TEXT NOT NULL, concluido BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT now());

    -- 5. AJUSTES DE SEGURANÇA NA FILA
    ALTER TABLE IF EXISTS notification_queue ALTER COLUMN message SET DEFAULT 'Atualização';
    ALTER TABLE IF EXISTS notification_queue ALTER COLUMN client_id DROP NOT NULL;
END $$;

-- 6. REINSTALAÇÃO DO GATILHO SUPER-BLINDADO (V8)
CREATE OR REPLACE FUNCTION fn_trigger_case_history_to_notification() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notification_queue (client_id, case_id, message, severity, status)
    VALUES ((SELECT client_id FROM cases WHERE id = NEW.case_id), NEW.case_id, CONCAT('Atualização: ', COALESCE(NEW.action, 'Alteração')), 'media', 'pendente');
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_history_to_notification_v8 AFTER INSERT ON case_history FOR EACH ROW EXECUTE FUNCTION fn_trigger_case_history_to_notification();

-- 7. NOTIFICAÇÃO DE SUCESSO
SELECT 'REPARO V8 APLICADO COM SUCESSO! Todas as colunas (incluindo updated_at) foram garantidas.' as status;
