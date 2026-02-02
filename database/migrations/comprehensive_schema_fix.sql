-- Migração abrangente para garantir que todas as colunas necessárias existam na tabela cases
DO $$
BEGIN
    -- Colunas de identificação e classificação
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'tipo') THEN
        ALTER TABLE cases ADD COLUMN tipo TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'modalidade') THEN
        ALTER TABLE cases ADD COLUMN modalidade TEXT;
    END IF;

    -- Colunas financeiras
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'valor_causa') THEN
        ALTER TABLE cases ADD COLUMN valor_causa DECIMAL(12,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'status_pagamento') THEN
        ALTER TABLE cases ADD COLUMN status_pagamento TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'valor_honorarios_pagos') THEN
        ALTER TABLE cases ADD COLUMN valor_honorarios_pagos DECIMAL(12,2);
    END IF;

    -- Colunas de controle e histórico
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'anotacoes') THEN
        ALTER TABLE cases ADD COLUMN anotacoes TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'metadata') THEN
        ALTER TABLE cases ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'drive_folder_id') THEN
        ALTER TABLE cases ADD COLUMN drive_folder_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'motivo_arquivamento') THEN
        ALTER TABLE cases ADD COLUMN motivo_arquivamento TEXT;
    END IF;

    -- Colunas específicas de Previdenciário (Maternidade, Aposentadoria, etc)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'nit') THEN
        ALTER TABLE cases ADD COLUMN nit TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'der') THEN
        ALTER TABLE cases ADD COLUMN der DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'nis') THEN
        ALTER TABLE cases ADD COLUMN nis TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'renda_familiar') THEN
        ALTER TABLE cases ADD COLUMN renda_familiar DECIMAL(12,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'data_parto') THEN
        ALTER TABLE cases ADD COLUMN data_parto DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'cid') THEN
        ALTER TABLE cases ADD COLUMN cid TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'data_incapacidade') THEN
        ALTER TABLE cases ADD COLUMN data_incapacidade DATE;
    END IF;

    -- Coluna de lista GPS (se for armazenar como JSONB na tabela cases também)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'gps_lista') THEN
        ALTER TABLE cases ADD COLUMN gps_lista JSONB DEFAULT '[]';
    END IF;

END $$;
