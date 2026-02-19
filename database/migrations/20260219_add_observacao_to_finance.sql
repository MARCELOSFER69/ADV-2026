-- Adiciona coluna de observação/descrição para registros financeiros e parcelas
ALTER TABLE financial_records ADD COLUMN IF NOT EXISTS observacao TEXT;
ALTER TABLE case_installments ADD COLUMN IF NOT EXISTS observacao TEXT;
