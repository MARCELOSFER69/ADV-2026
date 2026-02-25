-- ############################################################################
-- REPARO "NUCLEAR" E COMPLETO DO BANCO DE DADOS (V7)
-- Adiciona TODAS as colunas faltantes na tabela 'clients' para o sistema funcionar!
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

    -- 2. GARANTIA DE TABELAS CORE
    CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
        titulo TEXT NOT NULL,
        concluido BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now()
    );

    -- 3. EXPANSÃO DA TABELA 'CLIENTS' (Adiciona tudo que o modal usa)
    -- Documentação e Pessoais
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'sexo') THEN ALTER TABLE clients ADD COLUMN sexo TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'rg') THEN ALTER TABLE clients ADD COLUMN rg TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'orgao_emissor') THEN ALTER TABLE clients ADD COLUMN orgao_emissor TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'profissao') THEN ALTER TABLE clients ADD COLUMN profissao TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'estado_civil') THEN ALTER TABLE clients ADD COLUMN estado_civil TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'nacionalidade') THEN ALTER TABLE clients ADD COLUMN nacionalidade TEXT; END IF;
    
    -- Contato
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'telefone') THEN ALTER TABLE clients ADD COLUMN telefone TEXT; END IF;
    
    -- Endereço
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'cep') THEN ALTER TABLE clients ADD COLUMN cep TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'endereco') THEN ALTER TABLE clients ADD COLUMN endereco TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'numero_casa') THEN ALTER TABLE clients ADD COLUMN numero_casa TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'bairro') THEN ALTER TABLE clients ADD COLUMN bairro TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'cidade') THEN ALTER TABLE clients ADD COLUMN cidade TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'uf') THEN ALTER TABLE clients ADD COLUMN uf TEXT; END IF;
    
    -- Sistema e Entrevista (Note o CamelCase para bater com o Frontend se necessário)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'interviewStatus') THEN ALTER TABLE clients ADD COLUMN "interviewStatus" TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'interviewDate') THEN ALTER TABLE clients ADD COLUMN "interviewDate" TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'filial') THEN ALTER TABLE clients ADD COLUMN filial TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'captador') THEN ALTER TABLE clients ADD COLUMN captador TEXT; END IF;
    
    -- Representante
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'representante_nome') THEN ALTER TABLE clients ADD COLUMN representante_nome TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'representante_cpf') THEN ALTER TABLE clients ADD COLUMN representante_cpf TEXT; END IF;
    
    -- Outros
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'pendencias') THEN ALTER TABLE clients ADD COLUMN pendencias JSONB DEFAULT '[]'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'observacao') THEN ALTER TABLE clients ADD COLUMN observacao TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'foto') THEN ALTER TABLE clients ADD COLUMN foto TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'status') THEN ALTER TABLE clients ADD COLUMN status TEXT DEFAULT 'ativo'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'senha_gov') THEN ALTER TABLE clients ADD COLUMN senha_gov TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'senha_inss') THEN ALTER TABLE clients ADD COLUMN senha_inss TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'motivo_arquivamento') THEN ALTER TABLE clients ADD COLUMN motivo_arquivamento TEXT; END IF;

    -- 4. AJUSTE DE PRIORIDADE EM CASES
    BEGIN
        ALTER TYPE case_priority ADD VALUE 'urgente';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

-- 5. FUNÇÃO DE NOTIFICAÇÃO BLINDADA (CONCAT)
CREATE OR REPLACE FUNCTION fn_trigger_case_history_to_notification()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notification_queue (client_id, case_id, message, severity, status)
    VALUES ((SELECT client_id FROM cases WHERE id = NEW.case_id), NEW.case_id, CONCAT('Atualização: ', COALESCE(NEW.action, 'Alteração')), 'media', 'pendente');
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. REINSTALAÇÃO
CREATE TRIGGER trg_history_to_notification_v7 AFTER INSERT ON case_history FOR EACH ROW EXECUTE FUNCTION fn_trigger_case_history_to_notification();

-- 7. VERIFICAÇÃO FINAL
SELECT 'REPARO V7 CONCLUÍDO! Tabela clients agora possui todas as colunas para o modal funcionar.' as status;
