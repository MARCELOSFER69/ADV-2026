-- Create client_notes table
CREATE TABLE IF NOT EXISTS client_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    conteudo TEXT NOT NULL,
    user_name TEXT,
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS (Optional but recommended, assuming standard setup)
ALTER TABLE client_notes ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all access for authenticated users (Adjust based on actual project policies)
CREATE POLICY "Enable all access for authenticated users" ON client_notes
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Migrate existing observations
INSERT INTO client_notes (client_id, conteudo, user_name, created_at)
SELECT 
    id, 
    observacao, 
    'Sistema (Migração)', 
    now() 
FROM clients 
WHERE observacao IS NOT NULL AND observacao <> '';

-- Optional: Verify migration
-- SELECT count(*) FROM client_notes;
