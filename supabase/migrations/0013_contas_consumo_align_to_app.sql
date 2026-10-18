-- 0013 — Alinha a tabela contas_consumo ao formato esperado pelo sistema.
--
-- Problema: a tabela em produção foi criada com um schema diferente do app,
-- o que fazia todo cadastro de conta falhar (erro 400 no insert -> 500 -> crash):
--   1. "tipo" era enum conta_tipo ('Água', 'Energia') — o app envia 'agua'/'energia'/'outra' (texto)
--   2. "responsavel" era enum conta_responsavel ('Inquilino', 'Proprietário') — o app envia 'proprietario'/'inquilino' (texto)
--   3. "data_vencimento" era NOT NULL sem default — o app não envia essa coluna
--   4. "competencia" é varchar(7) no formato 'YYYY-MM' — corrigido no código (não envia mais 'YYYY-MM-01')
--
-- NO BANCO ESPELHO (criado pelo 001_complete_schema.sql) a tabela já nasce com
-- "tipo" TEXT e "competencia" DATE, e NÃO possui a coluna "data_vencimento" —
-- por isso cada alteração abaixo é protegida (DO $$ ... $$) e funciona nos dois bancos.
--
-- A tabela está vazia, portanto a alteração não tem risco de perda de dados.
-- EXECUTAR MANUALMENTE NO SQL EDITOR DO SUPABASE (migrations não são aplicadas automaticamente).
-- Idempotente: pode ser re-executada.

-- tipo: enum -> TEXT (no-op se já é TEXT)
ALTER TABLE public.contas_consumo ALTER COLUMN tipo DROP DEFAULT;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contas_consumo'
      AND column_name = 'tipo' AND data_type = 'USER-DEFINED'
  ) THEN
    ALTER TABLE public.contas_consumo ALTER COLUMN tipo TYPE TEXT USING tipo::text;
  END IF;
END $$;

-- responsavel: enum -> TEXT (no-op se já é TEXT)
ALTER TABLE public.contas_consumo ALTER COLUMN responsavel DROP DEFAULT;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contas_consumo'
      AND column_name = 'responsavel' AND data_type = 'USER-DEFINED'
  ) THEN
    ALTER TABLE public.contas_consumo ALTER COLUMN responsavel TYPE TEXT USING responsavel::text;
  END IF;
END $$;

-- data_vencimento: só existe na produção (remover NOT NULL); no espelho a coluna não existe
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contas_consumo'
      AND column_name = 'data_vencimento'
  ) THEN
    ALTER TABLE public.contas_consumo ALTER COLUMN data_vencimento DROP NOT NULL;
  END IF;
END $$;

-- competencia: no espelho é DATE ('YYYY-MM-DD'); o app usa texto 'YYYY-MM'.
-- Na produção já é varchar(7) — o bloco abaixo é no-op lá.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contas_consumo'
      AND column_name = 'competencia' AND data_type = 'date'
  ) THEN
    ALTER TABLE public.contas_consumo ALTER COLUMN competencia TYPE TEXT USING to_char(competencia, 'YYYY-MM');
  END IF;
END $$;
