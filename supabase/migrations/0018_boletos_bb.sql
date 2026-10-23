-- 0018: Emissão de boletos via API Banco do Brasil + baixa automática de mensalidades.

-- Dados do boleto registrado em cada mensalidade.
ALTER TABLE public.pagamentos
  ADD COLUMN IF NOT EXISTS boleto_nosso_numero TEXT,
  ADD COLUMN IF NOT EXISTS boleto_linha_digitavel TEXT,
  ADD COLUMN IF NOT EXISTS boleto_codigo_barras TEXT,
  ADD COLUMN IF NOT EXISTS boleto_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS boleto_bb_numero TEXT,
  ADD COLUMN IF NOT EXISTS boleto_situacao TEXT,
  ADD COLUMN IF NOT EXISTS boleto_registrado_em TIMESTAMPTZ;

-- Garante que um mesmo "nosso número" nunca seja usado em duas mensalidades.
CREATE UNIQUE INDEX IF NOT EXISTS idx_pagamentos_boleto_nosso_numero
  ON public.pagamentos (boleto_nosso_numero)
  WHERE boleto_nosso_numero IS NOT NULL;

-- Configurações gerais do sistema (chave-valor): credenciais do BB etc.
CREATE TABLE IF NOT EXISTS public.configuracoes (
  chave TEXT PRIMARY KEY,
  valor TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso Autenticado Configuracoes" ON public.configuracoes;
CREATE POLICY "Acesso Autenticado Configuracoes" ON public.configuracoes
  FOR ALL TO authenticated USING (true);
