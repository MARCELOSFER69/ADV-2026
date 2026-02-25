-- ############################################################################
-- REPARO TOTAL DO BANCO DE DADOS (COLUNAS + TRIGGERS SEM ERRO)
-- ############################################################################

-- 1. GARANTE TODAS AS COLUNAS NA TABELA CASES
DO $$
BEGIN
    -- Lista de colunas essenciais
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'fase_atual') THEN ALTER TABLE cases ADD COLUMN fase_atual TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'tipo') THEN ALTER TABLE cases ADD COLUMN tipo TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'modalidade') THEN ALTER TABLE cases ADD COLUMN modalidade TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'valor_causa') THEN ALTER TABLE cases ADD COLUMN valor_causa DECIMAL(12,2) DEFAULT 0; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'status_pagamento') THEN ALTER TABLE cases ADD COLUMN status_pagamento TEXT DEFAULT 'Pendente'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'valor_honorarios_pagos') THEN ALTER TABLE cases ADD COLUMN valor_honorarios_pagos DECIMAL(12,2) DEFAULT 0; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'anotacoes') THEN ALTER TABLE cases ADD COLUMN anotacoes TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'metadata') THEN ALTER TABLE cases ADD COLUMN metadata JSONB DEFAULT '{}'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'drive_folder_id') THEN ALTER TABLE cases ADD COLUMN drive_folder_id TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'motivo_arquivamento') THEN ALTER TABLE cases ADD COLUMN motivo_arquivamento TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'nit') THEN ALTER TABLE cases ADD COLUMN nit TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'der') THEN ALTER TABLE cases ADD COLUMN der DATE; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'nis') THEN ALTER TABLE cases ADD COLUMN nis TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'renda_familiar') THEN ALTER TABLE cases ADD COLUMN renda_familiar DECIMAL(12,2) DEFAULT 0; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'data_parto') THEN ALTER TABLE cases ADD COLUMN data_parto DATE; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'cid') THEN ALTER TABLE cases ADD COLUMN cid TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'data_incapacidade') THEN ALTER TABLE cases ADD COLUMN data_incapacidade DATE; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'gps_lista') THEN ALTER TABLE cases ADD COLUMN gps_lista JSONB DEFAULT '[]'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'updated_at') THEN ALTER TABLE cases ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now(); END IF;
END $$;

-- 2. FUNÇÃO DE NOTIFICAÇÃO (BLINDADA CONTRA VALORES NULL)
CREATE OR REPLACE FUNCTION fn_trigger_case_history_to_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_client_name text;
    v_case_number text;
    v_client_id uuid;
BEGIN
    -- Busca dados com LEFT JOIN por segurança
    SELECT c.nome_completo, c.id, cs.numero_processo 
    INTO v_client_name, v_client_id, v_case_number
    FROM cases cs
    LEFT JOIN clients c ON cs.client_id = c.id
    WHERE cs.id = NEW.case_id;

    -- Só tenta disparar se houver um new_value válido
    IF (NEW.new_value IS NOT NULL AND NEW.new_value <> '') THEN
        INSERT INTO notification_queue (client_id, case_id, message, severity)
        VALUES (
            COALESCE(v_client_id, (SELECT client_id FROM cases WHERE id = NEW.case_id)), 
            NEW.case_id, 
            'Olá ' || COALESCE(v_client_name, 'Cliente') || ', houve uma atualização no processo ' || COALESCE(v_case_number, '(sem número)') || ': ' || NEW.new_value,
            'media'
        );
    END IF;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- REGRA DE OURO: Gatilho de notificação JAMAIS deve impedir o salvamento do processo
    RAISE NOTICE 'Aviso: Falha ao gerar notificação no histórico (%), mas o processo foi salvo.', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. FUNÇÃO DE ARQUIVAMENTO (BLINDADA)
CREATE OR REPLACE FUNCTION trigger_check_archived_case_financial()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.status = 'Arquivado' AND (OLD.status IS NULL OR OLD.status <> 'Arquivado')) THEN
        INSERT INTO notification_queue (client_id, case_id, message, severity)
        VALUES (
            NEW.client_id, 
            NEW.id, 
            'O processo ' || COALESCE(NEW.numero_processo, NEW.titulo, '(sem número)') || ' foi arquivado. Verifique pendências financeiras.',
            'alta'
        );
    END IF;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Aviso: Falha ao gerar notificação de arquivamento, mas o processo foi salvo.';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. REINSTALAÇÃO LIMPA DOS TRIGGERS
-- Remove triggers antigos para evitar duplicidade ou conflitos
DROP TRIGGER IF EXISTS trg_history_to_notification ON case_history;
DROP TRIGGER IF EXISTS trg_case_archived_financial_alert ON cases;
DROP TRIGGER IF EXISTS trigger_check_archived_case_financial ON cases;

-- Re-instala
CREATE TRIGGER trg_history_to_notification
AFTER INSERT ON case_history
FOR EACH ROW
EXECUTE FUNCTION fn_trigger_case_history_to_notification();

CREATE TRIGGER trg_case_archived_financial_alert
AFTER UPDATE ON cases
FOR EACH ROW
EXECUTE FUNCTION trigger_check_archived_case_financial();
