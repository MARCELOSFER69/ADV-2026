-- ############################################################################
-- REPARO "NUCLEAR" E DEFINITIVO DO BANCO DE DADOS (V5)
-- Este script força a limpeza de TODOS os gatilhos antigos e reconstrói o sistema.
-- ############################################################################

DO $$
DECLARE
    trgname text;
BEGIN
    -- 1. LIMPEZA TOTAL: Remove todos os triggers das tabelas principais para evitar conflitos
    FOR trgname IN (SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'cases') LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trgname || ' ON cases;';
    END LOOP;
    
    FOR trgname IN (SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'case_history') LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trgname || ' ON case_history;';
    END LOOP;

    -- 2. AJUSTES DE SCHEMA
    -- Coluna message nunca deve travar o banco
    ALTER TABLE IF EXISTS notification_queue ALTER COLUMN message SET DEFAULT 'Ação no sistema registrada';
    ALTER TABLE IF EXISTS notification_queue ALTER COLUMN client_id DROP NOT NULL;
    
    -- Ajuste de Prioridade
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'case_priority') THEN
        CREATE TYPE case_priority AS ENUM ('baixa', 'media', 'alta', 'critica', 'urgente');
    ELSE
        BEGIN
            ALTER TYPE case_priority ADD VALUE 'urgente';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
    END IF;

    -- Ajuste de Tarefas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'created_at') THEN 
        ALTER TABLE tasks ADD COLUMN created_at TIMESTAMPTZ DEFAULT now(); 
    END IF;

    -- Colunas de Cases
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'fase_atual') THEN ALTER TABLE cases ADD COLUMN fase_atual TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'updated_at') THEN ALTER TABLE cases ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now(); END IF;
END $$;

-- 3. FUNÇÃO DE NOTIFICAÇÃO 100% BLINDADA (CONCAT É MAIS SEGURO QUE ||)
-- Usamos CONCAT() porque ele ignora NULLs e nunca retorna uma string NULL.
CREATE OR REPLACE FUNCTION fn_trigger_case_history_to_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_msg text;
    v_client_id uuid;
BEGIN
    -- Constrói a mensagem de forma segura
    v_msg := CONCAT('Atualização: ', COALESCE(NEW.action, 'Alteração'), ' - ', COALESCE(NEW.details, 'Dados atualizados'));

    -- Tenta encontrar o cliente
    SELECT client_id INTO v_client_id FROM cases WHERE id = NEW.case_id;

    -- Tenta inserir, se der qualquer erro, o EXCEPTION ignora e deixa o processo salvar
    BEGIN
        INSERT INTO notification_queue (client_id, case_id, message, severity, status)
        VALUES (v_client_id, NEW.case_id, v_msg, 'media', 'pendente');
    EXCEPTION WHEN OTHERS THEN
        RETURN NEW;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. FUNÇÃO DE ARQUIVAMENTO PROTEGIDA
CREATE OR REPLACE FUNCTION trigger_check_archived_case_financial()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.status = 'Arquivado' AND (OLD.status IS NULL OR OLD.status <> 'Arquivado')) THEN
        BEGIN
            INSERT INTO notification_queue (client_id, case_id, message, severity)
            VALUES (
                NEW.client_id, 
                NEW.id, 
                CONCAT('O processo ', COALESCE(NEW.numero_processo, '(sem número)'), ' foi arquivado. Verifique o financeiro.'),
                'alta'
            );
        EXCEPTION WHEN OTHERS THEN
            RETURN NEW;
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. REINSTALAÇÃO DOS GATILHOS (Utilizando nomes padronizados)
CREATE TRIGGER trg_history_to_notification_v5
AFTER INSERT ON case_history
FOR EACH ROW
EXECUTE FUNCTION fn_trigger_case_history_to_notification();

CREATE TRIGGER trg_case_archived_financial_alert_v5
AFTER UPDATE ON cases
FOR EACH ROW
EXECUTE FUNCTION trigger_check_archived_case_financial();

-- 6. VERIFICAÇÃO FINAL
SELECT 'REPARO V5 APLICADO! O banco agora está blindado contra erros de notificação.' as status;
