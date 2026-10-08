-- 0013 — Alinha a tabela contas_consumo ao formato esperado pelo sistema.
--
-- Problema: a tabela em produção foi criada com um schema diferente do app,
-- o que fazia todo cadastro de conta falhar (erro 400 no insert -> 500 -> crash):
--   1. "tipo" era enum conta_tipo ('Água', 'Energia') — o app envia 'agua'/'energia'/'outra' (texto)
--   2. "responsavel" era enum conta_responsavel ('Inquilino', 'Proprietário') — o app envia 'proprietario'/'inquilino' (texto)
--   3. "data_vencimento" era NOT NULL sem default — o app não envia essa coluna
--   4. "competencia" é varchar(7) no formato 'YYYY-MM' — corrigido no código (não envia mais 'YYYY-MM-01')
--
-- A tabela está vazia, portanto a alteração não tem risco de perda de dados.
-- EXECUTAR MANUALMENTE NO SQL EDITOR DO SUPABASE (migrations não são aplicadas automaticamente).

ALTER TABLE public.contas_consumo ALTER COLUMN tipo DROP DEFAULT;
ALTER TABLE public.contas_consumo ALTER COLUMN tipo TYPE TEXT USING tipo::text;

ALTER TABLE public.contas_consumo ALTER COLUMN responsavel DROP DEFAULT;
ALTER TABLE public.contas_consumo ALTER COLUMN responsavel TYPE TEXT USING responsavel::text;

ALTER TABLE public.contas_consumo ALTER COLUMN data_vencimento DROP NOT NULL;
