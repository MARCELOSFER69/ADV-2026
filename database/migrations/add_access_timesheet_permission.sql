-- ############################################################################
-- ADIÇÃO DE PERMISSÃO PARA FOLHA DE PONTO (access_timesheet)
-- Permite controle granular de quem pode ver/bater o ponto.
-- ############################################################################

DO $$ 
BEGIN
    -- 1. Garante que a coluna access_timesheet existe na tabela user_permissions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_permissions' AND column_name = 'access_timesheet') THEN
        ALTER TABLE user_permissions ADD COLUMN access_timesheet BOOLEAN DEFAULT false;
    END IF;

    -- 2. (Opcional) Se quiser ativar para todos os usuários atuais que já são admin
    UPDATE user_permissions SET access_timesheet = true WHERE role = 'admin';

END $$;

SELECT 'Coluna access_timesheet adicionada com sucesso!' as status;
