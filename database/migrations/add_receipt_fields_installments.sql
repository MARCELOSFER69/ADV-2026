-- Migração: Adicionar campos de recibo às parcelas
-- Esses campos permitem rastrear a geração, assinatura e upload de recibos por parcela

ALTER TABLE case_installments ADD COLUMN IF NOT EXISTS recibo_gerado BOOLEAN DEFAULT false;
ALTER TABLE case_installments ADD COLUMN IF NOT EXISTS recibo_assinado BOOLEAN DEFAULT false;
ALTER TABLE case_installments ADD COLUMN IF NOT EXISTS recibo_url TEXT;
