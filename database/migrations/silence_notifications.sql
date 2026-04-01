-- ############################################################################
-- SILENCIADOR DE NOTIFICAÇÕES DE SISTEMA
-- Limpa a fila atual e impede que atualizações manuais gerem alertas.
-- ############################################################################

-- 1. Limpa as notificações que "entupiram" o sistema agora
DELETE FROM notification_queue;

-- 2. Refina a função do Trigger para ignorar ações manuais de sistema
-- Apenas ações externas (Bot, Tribunal, Publicação) devem gerar notificação no "Sininho".
CREATE OR REPLACE FUNCTION fn_trigger_case_history_to_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_client_id UUID;
    v_case_number TEXT;
    v_client_name TEXT;
    v_should_notify BOOLEAN := false;
BEGIN
    -- FILTRO INTELIGENTE:
    -- Só notifica se a ação vier de fontes externas ou for explicitamente um erro/alerta do Bot.
    -- Ignora 'Atualização', 'Manutenção' ou qualquer ação que não contenha as palavras-chave abaixo.
    IF NEW.action ILIKE '%Bot%' OR 
       NEW.action ILIKE '%Tribunal%' OR 
       NEW.action ILIKE '%Publicação%' OR
       NEW.action ILIKE '%Movimentação%' THEN
        v_should_notify := true;
    END IF;

    IF v_should_notify THEN
        -- Busca dados do processo
        SELECT client_id, numero_processo INTO v_client_id, v_case_number FROM cases WHERE id = NEW.case_id;
        
        -- Busca nome do cliente
        IF v_client_id IS NOT NULL THEN
            SELECT nome_completo INTO v_client_name FROM clients WHERE id = v_client_id;
            
            INSERT INTO notification_queue (client_id, case_id, message, severity, status)
            VALUES (
                v_client_id, 
                NEW.case_id, 
                'Atualização no processo ' || COALESCE(v_case_number, '...') || ': ' || NEW.details,
                'media',
                'pendente'
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Garante que o trigger está usando a nova função filtrada
DROP TRIGGER IF EXISTS trg_history_to_notification ON case_history;
CREATE TRIGGER trg_history_to_notification
AFTER INSERT ON case_history
FOR EACH ROW
EXECUTE FUNCTION fn_trigger_case_history_to_notification();

SELECT 'Notificações limpas e filtro inteligente ativado!' as resultado;
