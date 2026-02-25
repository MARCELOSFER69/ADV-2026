-- ############################################################################
-- SEED DE DADOS INTELIGENTE - TESTE DE ESTRESSE (VISÃO 360)
-- ############################################################################

DO $$
DECLARE
    v_client_id UUID;
    v_case_active_1_id UUID;
    v_case_active_2_id UUID;
    v_case_archived_id UUID;
BEGIN
    -- 1. Inserir Cliente: João da Silva (Verifica se existe antes)
    SELECT id INTO v_client_id FROM clients WHERE cpf_cnpj = '123.456.789-00' LIMIT 1;
    
    IF v_client_id IS NULL THEN
        INSERT INTO clients (id, nome_completo, cpf_cnpj, telefone, email, data_nascimento)
        VALUES (gen_random_uuid(), 'João da Silva', '123.456.789-00', '5598912345678', 'joao.silva@email.com', '1965-05-15')
        RETURNING id INTO v_client_id;
    ELSE
        -- Atualiza dados básicos se já existir
        UPDATE clients 
        SET nome_completo = 'João da Silva', 
            telefone = '5598912345678' 
        WHERE id = v_client_id;
    END IF;

    -- 2. Inserir Processos (2 Ativos, 1 Arquivado)
    
    -- Processo 1
    SELECT id INTO v_case_active_1_id FROM cases WHERE numero_processo = '12345-01.2024.4.01.3700' LIMIT 1;
    IF v_case_active_1_id IS NULL THEN
        INSERT INTO cases (id, client_id, numero_processo, titulo, tribunal, status)
        VALUES (gen_random_uuid(), v_client_id, '12345-01.2024.4.01.3700', 'Processo Previdenciário (Aposentadoria)', 'TRF1', 'Em Andamento')
        RETURNING id INTO v_case_active_1_id;
    END IF;

    -- Processo 2
    SELECT id INTO v_case_active_2_id FROM cases WHERE numero_processo = '54321-02.2024.4.01.3700' LIMIT 1;
    IF v_case_active_2_id IS NULL THEN
        INSERT INTO cases (id, client_id, numero_processo, titulo, tribunal, status)
        VALUES (gen_random_uuid(), v_client_id, '54321-02.2024.4.01.3700', 'Revisão de Benefício', 'TRF1', 'Em Andamento')
        RETURNING id INTO v_case_active_2_id;
    END IF;

    -- Processo 3 (Arquivado)
    SELECT id INTO v_case_archived_id FROM cases WHERE numero_processo = '98765-03.2023.4.01.3700' LIMIT 1;
    IF v_case_archived_id IS NULL THEN
        INSERT INTO cases (id, client_id, numero_processo, titulo, tribunal, status)
        VALUES (gen_random_uuid(), v_client_id, '98765-03.2023.4.01.3700', 'Auxílio Doença Antigo', 'TRF1', 'Arquivado')
        RETURNING id INTO v_case_archived_id;
    END IF;

    -- 3. Histórico do Processo Ativo 1 (Limpa e Re-insere para evitar dupes de lógica simulada)
    DELETE FROM case_history WHERE case_id = v_case_active_1_id AND details LIKE '%Simulado%';
    
    -- Desabilitar apenas triggers de USUÁRIO (evita erro de permissão em triggers de sistema/FK)
    EXECUTE 'ALTER TABLE case_history DISABLE TRIGGER USER';

    INSERT INTO case_history (id, case_id, action, details) VALUES
    (gen_random_uuid(), v_case_active_1_id, 'Abertura de Processo', 'Processo iniciado no sistema. (Simulado)'),
    (gen_random_uuid(), v_case_active_1_id, 'Captura via Bot', 'Status alterado de Pendente para Distribuído. Robô identificou a distribuição na vara. (Simulado)'),
    (gen_random_uuid(), v_case_active_1_id, 'Atualização de Fase', 'Status alterado de Distribuído para Citação do INSS. O INSS foi citado eletronicamente. (Simulado)'),
    (gen_random_uuid(), v_case_active_1_id, 'Juntada de Documentos', 'Status alterado de Citação do INSS para Réplica à Contestação. Advogado anexou a réplica. (Simulado)'),
    (gen_random_uuid(), v_case_active_1_id, 'Movimentação Robô', 'Status alterado de Réplica à Contestação para Concluso para Sentença. O processo subiu para o juiz decidir. (Simulado)');

    EXECUTE 'ALTER TABLE case_history ENABLE TRIGGER USER';

    -- 4. Notificação Pendente para o João (Queue)
    DELETE FROM notification_queue WHERE client_id = v_client_id AND message LIKE '%Aposentadoria acaba de subir%';
    
    INSERT INTO notification_queue (client_id, case_id, message, severity, status)
    VALUES (v_client_id, v_case_active_1_id, 'João, seu processo de Aposentadoria acaba de subir para sentença! Estamos monitorando.', 'alta', 'pendente');

    -- 5. Financeiro do João (Receita e Despesa)
    DELETE FROM financial WHERE client_id = v_client_id AND descricao LIKE '%Honorários Iniciais%';
    DELETE FROM financial WHERE client_id = v_client_id AND descricao LIKE '%Taxa de Protocolo%';

    INSERT INTO financial (id, client_id, case_id, descricao, valor, tipo, data_vencimento, status_pagamento)
    VALUES
    (gen_random_uuid(), v_client_id, v_case_active_1_id, 'Honorários Iniciais - Contrato', 1500.00, 'Receita', CURRENT_DATE, true),
    (gen_random_uuid(), v_client_id, v_case_active_1_id, 'Taxa de Protocolo Urgente', 120.00, 'Despesa', CURRENT_DATE + interval '5 days', false);

    -- 6. Simulação de Aposentadoria (JSON Complexo)
    DELETE FROM retirement_calculations WHERE client_id = v_client_id;

    INSERT INTO retirement_calculations (client_id, calculation_data, estimated_value, ready_for_process)
    VALUES (
        v_client_id,
        '{
            "periodos": [
                {"inicio": "1985-01-01", "fim": "2000-12-31", "empresa": "Metalúrgica São José", "tempo": "15 anos, 11 meses"},
                {"inicio": "2001-03-10", "fim": "2023-11-20", "empresa": "Comércio Silva LTDA", "tempo": "22 anos, 8 meses"}
            ],
            "total_contribuicao": "38 anos e 7 meses",
            "pontos": 102,
            "analise_ia": "Direito adquirido confirmado. Cliente elegível para Aposentadoria Integral por Tempo de Contribuição."
        }'::jsonb,
        3420.50,
        true
    );

    RAISE NOTICE 'Seed concluído: João da Silva populado com sucesso em todas as dimensões (360).';
END $$;
