-- Add updated_at if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'updated_at') THEN
        ALTER TABLE cases ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Update existing records to have initial updated_at equal to their opening date
UPDATE cases SET updated_at = data_abertura WHERE updated_at IS NULL;
