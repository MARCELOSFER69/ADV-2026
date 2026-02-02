-- dashboard_rpc_functions.sql
-- Funções RPC para otimização do Dashboard no sistema ADV-2026

-- 1. get_dashboard_kpis()
-- Retorna os KPIs principais do sistema: Total de Clientes, Processos Ativos, 
-- Faturamento Mensal (Receitas Pagas) e Taxa de Sucesso.
CREATE OR REPLACE FUNCTION get_dashboard_kpis()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_clients bigint;
    active_cases bigint;
    monthly_revenue decimal;
    expected_fees decimal;
    whatsapp_queue_pending bigint;
    success_rate decimal;
    concedidos bigint;
    total_concluidos bigint;
BEGIN
    -- Total de Clientes
    SELECT count(*) INTO total_clients FROM clients;

    -- Processos Ativos (Status diferente de 'Arquivado')
    SELECT count(*) INTO active_cases FROM cases WHERE status != 'Arquivado';

    -- Receita Mensal Realizada (Soma de Transações do tipo 'Receita' pagas no mês atual)
    SELECT COALESCE(sum(valor), 0) INTO monthly_revenue 
    FROM financial 
    WHERE tipo = 'Receita' 
      AND status_pagamento = true 
      AND date_trunc('month', data_vencimento) = date_trunc('month', CURRENT_DATE);

    -- Honorários Previstos (Receitas pendentes no mês atual)
    SELECT COALESCE(sum(valor), 0) INTO expected_fees 
    FROM financial 
    WHERE tipo = 'Receita' 
      AND status_pagamento = false 
      AND date_trunc('month', data_vencimento) = date_trunc('month', CURRENT_DATE);

    -- Fila de WhatsApp Pendente
    SELECT count(*) INTO whatsapp_queue_pending FROM notification_queue WHERE status = 'pendente';

    -- Taxa de Sucesso (Concedido / (Concedido + Indeferido))
    SELECT count(*) INTO concedidos FROM cases WHERE status = 'Concluído (Concedido)';
    SELECT count(*) INTO total_concluidos FROM cases WHERE status IN ('Concluído (Concedido)', 'Concluído (Indeferido)');
    
    IF total_concluidos > 0 THEN
        success_rate := (concedidos::decimal / total_concluidos::decimal) * 100;
    ELSE
        success_rate := 0;
    END IF;

    RETURN json_build_object(
        'total_clients', total_clients,
        'active_cases', active_cases,
        'monthly_revenue', monthly_revenue,
        'expected_fees', expected_fees,
        'whatsapp_queue_pending', whatsapp_queue_pending,
        'success_rate', round(success_rate, 2)
    );
END;
$$;

-- 2. get_financial_chart_data()
-- Retorna os dados agregados de Receitas e Despesas dos últimos 6 meses para o gráfico.
CREATE OR REPLACE FUNCTION get_financial_chart_data()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
WITH months AS (
    -- Gera os últimos 6 meses
    SELECT date_trunc('month', m)::date as month_date
    FROM generate_series(
        date_trunc('month', CURRENT_DATE) - interval '5 months',
        date_trunc('month', CURRENT_DATE),
        interval '1 month'
    ) m
),
aggregates AS (
    SELECT 
        date_trunc('month', data_vencimento)::date as month_date,
        sum(CASE WHEN tipo = 'Receita' THEN valor ELSE 0 END) as income,
        sum(CASE WHEN tipo = 'Despesa' THEN valor ELSE 0 END) as expense
    FROM financial
    WHERE status_pagamento = true
    AND data_vencimento >= (date_trunc('month', CURRENT_DATE) - interval '5 months')
    GROUP BY 1
)
SELECT json_agg(row_to_json(result))
FROM (
    SELECT 
        to_char(months.month_date, 'Mon') as month,
        COALESCE(aggregates.income, 0) as income,
        COALESCE(aggregates.expense, 0) as expense
    FROM months
    LEFT JOIN aggregates ON months.month_date = aggregates.month_date
    ORDER BY months.month_date ASC
) result;
$$;

