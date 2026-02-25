-- Add more fields to financial_receivers table
ALTER TABLE financial_receivers 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'PF',
ADD COLUMN IF NOT EXISTS document TEXT,
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS bank_agency TEXT,
ADD COLUMN IF NOT EXISTS bank_account TEXT,
ADD COLUMN IF NOT EXISTS account_type TEXT,
ADD COLUMN IF NOT EXISTS pix_key TEXT;
