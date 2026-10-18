-- =====================================================================
-- 0015_align_schema_to_app.sql
-- Alinha o schema do banco ESPELHO (gerado pelo 001_complete_schema.sql)
-- ao que o aplicativo realmente lê e escreve.
--
-- ORDEM DE EXECUÇÃO: rodar DEPOIS de 0013 e ANTES de 0011.
-- Todas as operações são idempotentes — o script pode ser re-executado.
--
-- Resumo das correções:
--   1.  proprietarios.cpf_cnpj aceita NULL (Espólio etc.) — UNIQUE permite vários NULLs
--   2.  inquilinos.cpf_cnpj e telefone aceitam NULL (o app envia null)
--   3.  imoveis.status e finalidade: enum -> TEXT (o app usa 'Disponível'/'Alugado'/...)
--   4.  imoveis.matricula_agua/matricula_luz (no-op se 0012 já rodou)
--   5.  manutencoes.custo e observacoes (colunas que o app usa)
--   6.  contratos: valor_aluguel + 12 colunas de fiadores; codigo/data_fim/valor_atual opcionais
--   7.  reajustes.status ('pendente'/'aplicado')
--   8.  movimentacoes_pagamento (pagamentos parciais — página de pagamentos)
--   9.  indices_economicos recriada com as colunas do app (indice/mes_referencia/variacao_12m/fonte)
--   10. arquivos: renomeia nome_arquivo->nome, url->path_ou_url, tipo_mime->tipo_arquivo + storage_provider
--   11. profiles.role -> papel (o app seleciona "papel")
--   12. RPCs gerar_reajustes_pendentes() e aplicar_reajuste() usadas pelos contratos
--
-- ATENÇÃO: script destinado ao BANCO ESPELHO. O item 12 usa CREATE OR REPLACE,
-- o que sobrescreveria as funções equivalentes da produção — não rodar lá sem revisão.
-- EXECUTAR MANUALMENTE NO SQL EDITOR DO SUPABASE.
-- =====================================================================

-- ===== 1. proprietarios =====
ALTER TABLE public.proprietarios ALTER COLUMN cpf_cnpj DROP NOT NULL;

-- ===== 2. inquilinos =====
ALTER TABLE public.inquilinos ALTER COLUMN cpf_cnpj DROP NOT NULL;
ALTER TABLE public.inquilinos ALTER COLUMN telefone DROP NOT NULL;

-- ===== 3. imoveis.status / finalidade: enum -> TEXT =====
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'imoveis'
      AND column_name = 'status' AND data_type = 'USER-DEFINED'
  ) THEN
    ALTER TABLE public.imoveis ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE public.imoveis ALTER COLUMN status TYPE TEXT USING status::text;
  END IF;
END $$;
ALTER TABLE public.imoveis ALTER COLUMN status SET DEFAULT 'Disponível';

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'imoveis'
      AND column_name = 'finalidade' AND data_type = 'USER-DEFINED'
  ) THEN
    ALTER TABLE public.imoveis ALTER COLUMN finalidade DROP DEFAULT;
    ALTER TABLE public.imoveis ALTER COLUMN finalidade TYPE TEXT USING finalidade::text;
  END IF;
END $$;
ALTER TABLE public.imoveis ALTER COLUMN finalidade SET DEFAULT 'Residencial';

-- Normaliza valores existentes para o vocabulário do app (Title Case)
UPDATE public.imoveis SET status = 'Disponível' WHERE status = 'disponivel';
UPDATE public.imoveis SET status = 'Alugado'      WHERE status = 'alugado';
UPDATE public.imoveis SET status = 'Manutenção'  WHERE status = 'manutencao';
UPDATE public.imoveis SET status = 'Inativo'     WHERE status = 'inativo';
UPDATE public.imoveis SET finalidade = 'Residencial' WHERE finalidade = 'residencial';
UPDATE public.imoveis SET finalidade = 'Comercial'   WHERE finalidade = 'comercial';
UPDATE public.imoveis SET finalidade = 'Industrial'  WHERE finalidade = 'industrial';
UPDATE public.imoveis SET finalidade = 'Outro'       WHERE finalidade = 'outro';

-- ===== 4. imoveis: matrículas (no-op se 0012 já rodou) =====
ALTER TABLE public.imoveis ADD COLUMN IF NOT EXISTS matricula_agua TEXT;
ALTER TABLE public.imoveis ADD COLUMN IF NOT EXISTS matricula_luz TEXT;

-- ===== 5. manutencoes =====
ALTER TABLE public.manutencoes ADD COLUMN IF NOT EXISTS custo NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE public.manutencoes ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- ===== 6. contratos =====
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS valor_aluguel NUMERIC(12,2);
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS fiador_1_nome TEXT;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS fiador_1_cpf TEXT;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS fiador_1_estado_civil TEXT;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS fiador_1_profissao TEXT;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS fiador_1_endereco TEXT;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS fiador_1_telefone TEXT;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS fiador_2_nome TEXT;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS fiador_2_cpf TEXT;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS fiador_2_estado_civil TEXT;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS fiador_2_profissao TEXT;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS fiador_2_endereco TEXT;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS fiador_2_telefone TEXT;

