-- ############################################################################
-- ADIÇÃO DE COLUNAS FALTANTES PARA FINANCEIRO E HONORÁRIOS
-- ############################################################################

DO $$
BEGIN
    -- 1. Colunas na tabela 'financial_records'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_records' AND column_name = 'tipo_conta') THEN
        ALTER TABLE financial_records ADD COLUMN tipo_conta TEXT;
    END IF;

    -- 2. Colunas na tabela 'cases' para detalhes de honorários
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'honorarios_forma_pagamento') THEN
        ALTER TABLE cases ADD COLUMN honorarios_forma_pagamento TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'honorarios_recebedor') THEN
        ALTER TABLE cases ADD COLUMN honorarios_recebedor TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'honorarios_tipo_conta') THEN
        ALTER TABLE cases ADD COLUMN honorarios_tipo_conta TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'honorarios_conta') THEN
        ALTER TABLE cases ADD COLUMN honorarios_conta TEXT;
    END IF;

END $$;