-- 3. get_top_captadores()
-- Retorna os top 5 captadores com maior número de clientes associados.
CREATE OR REPLACE FUNCTION get_top_captadores()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
SELECT json_agg(row_to_json(result))
FROM (
    SELECT 
        captador as name,
        count(*) as count
    FROM clients
    WHERE captador IS NOT NULL AND captador != ''
    GROUP BY captador
    ORDER BY count DESC
    LIMIT 5
) result;
$$;

-- 4. search_global(query_text)
-- Busca global em Clientes (nome/cpf) e Processos (titulo/numero)
CREATE OR REPLACE FUNCTION search_global(query_text text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    clients_res json;
    cases_res json;
BEGIN
    -- Busca Clientes
    SELECT json_agg(result) INTO clients_res
    FROM (
        SELECT id, nome_completo, cpf_cnpj
        FROM clients
        WHERE nome_completo ILIKE '%' || query_text || '%'
           OR cpf_cnpj ILIKE '%' || query_text || '%'
        LIMIT 5
    ) result;

    -- Busca Processos
    SELECT json_agg(result) INTO cases_res
    FROM (
        SELECT id, titulo, numero_processo, tipo, tribunal
        FROM cases
        WHERE titulo ILIKE '%' || query_text || '%'
           OR numero_processo ILIKE '%' || query_text || '%'
        LIMIT 5
    ) result;

    RETURN json_build_object(
        'clients', COALESCE(clients_res, '[]'::json),
        'cases', COALESCE(cases_res, '[]'::json)
    );
END;
$$;

-- 5. get_recent_bot_updates()
-- Retorna os logs mais recentes dos robôs para o dashboard
CREATE OR REPLACE FUNCTION get_recent_bot_updates()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
SELECT json_agg(result)
FROM (
    SELECT 
        l.id,
        c.numero_processo,
        c.titulo as case_title,
        l.bot_name,
        l.changes_detected,
        l.created_at
    FROM bot_update_logs l
    JOIN cases c ON l.case_id = c.id
    ORDER BY l.created_at DESC
    LIMIT 10
) result;
$$;

-- Permissões
-- GRANT EXECUTE ON FUNCTION search_global(text) TO authenticated;

-- 6. get_unified_client_history(p_client_id)
-- Consolida histórico de todos os cases do cliente + histórico pessoal
CREATE OR REPLACE FUNCTION get_unified_client_history(p_client_id UUID)
RETURNS TABLE (
    id UUID,
    case_id UUID,
    case_title TEXT,
    action TEXT,
    old_value TEXT,
    new_value TEXT,
    details TEXT,
    is_bot_update BOOLEAN,
    created_at TIMESTAMPTZ,
    whatsapp_status notify_status
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ch.id,
        ch.case_id,
        cs.titulo as case_title,
        ch.action,
        ch.old_value,
        ch.new_value,
        ch.details,
        ch.is_bot_update,
        ch.created_at,
        nq.status as whatsapp_status
    FROM cases cs
    JOIN case_history ch ON cs.id = ch.case_id
    LEFT JOIN (
        -- Pega apenas a notificação mais relevante/recente para aquele evento de history
        SELECT DISTINCT ON (case_id, created_at) case_id, created_at, status 
        FROM notification_queue
        ORDER BY case_id, created_at, created_at DESC
    ) nq ON nq.case_id = ch.case_id AND nq.created_at >= ch.created_at AND nq.created_at < ch.created_at + interval '10 seconds'
    WHERE cs.client_id = p_client_id

    UNION ALL

    SELECT 
        clh.id,
        NULL as case_id,
        'Perfil do Cliente' as case_title,
        clh.action,
        NULL as old_value,
        NULL as new_value,
        clh.details,
        false as is_bot_update,
        clh.timestamp as created_at,
        NULL::notify_status as whatsapp_status
    FROM client_history clh
    WHERE clh.client_id = p_client_id

    ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql;
