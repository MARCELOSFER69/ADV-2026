-- ==============================================================================
-- SCRIPT DE SINCRONIZAÇÃO DE DADOS (DATA INTEGRITY)
-- Correção do isolamento de Filiais na visualização de Processos
-- ==============================================================================

-- O que estava acontecendo: a tela de processos estava filtrando pela sua Filial (ex: Santa Inês).
-- Anteriormente, a View copiava a filial do Cliente e colava no Processo forçadamente (`c.filial AS filial`).
-- Mas como a própria tabela 'cases' já ganhou uma coluna 'filial' internamente há pouco tempo, o PostgreSQL
-- proibiu de puxar 'filial' do cliente (Erro de coluna duplicada) quando refizemos a View.
-- Como a coluna 'filial' original do processo estava VAZIA (NULL), nada passava no filtro!

-- SOLUÇÃO: Vamos copiar de forma inteligente a filial do Cliente diretamente para o campo 'filial' do Processo
-- em definitivo. Isso resolve a consulta para sempre e zera a chance de bugs no React Query!

UPDATE public.cases cs 
SET filial = cl.filial 
FROM public.clients cl 
WHERE cs.client_id = cl.id 
AND (cs.filial IS NULL OR cs.filial = '');

-- Forçar atualização
NOTIFY pgrst, 'reload schema';
