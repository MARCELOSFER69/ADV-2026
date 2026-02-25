
-- Tabela para armazenar o histórico de relatórios gerados
CREATE TABLE IF NOT EXISTS generated_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    url TEXT NOT NULL,
    user_id UUID NOT NULL, -- Referência ao usuário que gerou
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;

-- Política para que usuários vejam apenas seus próprios relatórios
CREATE POLICY "Users can only see their own reports" ON generated_reports
    FOR SELECT
    USING (auth.uid() = user_id);

-- Política para que usuários possam inserir seus próprios relatórios
CREATE POLICY "Users can only insert their own reports" ON generated_reports
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Política para que usuários possam deletar seus próprios relatórios
CREATE POLICY "Users can only delete their own reports" ON generated_reports
    FOR DELETE
    USING (auth.uid() = user_id);
