-- Migração para corrigir o esquema da tabela case_history
-- Adiciona colunas faltantes que causavam erro 400 no salvamento

DO $$
BEGIN
    -- 1.user_id (Referência ao usuário que fez a alteração)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'case_history' AND column_name = 'user_id') THEN 
        ALTER TABLE case_history ADD COLUMN user_id UUID; 
    END IF;

    -- 2.old_value (Valor anterior do campo alterado)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'case_history' AND column_name = 'old_value') THEN 
        ALTER TABLE case_history ADD COLUMN old_value TEXT; 
    END IF;

    -- 3.new_value (Novo valor do campo alterado)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'case_history' AND column_name = 'new_value') THEN 
        ALTER TABLE case_history ADD COLUMN new_value TEXT; 
    END IF;

    -- 4.is_bot_update (Sinaliza se a alteração foi feita por um robô)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'case_history' AND column_name = 'is_bot_update') THEN 
        ALTER TABLE case_history ADD COLUMN is_bot_update BOOLEAN DEFAULT false; 
    END IF;

    -- 5.raw_data_json (Para armazenar o payload completo se necessário)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'case_history' AND column_name = 'raw_data_json') THEN 
        ALTER TABLE case_history ADD COLUMN raw_data_json JSONB; 
    END IF;

END $$;
