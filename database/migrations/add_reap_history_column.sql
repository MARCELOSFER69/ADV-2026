-- Adiciona coluna reap_history para persistência de dados históricos do REAP
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'reap_history') THEN
        ALTER TABLE clients ADD COLUMN reap_history JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

COMMENT ON COLUMN clients.reap_history IS 'Histórico de REAP. Estrutura: { "2021": true, "2025": [4, 5, 8] } onde para 2021-2024 é booleano (anual) e 2025+ é array de meses feitos.';