-- codigo: o app não envia (exibe fallback próprio); data_fim: contratos abertos;
-- valor_atual: o app envia valor_aluguel (valor_atual fica só para leitura)
ALTER TABLE public.contratos ALTER COLUMN codigo DROP NOT NULL;
ALTER TABLE public.contratos ALTER COLUMN data_fim DROP NOT NULL;
ALTER TABLE public.contratos ALTER COLUMN valor_atual DROP NOT NULL;

-- Mantém valor_atual preenchido para compatibilidade de leitura
UPDATE public.contratos SET valor_atual = valor_aluguel
WHERE valor_atual IS NULL AND valor_aluguel IS NOT NULL;

-- ===== 7. reajustes.status =====
ALTER TABLE public.reajustes ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pendente';

-- ===== 8. movimentacoes_pagamento (pagamentos parciais) =====
CREATE TABLE IF NOT EXISTS public.movimentacoes_pagamento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pagamento_id UUID NOT NULL REFERENCES public.pagamentos(id) ON DELETE CASCADE,
    valor_pago NUMERIC(12,2) NOT NULL,
    forma_pagamento TEXT,
    data_pagamento TEXT,
    saldo_anterior NUMERIC(12,2),
    saldo_restante NUMERIC(12,2),
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.movimentacoes_pagamento ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "Acesso Autenticado Movimentacoes" ON public.movimentacoes_pagamento
        FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===== 9. indices_economicos: recriar com as colunas do app =====
-- (Só derruba a tabela se ela ainda estiver no formato antigo — coluna mes_ano —
--  preservando os dados caso este script seja re-executado depois de a tabela já estar ok.)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'indices_economicos'
      AND column_name = 'mes_ano'
  ) THEN
    DROP TABLE public.indices_economicos CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.indices_economicos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    indice TEXT NOT NULL,
    mes_referencia TEXT NOT NULL,
    variacao_12m NUMERIC,
    fonte TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (indice, mes_referencia)
);

ALTER TABLE public.indices_economicos ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "Acesso Autenticado Indices" ON public.indices_economicos
        FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===== 10. arquivos: nomes de coluna que o app usa =====
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'arquivos' AND column_name = 'nome_arquivo') THEN
    ALTER TABLE public.arquivos RENAME COLUMN nome_arquivo TO nome;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'arquivos' AND column_name = 'url') THEN
    ALTER TABLE public.arquivos RENAME COLUMN url TO path_ou_url;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'arquivos' AND column_name = 'tipo_mime') THEN
    ALTER TABLE public.arquivos RENAME COLUMN tipo_mime TO tipo_arquivo;
  END IF;
END $$;
ALTER TABLE public.arquivos ADD COLUMN IF NOT EXISTS storage_provider TEXT;

-- ===== 11. profiles.role -> papel =====
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role') THEN
    ALTER TABLE public.profiles RENAME COLUMN role TO papel;
  END IF;
END $$;

-- ===== 12. RPCs de reajuste (usadas em contratos) =====
CREATE OR REPLACE FUNCTION public.gerar_reajustes_pendentes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO public
AS $$
BEGIN
  INSERT INTO public.reajustes
    (contrato_id, data_reajuste, indice_aplicado, taxa_aplicada, valor_anterior, valor_novo, aprovado, status)
  SELECT
    c.id,
    (b.base + (c.periodicidade_reajuste_meses || ' months')::interval)::date,
    c.indice_reajuste,
    t.taxa,
    v.valor,
    ROUND(v.valor * (1 + t.taxa), 2),
    FALSE,
    'pendente'
  FROM public.contratos c
  CROSS JOIN LATERAL (
    SELECT COALESCE(
      (SELECT MAX(r.data_reajuste) FROM public.reajustes r WHERE r.contrato_id = c.id),
      c.data_inicio
    ) AS base
  ) b
  CROSS JOIN LATERAL (
    SELECT COALESCE(
      (SELECT i.variacao_12m FROM public.indices_economicos i
       WHERE i.indice = c.indice_reajuste::text
       ORDER BY i.mes_referencia DESC LIMIT 1),
      0
    ) AS taxa
  ) t
  CROSS JOIN LATERAL (SELECT COALESCE(c.valor_aluguel, c.valor_atual, 0) AS valor) v
  WHERE c.ativo = TRUE
    AND (b.base + (c.periodicidade_reajuste_meses || ' months')::interval)::date <= CURRENT_DATE
    AND NOT EXISTS (
      SELECT 1 FROM public.reajustes r2
      WHERE r2.contrato_id = c.id AND r2.status = 'pendente'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.aplicar_reajuste(p_reajuste_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO public
AS $$
DECLARE
  v_valor_novo NUMERIC(12,2);
BEGIN
  SELECT ROUND(r.valor_anterior * (1 + r.taxa_aplicada), 2)
    INTO v_valor_novo
  FROM public.reajustes r
  WHERE r.id = p_reajuste_id
  FOR UPDATE;

  IF v_valor_novo IS NULL THEN
    RAISE EXCEPTION 'Reajuste % não encontrado', p_reajuste_id;
  END IF;

  UPDATE public.reajustes
  SET valor_novo = v_valor_novo, aprovado = TRUE, status = 'aplicado'
  WHERE id = p_reajuste_id;

  UPDATE public.contratos c
  SET valor_atual = v_valor_novo,
      valor_aluguel = v_valor_novo
  FROM public.reajustes r
  WHERE r.id = p_reajuste_id AND c.id = r.contrato_id;
END;
$$;
