-- ############################################################################
-- ERP ESCRITÓRIO NOLETO & MACEDO - DATABASE SCHEMA BLUEPRINT
-- ############################################################################

-- --- ENUMS ---
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'advogado', 'secretaria', 'bot');
    CREATE TYPE case_priority AS ENUM ('baixa', 'media', 'alta', 'critica');
    CREATE TYPE notify_status AS ENUM ('pendente', 'enviado', 'erro');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- --- 1. USERS & PERMISSIONS ---
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role user_role DEFAULT 'advogado',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- --- 2. CORE: CLIENTS ---
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_completo TEXT NOT NULL,
    cpf_cnpj TEXT UNIQUE NOT NULL,
    data_nascimento DATE,
    telefone_whatsapp TEXT,
    email TEXT,
    gov_br_user TEXT,
    gov_br_password TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- --- 3. CORE: LAWSUITS (PROCESSOS) ---
CREATE TABLE IF NOT EXISTS cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    numero_processo TEXT UNIQUE,
    titulo TEXT NOT NULL,
    tribunal TEXT,
    vara TEXT,
    status TEXT NOT NULL, -- Ex: 'Em Andamento', 'Arquivado'
    fase_atual TEXT,
    prioridade case_priority DEFAULT 'media',
    data_abertura DATE DEFAULT CURRENT_DATE,
    data_fatal TIMESTAMPTZ, -- Prazo crítico
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- --- 4. AUDIT & LOGS: CASE HISTORY (RULE 1) ---
CREATE TABLE IF NOT EXISTS case_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id), -- Quem fez a alteração
    action TEXT NOT NULL, -- Ex: 'Mudança de Fase', 'Atualização de Status'
    old_value TEXT,
    new_value TEXT,
    details TEXT,
    is_bot_update BOOLEAN DEFAULT false,
    raw_data_json JSONB, -- Regra: Armazenar metadados brutos da atualização (JSON)
    created_at TIMESTAMPTZ DEFAULT now()
);

-- --- 5. AUTOMATION: BOT UPDATE LOGS ---
CREATE TABLE IF NOT EXISTS bot_update_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    bot_name TEXT NOT NULL, -- Ex: 'Robô Trator', 'Robô Pesca'
    raw_response JSONB,
    changes_detected JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- --- 6. COMMUNICATION: NOTIFICATION QUEUE (RULE 2) ---
CREATE TABLE IF NOT EXISTS notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    raw_message TEXT, -- Regra: Armazenar o texto exato enviado
    severity case_priority DEFAULT 'media',
    status notify_status DEFAULT 'pendente',
    error_log TEXT,
    scheduled_for TIMESTAMPTZ DEFAULT now(),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- --- 7. FINANCE: FINANCIAL RECORDS (RULE 3) ---
CREATE TABLE IF NOT EXISTS financial_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    valor DECIMAL(12,2) NOT NULL,
    tipo TEXT NOT NULL, -- 'Receita', 'Despesa', 'Honorário Êxito'
    data_vencimento DATE NOT NULL,
    status_pagamento BOOLEAN DEFAULT false,
    data_pagamento DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- RULE 3: Garantia de vínculo
    CONSTRAINT financial_link_check CHECK (client_id IS NOT NULL OR case_id IS NOT NULL)
);

-- --- 8. CALCULATIONS: RETIREMENT (RULE 4) ---
CREATE TABLE IF NOT EXISTS retirement_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    Calculation_data JSONB NOT NULL, -- Armazena períodos de contribuição, somatórios, etc.
    estimated_value DECIMAL(12,2),
    ready_for_process BOOLEAN DEFAULT false,
    promoted_to_case_id UUID REFERENCES cases(id), -- RULE 4: Linagem
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- --- TRIGGERS / FUNCTIONS LOGIC ---

-- REGRA 1 & 2: Automação via Case History (Geração de Notificação)
CREATE OR REPLACE FUNCTION fn_trigger_case_history_to_notification()
RETURNS TRIGGER AS $$
DECLARE
    client_name text;
    case_number text;
    client_id uuid;
BEGIN
    -- Busca dados do cliente e do processo para a mensagem
    SELECT c.nome_completo, c.id, cs.numero_processo 
    INTO client_name, client_id, case_number
    FROM cases cs
    JOIN clients c ON cs.client_id = c.id
    WHERE cs.id = NEW.case_id;

    -- Só gera notificação se houver uma mudança de valor (new_value)
    IF (NEW.new_value IS NOT NULL AND NEW.new_value <> '') THEN
        INSERT INTO notification_queue (client_id, case_id, message, severity)
        VALUES (
            client_id, 
            NEW.case_id, 
            'Olá ' || client_name || ', houve uma atualização no processo ' || COALESCE(case_number, '(sem número)') || ': ' || NEW.new_value,
            'media'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_history_to_notification ON case_history;
CREATE TRIGGER trg_history_to_notification
AFTER INSERT ON case_history
FOR EACH ROW
EXECUTE FUNCTION fn_trigger_case_history_to_notification();

-- REGRA 3: Alerta de cobrança final ao arquivar (Migrado para observar cases diretamente)
CREATE OR REPLACE FUNCTION trigger_check_archived_case_financial()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.status = 'Arquivado' AND OLD.status <> 'Arquivado') THEN
        INSERT INTO notification_queue (client_id, case_id, message, severity)
        VALUES (
            NEW.client_id, 
            NEW.id, 
            'O processo ' || NEW.numero_processo || ' foi arquivado. Verifique pendências financeiras e cobrança final.',
            'alta'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_case_archived_financial_alert ON cases;
CREATE TRIGGER trg_case_archived_financial_alert
AFTER UPDATE ON cases
FOR EACH ROW
EXECUTE FUNCTION trigger_check_archived_case_financial();

-- --- REGRA 4: View complexa para cálculos previdenciários ---
CREATE OR REPLACE VIEW view_retirement_readiness AS
SELECT 
    c.id as client_id,
    c.nome_completo,
    c.data_nascimento,
    EXTRACT(YEAR FROM AGE(now(), c.data_nascimento)) as idade,
    rc.id as calculation_id,
    rc.estimated_value,
    rc.ready_for_process,
    rc.promoted_to_case_id,
    rc.created_at as calculation_date
FROM clients c
LEFT JOIN retirement_calculations rc ON c.id = rc.client_id
WHERE rc.created_at = (SELECT MAX(created_at) FROM retirement_calculations WHERE client_id = c.id) OR rc.id IS NULL;
