-- ############################################################################
-- MIGRATION: Create case_notes table for structured process annotations
-- Date: 2026-02-09
-- ############################################################################

-- Tabela para armazenar anotações de processos com registro de usuário e data
CREATE TABLE IF NOT EXISTS case_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    conteudo TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para busca rápida por processo
CREATE INDEX IF NOT EXISTS idx_case_notes_case_id ON case_notes(case_id);

-- Comentário na tabela
COMMENT ON TABLE case_notes IS 'Anotações de processos com registro de data/hora e usuário';
