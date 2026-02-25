-- ############################################################################
-- ATUALIZAÇÃO DE REGRAS DE NEGÓCIO (BACKEND PROTECTION)
-- ############################################################################

-- 1. TRAVA FINANCEIRA: Honorários precisam de Case ID
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_check_financial_honorary_integrity()
RETURNS TRIGGER AS $$
BEGIN
    -- Verifica se é Receita E se a descrição contém "Honorário" (case insensitive)
    IF NEW.tipo = 'Receita' AND NEW.descricao ILIKE '%Honorário%' THEN
        IF NEW.case_id IS NULL THEN
            RAISE EXCEPTION 'Erro de Integridade: Lançamentos de Honorários devem estar vinculados a um Processo (case_id).';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_coherence_financial_honorary ON financial;
CREATE TRIGGER trg_coherence_financial_honorary
BEFORE INSERT OR UPDATE ON financial
FOR EACH ROW
EXECUTE FUNCTION fn_check_financial_honorary_integrity();


-- 2. FILTRO DE NOTIFICAÇÃO INTELIGENTE
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_trigger_case_history_to_notification()
RETURNS TRIGGER AS $$
DECLARE
    client_id UUID;
    case_number TEXT;
    client_name TEXT;
    should_notify BOOLEAN := false;
BEGIN
    -- Regra de Filtragem: Apenas Bot ou Tribunal disparam notificação
    -- Ignora atualizações internas manuais para não incomodar o cliente
    IF NEW.action ILIKE '%Bot%' OR NEW.action ILIKE '%Tribunal%' OR NEW.action ILIKE '%Publicação%' THEN
        should_notify := true;
    END IF;

    IF should_notify THEN
        -- Buscar dados auxiliares (Cliente e Numero do Processo)
        SELECT c.client_id, c.numero_processo, cli.nome_completo 
        INTO client_id, case_number, client_name
        FROM cases c
        JOIN clients cli ON c.client_id = cli.id
        WHERE c.id = NEW.case_id;

        -- Inserir na Fila
        IF client_id IS NOT NULL THEN
            INSERT INTO notification_queue (client_id, case_id, message, severity, status)
            VALUES (
                client_id, 
                NEW.case_id, 
                'Olá ' || COALESCE(client_name, 'Cliente') || ', atualização no processo ' || COALESCE(case_number, '...') || ': ' || NEW.details,
                'media',
                'pendente'
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recria o trigger para garantir que use a nova função
DROP TRIGGER IF EXISTS trg_history_to_notification ON case_history;
CREATE TRIGGER trg_history_to_notification
AFTER INSERT ON case_history
FOR EACH ROW
EXECUTE FUNCTION fn_trigger_case_history_to_notification();

-- Confirmação
SELECT 'Regras de Negócio Aplicadas com Sucesso' as status;
