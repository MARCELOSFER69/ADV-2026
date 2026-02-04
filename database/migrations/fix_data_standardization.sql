-- SQL para padronizar dados de Processos e Tribunais
-- EXECUTAR NO SUPABASE SQL EDITOR

-- 1. Padronizar Tribunais para 'INSS' (remover espaços, normalizar caixa, aceitar 'Administrativo')
UPDATE cases 
SET tribunal = 'INSS' 
WHERE trim(upper(tribunal)) IN ('INSS', 'ADMINISTRATIVO') 
   OR tribunal IS NULL 
   OR tribunal = '';

-- 2. Corrigir tipos com letras trocadas (BPC-LOAS -> BPC/LOAS)
UPDATE cases 
SET tipo = 'BPC/LOAS' 
WHERE upper(tipo) = 'BPC-LOAS';

-- 3. Corrigir capitalização e espaços em Tipos de Ação
UPDATE cases 
SET tipo = 'Pensão por Morte' 
WHERE upper(tipo) = 'PENSÃO POR MORTE';

UPDATE cases 
SET tipo = 'Salário Maternidade' 
WHERE upper(tipo) = 'SALÁRIO MATERNIDADE';

UPDATE cases 
SET tipo = trim(tipo) 
WHERE tipo ILIKE '%Pensão por Morte%' 
   OR tipo ILIKE '%Salário Maternidade%' 
   OR tipo ILIKE '%Aposentadoria%' 
   OR tipo ILIKE '%BPC%';

-- 4. Garantir que processos sem tribunal mas com tipos administrativos sejam marcados como INSS
UPDATE cases 
SET tribunal = 'INSS' 
WHERE (tribunal IS NULL OR tribunal = '')
  AND tipo IN ('Salário Maternidade', 'Aposentadoria', 'BPC/LOAS', 'Auxílio Doença', 'Pensão por Morte', 'Seguro Defeso');

-- Confirmação
SELECT tipo, tribunal, count(*) 
FROM cases 
GROUP BY 1, 2 
ORDER BY 3 DESC;
