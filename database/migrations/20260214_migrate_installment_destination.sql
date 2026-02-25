-- Migration to update all existing installments from 'Cliente' to 'Escritório'
-- Date: 2026-02-14

UPDATE case_installments
SET destino = 'Escritório'
WHERE destino = 'Cliente';
