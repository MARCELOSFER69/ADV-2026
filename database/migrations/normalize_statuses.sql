-- Migração para normalizar os status dos processos
-- Corrige a falta de acento em 'Concluído' que impede a exibição correta no Kanban

UPDATE cases 
SET status = 'Concluído (Concedido)' 
WHERE status = 'Concluido (Concedido)';

UPDATE cases 
SET status = 'Concluído (Indeferido)' 
WHERE status = 'Concluido (Indeferido)';

-- Verificação
SELECT status, count(*) 
FROM cases 
WHERE status LIKE 'Conclui%'
GROUP BY 1;
