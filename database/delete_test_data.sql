-- ############################################################################
-- SCRIPT DE REMOÇÃO DE DADOS FICTÍCIOS - JOÃO DA SILVA
-- ############################################################################

DO $$
DECLARE
    v_client_id UUID;
BEGIN
    -- 1. Localizar o ID do cliente João da Silva pelo CPF
    SELECT id INTO v_client_id FROM clients WHERE cpf_cnpj = '123.456.789-00' LIMIT 1;
    
    IF v_client_id IS NOT NULL THEN
        -- 2. Deletar cálculos de aposentadoria
        DELETE FROM retirement_calculations WHERE client_id = v_client_id;
        
        -- 3. Deletar notificações na fila
        DELETE FROM notification_queue WHERE client_id = v_client_id;
        
        -- 4. Deletar histórico de todos os processos do João
        DELETE FROM case_history WHERE case_id IN (SELECT id FROM cases WHERE client_id = v_client_id);
        
        -- 5. Deletar lançamentos financeiros vinculados ao João
        DELETE FROM financial WHERE client_id = v_client_id;
        
        -- 6. Deletar lançamentos financeiros vinculados aos processos do João (caso falte client_id em algum)
        DELETE FROM financial WHERE case_id IN (SELECT id FROM cases WHERE client_id = v_client_id);

        -- 7. Deletar parcelas de processos
        DELETE FROM case_installments WHERE case_id IN (SELECT id FROM cases WHERE client_id = v_client_id);

        -- 8. Deletar processos (cases) vinculados ao João
        DELETE FROM cases WHERE client_id = v_client_id;
        
        -- 9. Por fim, deletar o cliente
        DELETE FROM clients WHERE id = v_client_id;
        
        RAISE NOTICE 'Cliente João da Silva e todos os dados relacionados foram removidos com sucesso.';
    ELSE
        RAISE NOTICE 'Cliente João da Silva (CPF: 123.456.789-00) não encontrado.';
    END IF;
END $$;
