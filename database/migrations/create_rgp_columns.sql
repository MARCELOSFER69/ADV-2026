-- Adiciona colunas para controle do RGP na tabela de clientes se não existirem
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'rgp_localidade') THEN
        ALTER TABLE clients ADD COLUMN rgp_localidade TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'rgp_status') THEN
        ALTER TABLE clients ADD COLUMN rgp_status TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'rgp_numero') THEN
        ALTER TABLE clients ADD COLUMN rgp_numero TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'rgp_local_exercicio') THEN
        ALTER TABLE clients ADD COLUMN rgp_local_exercicio TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'rgp_data_primeiro') THEN
        ALTER TABLE clients ADD COLUMN rgp_data_primeiro TEXT;
    END IF;
END $$;
