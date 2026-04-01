-- SCRIPT PARA GARANTIR QUE OS DADOS ANTIGOS RECEBAM 'principal'
-- Se a coluna já existia antes do nosso script, o banco não aplicou o 'default' retroativamente.
-- Isso vai atualizar qualquer cliente, processo ou dado financeiro antigo para o sistema JNM!

UPDATE public.users SET tenant_id = 'principal' WHERE tenant_id IS NULL;
UPDATE public.clients SET tenant_id = 'principal' WHERE tenant_id IS NULL;
UPDATE public.cases SET tenant_id = 'principal' WHERE tenant_id IS NULL;
UPDATE public.financial_records SET tenant_id = 'principal' WHERE tenant_id IS NULL;
UPDATE public.events SET tenant_id = 'principal' WHERE tenant_id IS NULL;
UPDATE public.tasks SET tenant_id = 'principal' WHERE tenant_id IS NULL;
UPDATE public.captadores SET tenant_id = 'principal' WHERE tenant_id IS NULL;
UPDATE public.office_expenses SET tenant_id = 'principal' WHERE tenant_id IS NULL;
UPDATE public.office_balances SET tenant_id = 'principal' WHERE tenant_id IS NULL;
UPDATE public.commission_receipts SET tenant_id = 'principal' WHERE tenant_id IS NULL;
UPDATE public.chats SET tenant_id = 'principal' WHERE tenant_id IS NULL;
UPDATE public.chat_messages SET tenant_id = 'principal' WHERE tenant_id IS NULL;

-- Atualizar o cache só por garantia
NOTIFY pgrst, 'reload schema';
