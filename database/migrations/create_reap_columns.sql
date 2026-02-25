-- Adiciona colunas para controle do REAP na tabela de clientes se não existirem
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'reap_status') THEN
        ALTER TABLE clients ADD COLUMN reap_status TEXT DEFAULT 'Pendente Anual';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'reap_ano_base') THEN
        ALTER TABLE clients ADD COLUMN reap_ano_base INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'updated_at') THEN
        ALTER TABLE clients ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;
