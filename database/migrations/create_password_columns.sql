-- Adiciona colunas de senha na tabela de clientes se não existirem
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'senha_gov') THEN
        ALTER TABLE clients ADD COLUMN senha_gov TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'senha_inss') THEN
        ALTER TABLE clients ADD COLUMN senha_inss TEXT;
    END IF;
END $$;
