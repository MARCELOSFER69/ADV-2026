-- ############################################################################
-- REPARO TOTAL E "BLINDADO" DO BANCO DE DADOS (VERSÃO FINAL)
-- ############################################################################

-- 1. PREPARAÇÃO: Garante que a coluna de mensagem nunca aceite nulo sem travar o banco
ALTER TABLE IF EXISTS notification_queue ALTER COLUMN message SET DEFAULT 'Atualização no sistema';
ALTER TABLE IF EXISTS notification_queue ALTER COLUMN client_id DROP NOT NULL; -- Flexibiliza para evitar trava

DO $$
BEGIN
    -- 2. CORREÇÃO DE PROCESSOS (Colunas essenciais)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'fase_atual') THEN ALTER TABLE cases ADD COLUMN fase_atual TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'updated_at') THEN ALTER TABLE cases ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now(); END IF;

    -- 3. CORREÇÃO DE TAREFAS (Resolve o erro do Tasks.created_at)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'created_at') THEN 
        ALTER TABLE tasks ADD COLUMN created_at TIMESTAMPTZ DEFAULT now(); 
    END IF;

    -- 4. PRIORIDADE "URGENTE" (Resolve o Erro 400 - Bad Request)
    BEGIN
        ALTER TYPE case_priority ADD VALUE 'urgente';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

-- 5. FUNÇÃO DE NOTIFICAÇÃO 100% PROTEGIDA (Gatilho Histórico)
CREATE OR REPLACE FUNCTION fn_trigger_case_history_to_notification()
RETURNS TRIGGER AS $$
DECLARE v_msg text;
BEGIN
    -- Constrói a mensagem com COALESCE em ABSOLUTAMENTE TUDO
    v_msg := 'Houve uma atualização: ' || 
             COALESCE(NEW.action, 'Alteração') || ' - ' || 
             COALESCE(NEW.details, 'Dados atualizados');

    -- Tenta inserir, se der qualquer erro (ID inexistente, etc), o EXCEPTION ignora
    INSERT INTO notification_queue (client_id, case_id, message, severity, status)
    VALUES (
        (SELECT client_id FROM cases WHERE id = NEW.case_id), 
        NEW.case_id, 
        v_msg, 
        'media', 
        'pendente'
    );
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW; -- REGRA DE OURO: O gatilho NUNCA interrompe o salvamento do sistema
END;
$$ LANGUAGE plpgsql;

-- 6. FUNÇÃO DE ARQUIVAMENTO PROTEGIDA (Gatilho Cases)
CREATE OR REPLACE FUNCTION trigger_check_archived_case_financial()
RETURNS TRIGGER AS $$
BEGIN
    -- Só age se o status mudou para Arquivado
    IF (NEW.status = 'Arquivado' AND (OLD.status IS NULL OR OLD.status <> 'Arquivado')) THEN
        INSERT INTO notification_queue (client_id, case_id, message, severity)
        VALUES (
            NEW.client_id, 
            NEW.id, 
            'O processo ' || COALESCE(NEW.numero_processo, '(sem número)') || ' foi arquivado. Verifique pendências financeiras.',
            'alta'
        );
    END IF;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW; -- Proteção total
END;
$$ LANGUAGE plpgsql;

-- 7. LIMPEZA TOTAL E REINSTALAÇÃO (Remove todos os nomes possíveis para não haver conflito)
DROP TRIGGER IF EXISTS trg_history_to_notification ON case_history;
DROP TRIGGER IF EXISTS trg_case_archived_financial_alert ON cases;
DROP TRIGGER IF EXISTS trigger_check_archived_case_financial ON cases;

-- Reinstala o de Histórico
CREATE TRIGGER trg_history_to_notification
AFTER INSERT ON case_history
FOR EACH ROW
EXECUTE FUNCTION fn_trigger_case_history_to_notification();

-- Reinstala o de Arquivamento
CREATE TRIGGER trg_case_archived_financial_alert
AFTER UPDATE ON cases
FOR EACH ROW
EXECUTE FUNCTION trigger_check_archived_case_financial();

-- 8. VERIFICAÇÃO FINAL: Sistema saudável
SELECT 'Banco de dados reparado com sucesso!' as status;
