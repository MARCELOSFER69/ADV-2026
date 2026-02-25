-- Migration: Create import_logs table for tracking bulk import history
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    user_name TEXT NOT NULL DEFAULT '',
    filial TEXT NOT NULL DEFAULT '',
    file_name TEXT NOT NULL DEFAULT '',
    total_rows INTEGER NOT NULL DEFAULT 0,
    imported_count INTEGER NOT NULL DEFAULT 0,
    skipped_count INTEGER NOT NULL DEFAULT 0,
    captadores_added INTEGER NOT NULL DEFAULT 0,
    client_names TEXT[] NOT NULL DEFAULT '{}',
    client_ids TEXT[] NOT NULL DEFAULT '{}',
    errors TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert and read
CREATE POLICY "Users can insert import logs" ON import_logs
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can read import logs" ON import_logs
    FOR SELECT TO authenticated USING (true);

-- Index for fast queries by date
CREATE INDEX idx_import_logs_created_at ON import_logs(created_at DESC);
