-- Migração para garantir que a coluna documentos exista na tabela clients
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'documentos') THEN
        ALTER TABLE clients ADD COLUMN documentos JSONB DEFAULT '[]';
    END IF;
END $$;
