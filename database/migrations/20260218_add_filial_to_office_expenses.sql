-- Migration to add filial column to office_expenses and fix RPC signature
ALTER TABLE office_expenses ADD COLUMN IF NOT EXISTS filial text;

-- Fix RPC signature to avoid overloading/ambiguity
-- We MUST drop it first because Postgres doesn't allow changing parameter names in CREATE OR REPLACE
DROP FUNCTION IF EXISTS get_financial_summary(date,date);

CREATE OR REPLACE FUNCTION get_financial_summary(p_start_date DATE, p_end_date DATE)
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
    WHERE data_vencimento BETWEEN p_start_date AND p_end_date;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;
