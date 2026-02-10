-- Migration: Add import_source column to clients table
-- Purpose: Track clients that were bulk-imported with incomplete data
-- Date: 2026-02-10

ALTER TABLE clients ADD COLUMN IF NOT EXISTS import_source TEXT DEFAULT NULL;

-- Add a comment for documentation
COMMENT ON COLUMN clients.import_source IS 'Marks bulk-imported clients. Value "imported" = imported with incomplete data. NULL = normal client.';
