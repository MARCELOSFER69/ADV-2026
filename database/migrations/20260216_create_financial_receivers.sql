-- Create a new table to store persistent receivers
CREATE TABLE IF NOT EXISTS financial_receivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_financial_receivers_name ON financial_receivers(name);

-- Enable RLS (Security) - Assuming a standard policy for now
ALTER TABLE financial_receivers ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read and insert
CREATE POLICY "Allow all for authenticated users" ON financial_receivers
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);
