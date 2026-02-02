-- ############################################################################
-- CORREÇÃO FINAL: COLUNAS FALTANTES + BUG DO TRIGGER (VALOR NULL)
-- ############################################################################

DO $$
BEGIN
    -- 1. GARANTE TODAS AS COLUNAS NA TABELA CASES
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'fase_atual') THEN ALTER TABLE cases ADD COLUMN fase_atual TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'tipo') THEN ALTER TABLE cases ADD COLUMN tipo TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'modalidade') THEN ALTER TABLE cases ADD COLUMN modalidade TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'valor_causa') THEN ALTER TABLE cases ADD COLUMN valor_causa DECIMAL(12,2); END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'status_pagamento') THEN ALTER TABLE cases ADD COLUMN status_pagamento TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'valor_honorarios_pagos') THEN ALTER TABLE cases ADD COLUMN valor_honorarios_pagos DECIMAL(12,2); END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'anotacoes') THEN ALTER TABLE cases ADD COLUMN anotacoes TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'metadata') THEN ALTER TABLE cases ADD COLUMN metadata JSONB DEFAULT '{}'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'drive_folder_id') THEN ALTER TABLE cases ADD COLUMN drive_folder_id TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'motivo_arquivamento') THEN ALTER TABLE cases ADD COLUMN motivo_arquivamento TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'nit') THEN ALTER TABLE cases ADD COLUMN nit TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'der') THEN ALTER TABLE cases ADD COLUMN der DATE; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'nis') THEN ALTER TABLE cases ADD COLUMN nis TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'renda_familiar') THEN ALTER TABLE cases ADD COLUMN renda_familiar DECIMAL(12,2); END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'data_parto') THEN ALTER TABLE cases ADD COLUMN data_parto DATE; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'cid') THEN ALTER TABLE cases ADD COLUMN cid TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'data_incapacidade') THEN ALTER TABLE cases ADD COLUMN data_incapacidade DATE; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'gps_lista') THEN ALTER TABLE cases ADD COLUMN gps_lista JSONB DEFAULT '[]'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'updated_at') THEN ALTER TABLE cases ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now(); END IF;
END $$;

-- 2. CORREÇÃO DA FUNÇÃO DO TRIGGER (EVITA ERRO DE VALOR NULL NO MESSAGE)
-- Esta função é responsável por gerar notificações automáticas.
CREATE OR REPLACE FUNCTION fn_trigger_case_history_to_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_client_name text;
    v_case_number text;
    v_client_id uuid;
BEGIN
    -- Busca dados do cliente e do processo para a mensagem
    -- Usamos LEFT JOIN para garantir que, mesmo se houver erro nos IDs, o trigger não trave o salvamento
    SELECT c.nome_completo, c.id, cs.numero_processo 
    INTO v_client_name, v_client_id, v_case_number
    FROM cases cs
    LEFT JOIN clients c ON cs.client_id = c.id
    WHERE cs.id = NEW.case_id;

    -- Só gera notificação se houver uma mudança de valor (new_value)
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
END;
$$ LANGUAGE plpgsql;

-- 3. GARANTE QUE O TRIGGER ESTEJA USANDO A FUNÇÃO CORRIGIDA
DROP TRIGGER IF EXISTS trg_history_to_notification ON case_history;
CREATE TRIGGER trg_history_to_notification
AFTER INSERT ON case_history
FOR EACH ROW
EXECUTE FUNCTION fn_trigger_case_history_to_notification();
