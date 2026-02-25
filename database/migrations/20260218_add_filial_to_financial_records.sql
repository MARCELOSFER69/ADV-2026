-- Migration to add filial column to financial_records
-- This allows direct branch categorization for manual entries (avulsos)
ALTER TABLE financial_records ADD COLUMN IF NOT EXISTS filial TEXT;
