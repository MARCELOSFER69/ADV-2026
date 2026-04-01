-- ############################################################################
-- REPARO DE CAMPOS FINANCEIROS E VIEWS
-- Garante que a coluna forma_recebimento existe e que a view a reflete corretamente.
-- ############################################################################

DO $$ 
BEGIN
    -- 1. Garantir que as colunas básicas e novas existam
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'forma_recebimento') THEN ALTER TABLE cases ADD COLUMN forma_recebimento TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'vara') THEN ALTER TABLE cases ADD COLUMN vara TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'prioridade') THEN ALTER TABLE cases ADD COLUMN prioridade TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'tribunal') THEN ALTER TABLE cases ADD COLUMN tribunal TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'numero_processo') THEN ALTER TABLE cases ADD COLUMN numero_processo TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'fase_atual') THEN ALTER TABLE cases ADD COLUMN fase_atual TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'data_fatal') THEN ALTER TABLE cases ADD COLUMN data_fatal TIMESTAMP WITH TIME ZONE; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'valor_honorarios_pagos') THEN ALTER TABLE cases ADD COLUMN valor_honorarios_pagos NUMERIC(10,2) DEFAULT 0; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'honorarios_forma_pagamento') THEN ALTER TABLE cases ADD COLUMN honorarios_forma_pagamento TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'honorarios_recebedor') THEN ALTER TABLE cases ADD COLUMN honorarios_recebedor TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'honorarios_tipo_conta') THEN ALTER TABLE cases ADD COLUMN honorarios_tipo_conta TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'honorarios_conta') THEN ALTER TABLE cases ADD COLUMN honorarios_conta TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'gps_lista') THEN ALTER TABLE cases ADD COLUMN gps_lista JSONB DEFAULT '[]'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'metadata') THEN ALTER TABLE cases ADD COLUMN metadata JSONB DEFAULT '{}'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'anotacoes') THEN ALTER TABLE cases ADD COLUMN anotacoes TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'status_pagamento') THEN ALTER TABLE cases ADD COLUMN status_pagamento TEXT DEFAULT 'Pendente'; END IF;

END $$;

-- 3. Recriar a view para garantir que capture as novas colunas
-- No PostgreSQL, se a view foi criada com SELECT *, ela congela as colunas daquele momento.
-- Precisamos drop e create para "descongelar".
DROP VIEW IF EXISTS view_cases_dashboard CASCADE;

CREATE VIEW view_cases_dashboard AS
SELECT 
    cs.id,
    cs.client_id,
    cs.numero_processo,
    cs.titulo,
    cs.tribunal,
    cs.vara,
    cs.status,
    cs.fase_atual,
    cs.prioridade,
    cs.data_abertura,
    cs.data_fatal,
    cs.created_at,
    cs.updated_at,
    cs.valor_causa,
    cs.forma_recebimento,
    cs.status_pagamento,
    cs.tipo,
    cs.modalidade,
    cs.valor_honorarios_pagos,
    cs.honorarios_forma_pagamento,
    cs.honorarios_recebedor,
    cs.honorarios_tipo_conta,
    cs.honorarios_conta,
    cs.gps_lista,
    cs.metadata,
    cs.anotacoes,
    c.nome_completo AS client_name,
    unaccent(COALESCE(c.nome_completo, 'Cliente Indefinido')) AS client_name_unaccent,
    c.cpf_cnpj AS client_cpf,
    c.data_nascimento AS client_birth_date,
    c.sexo AS client_sexo,
    unaccent(cs.titulo) AS titulo_unaccent,
    COALESCE(cs.filial, c.filial, 'Indefinida') AS filial
FROM cases cs
LEFT JOIN clients c ON cs.client_id = c.id;

-- Reset PostgREST cache
NOTIFY pgrst, 'reload schema';

SELECT 'Reparo de campos e views concluído com sucesso.' as resultado;
