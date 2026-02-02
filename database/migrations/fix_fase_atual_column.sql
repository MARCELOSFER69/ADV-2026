-- Adiciona a coluna fase_atual na tabela cases se não existir
-- Isso resolve o erro: record "old" has no field "fase_atual"
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'fase_atual') THEN
        ALTER TABLE cases ADD COLUMN fase_atual TEXT;
        RAISE NOTICE 'Coluna fase_atual adicionada com sucesso à tabela cases.';
    ELSE
        RAISE NOTICE 'A coluna fase_atual já existe na tabela cases.';
    END IF;
END $$;
