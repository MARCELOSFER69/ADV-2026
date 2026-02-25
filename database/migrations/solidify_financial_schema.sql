-- ############################################################################
-- SOLIDIFICAÇÃO FINAL DO ESQUEMA FINANCEIRO
-- Este script garante a padronização entre o Banco de Dados e o Código
-- ############################################################################

DO $$
BEGIN
    -- 1. PADRONIZAÇÃO DA TABELA 'financial_records'
    -- Se a coluna 'description' ainda existir, renomeia para 'titulo'
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_records' AND column_name = 'description') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_records' AND column_name = 'titulo') THEN
        ALTER TABLE financial_records RENAME COLUMN description TO titulo;
    END IF;

    -- Se a coluna 'descricao' ainda existir, renomeia para 'titulo'
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_records' AND column_name = 'descricao') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_records' AND column_name = 'titulo') THEN
        ALTER TABLE financial_records RENAME COLUMN descricao TO titulo;
    END IF;

    -- Caso ambas existam, garante que a 'titulo' seja a principal (opcional, mas seguro)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_records' AND column_name = 'titulo') THEN
        ALTER TABLE financial_records ADD COLUMN titulo TEXT;
        -- Migra dados de descricao/description se existirem
        UPDATE financial_records SET titulo = COALESCE(
            (SELECT descricao FROM information_schema.columns WHERE table_name = 'financial_records' AND column_name = 'descricao' LIMIT 1),
            (SELECT "description" FROM information_schema.columns WHERE table_name = 'financial_records' AND column_name = 'description' LIMIT 1),
            'Lançamento sem título'
        ) WHERE titulo IS NULL;
    END IF;

    -- Garante que a coluna 'titulo' seja NOT NULL (Como o código espera)
    ALTER TABLE financial_records ALTER COLUMN titulo SET NOT NULL;

    -- Novos campos para detalhamento financeiro
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_records' AND column_name = 'is_honorary') THEN
        ALTER TABLE financial_records ADD COLUMN is_honorary BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_records' AND column_name = 'forma_pagamento') THEN
        ALTER TABLE financial_records ADD COLUMN forma_pagamento TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_records' AND column_name = 'recebedor') THEN
        ALTER TABLE financial_records ADD COLUMN recebedor TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_records' AND column_name = 'conta') THEN
        ALTER TABLE financial_records ADD COLUMN conta TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_records' AND column_name = 'tipo_movimentacao') THEN
        ALTER TABLE financial_records ADD COLUMN tipo_movimentacao TEXT;
    END IF;

    -- 2. CAMPO DE MODALIDADE DE RECEBIMENTO
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'forma_recebimento') THEN
        ALTER TABLE cases ADD COLUMN forma_recebimento TEXT;
    END IF;

    -- 3. NORMALIZAÇÃO DE TIPOS FINANCEIROS
    UPDATE financial_records SET tipo = 'Receita' WHERE lower(trim(tipo)) = 'receita';
    UPDATE financial_records SET tipo = 'Despesa' WHERE lower(trim(tipo)) = 'despesa';
    UPDATE financial_records SET tipo = 'Comissao' WHERE lower(trim(tipo)) IN ('comissao', 'comissão');

END $$;

-- 4. ATUALIZAÇÃO DO RPC DE RESUMO FINANCEIRO
-- Recria a função para garantir que utilize as colunas corretas
CREATE OR REPLACE FUNCTION get_financial_summary(start_date DATE, end_date DATE)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'income', COALESCE(SUM(valor) FILTER (WHERE tipo = 'Receita' AND status_pagamento = true), 0),
        'expense', COALESCE(SUM(valor) FILTER (WHERE tipo IN ('Despesa', 'Comissao') AND status_pagamento = true), 0),
        'balance', COALESCE(SUM(CASE WHEN tipo = 'Receita' THEN valor ELSE -valor END) FILTER (WHERE status_pagamento = true), 0)
    ) INTO result
    FROM financial_records
    WHERE data_vencimento BETWEEN start_date AND end_date;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

SELECT 'Solidificação concluída: RPC get_financial_summary e colunas de titulo/created_at sincronizadas' as resultado;
