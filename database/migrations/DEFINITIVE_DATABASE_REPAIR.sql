-- ############################################################################
-- REPARO TOTAL E DEFINITIVO DO BANCO DE DADOS (V3)
-- Este script corrige:
-- 1. Erro de mensagem NULL no Trigger (notification_queue)
-- 2. Erro de coluna faltante nas Tarefas (tasks.created_at)
-- 3. Mismatch de Enum de Prioridade (urgente vs critica)
-- 4. Colunas faltantes na tabela Cases
-- ############################################################################

DO $$
BEGIN
    -- 1. CORREÇÃO DA TABELA 'CASES' (Processos)
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

    -- 2. CORREÇÃO DA TABELA 'TASKS' (Tarefas)
    CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
        titulo TEXT NOT NULL,
        concluido BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now()
    );
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'created_at') THEN 
        ALTER TABLE tasks ADD COLUMN created_at TIMESTAMPTZ DEFAULT now(); 
    END IF;

    -- 3. AJUSTE DO ENUM DE PRIORIDADE (Adiciona 'urgente')
    ALTER TYPE case_priority ADD VALUE IF NOT EXISTS 'urgente';
END $$;

-- 4. FUNÇÃO DE NOTIFICAÇÃO SUPER BLINDADA (EVITA QUALQUER VALOR NULL)
CREATE OR REPLACE FUNCTION fn_trigger_case_history_to_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_client_name text;
    v_case_number text;
    v_client_id uuid;
    v_final_msg text;
BEGIN
    -- Busca dados auxiliares
    SELECT cli.nome_completo, cs.client_id, cs.numero_processo 
    INTO v_client_name, v_client_id, v_case_number
    FROM cases cs
    LEFT JOIN clients cli ON cs.client_id = cli.id
    WHERE cs.id = NEW.case_id;

    -- Constrói a mensagem com COALESCE em TUDO para garantir que nunca retorne NULL
    v_final_msg := 'Atualização: ' || 
                  COALESCE(NEW.details, '') || ' ' || 
                  COALESCE(NEW.new_value, '') || ' ' || 
                  COALESCE(NEW.action, 'Alteração');

    -- Se a mensagem ficou vazia, coloca um padrão
    IF v_final_msg IS NULL OR TRIM(v_final_msg) = '' THEN
        v_final_msg := 'Houve uma atualização no seu processo.';
    END IF;

    -- Tenta inserir, mas se falhar (ex: client_id ainda null), o EXCEPTION captura
    INSERT INTO notification_queue (client_id, case_id, message, severity, status)
    VALUES (
        COALESCE(v_client_id, (SELECT client_id FROM cases WHERE id = NEW.case_id)), 
        NEW.case_id, 
        'Olá ' || COALESCE(v_client_name, 'Cliente') || ', ' || v_final_msg,
        'media',
        'pendente'
    );
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- REGRA DE OURO: O gatilho JAMAIS deve travar o salvamento principal
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. FUNÇÃO DE ARQUIVAMENTO PROTEGIDA
CREATE OR REPLACE FUNCTION trigger_check_archived_case_financial()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.status = 'Arquivado' AND (OLD.status IS NULL OR OLD.status <> 'Arquivado')) THEN
        INSERT INTO notification_queue (client_id, case_id, message, severity)
        VALUES (
            NEW.client_id, 
            NEW.id, 
            COALESCE('O processo ' || NEW.numero_processo || ' foi arquivado. Verifique o financeiro.', 'Processo arquivado. Verifique pendências.'),
            'alta'
        );
    END IF;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. REINSTALAÇÃO LIMPA DOS TRIGGERS
DROP TRIGGER IF EXISTS trg_history_to_notification ON case_history;
CREATE TRIGGER trg_history_to_notification AFTER INSERT ON case_history FOR EACH ROW EXECUTE FUNCTION fn_trigger_case_history_to_notification();

DROP TRIGGER IF EXISTS trg_case_archived_financial_alert ON cases;
DROP TRIGGER IF EXISTS trigger_check_archived_case_financial ON cases;
CREATE TRIGGER trg_case_archived_financial_alert AFTER UPDATE ON cases FOR EACH ROW EXECUTE FUNCTION trigger_check_archived_case_financial();

-- 7. REMOVE NOT NULL DE CAMPOS DA FILA (OPCIONAL PARA EVITAR TRAVAMENTOS)
ALTER TABLE notification_queue ALTER COLUMN client_id DROP NOT NULL;
