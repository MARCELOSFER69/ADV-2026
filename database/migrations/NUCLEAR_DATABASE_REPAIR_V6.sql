-- ############################################################################
-- REPARO "NUCLEAR" E DEFINITIVO DO BANCO DE DADOS (V6)
-- Este script limpa gatilhos e garante TODAS as tabelas e colunas necessárias.
-- ############################################################################

DO $$
DECLARE
    trgname text;
BEGIN
    -- 1. LIMPEZA TOTAL DE GATILHOS (Evita conflitos e travamentos)
    FOR trgname IN (SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'cases') LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trgname || ' ON cases;';
    END LOOP;
    FOR trgname IN (SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'case_history') LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trgname || ' ON case_history;';
    END LOOP;

    -- 2. GARANTIA DE TABELAS ESSENCIAIS
    -- system_settings (Faltava no blueprint, causa erro 406)
    CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now()
    );

    -- tasks (Para gerenciamento de tarefas)
    CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
        titulo TEXT NOT NULL,
        concluido BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now()
    );

    -- notification_queue (Blindagem de campos)
    ALTER TABLE IF EXISTS notification_queue ALTER COLUMN message SET DEFAULT 'Atualização';
    ALTER TABLE IF EXISTS notification_queue ALTER COLUMN client_id DROP NOT NULL;

    -- 3. AJUSTES DE COLUNAS EM CASES E CLIENTS
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'fase_atual') THEN ALTER TABLE cases ADD COLUMN fase_atual TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'updated_at') THEN ALTER TABLE cases ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now(); END IF;
    
    -- Colunas RGP/REAP em Clients (se faltarem)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'rgp_status') THEN ALTER TABLE clients ADD COLUMN rgp_status TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'reap_status') THEN ALTER TABLE clients ADD COLUMN reap_status TEXT; END IF;

    -- 4. AJUSTE DE ENUMERADORES
    BEGIN
        ALTER TYPE case_priority ADD VALUE 'urgente';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

-- 5. FUNÇÃO DE NOTIFICAÇÃO 100% BLINDADA (Usa CONCAT para evitar NULLs)
CREATE OR REPLACE FUNCTION fn_trigger_case_history_to_notification()
RETURNS TRIGGER AS $$
DECLARE v_msg text;
BEGIN
    v_msg := CONCAT('Atualização: ', COALESCE(NEW.action, 'Alteração'), ' - ', COALESCE(NEW.details, 'Dados atualizados'));
    BEGIN
        INSERT INTO notification_queue (client_id, case_id, message, severity, status)
        VALUES ((SELECT client_id FROM cases WHERE id = NEW.case_id), NEW.case_id, v_msg, 'media', 'pendente');
    EXCEPTION WHEN OTHERS THEN RETURN NEW;
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. REINSTALAÇÃO DOS GATILHOS PADRONIZADOS
CREATE TRIGGER trg_history_to_notification_v6
AFTER INSERT ON case_history
FOR EACH ROW
EXECUTE FUNCTION fn_trigger_case_history_to_notification();

-- 7. VERIFICAÇÃO FINAL
SELECT 'REPARO V6 APLICADO! Tabelas system_settings, tasks e gatilhos corrigidos.' as status;
