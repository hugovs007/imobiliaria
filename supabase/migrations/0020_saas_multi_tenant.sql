-- ============================================================
-- 0020: SaaS multi-empresa (multi-tenant)
--
-- - Cria a tabela `empresas` (dados do locador p/ white-label)
-- - Adiciona empresa_id em todas as tabelas de domínio
-- - RLS por empresa em TODAS as tabelas (substitui as policies
--   permissivas "Acesso Autenticado X")
-- - Empresa padrão = dados atuais do locador (Paulo Sérgio)
-- - Hugo (hugovinicius.27@gmail.com) vira super_admin
--
-- Idempotente: pode ser executado mais de uma vez com segurança.
-- Pré-requisito: 0016, 0018 e 0019 já aplicados (todos idempotentes).
-- ============================================================

-- ===== 1. Tabela de empresas =====
CREATE TABLE IF NOT EXISTS public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj_cpf TEXT,
  nacionalidade TEXT DEFAULT 'brasileiro',
  estado_civil TEXT,
  profissao TEXT,
  endereco TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  uf TEXT,
  cep TEXT,
  telefone TEXT,
  email TEXT,
  whatsapp TEXT,
  chave_pix TEXT,
  logo_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- ===== 2. Funções auxiliares de isolamento =====
-- SECURITY DEFINER: executa como dono (postgres), que ignora RLS,
-- evitando recursão infinita nas policies de profiles.
CREATE OR REPLACE FUNCTION public.empresa_do_usuario()
RETURNS UUID
LANGUAGE sql STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.eh_super_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.papel = 'super_admin'
  );
$$;

-- ===== 3. Empresa padrão (dados atuais do locador) =====
INSERT INTO public.empresas (
  id, nome, cnpj_cpf, nacionalidade, estado_civil, profissao,
  endereco, numero, complemento, bairro, cidade, uf, cep,
  telefone, whatsapp, chave_pix
) VALUES (
  '11111111-1111-4111-8111-111111111111',
  'Paulo Sérgio de Souza Tôrres',
  '930.952.604-15',
  'brasileiro',
  'casado',
  'empresário',
  'Rua Bonifácio Nóbrega',
  '817',
  'Apto 103',
  'São José',
  'Santa Luzia',
  'PB',
  '58.600-000',
  '(83) 9 9971-7478',
  '(83) 99350-2181',
  'CPF 930.952.604-15, Banco do Brasil'
)
ON CONFLICT (id) DO NOTHING;

-- ===== 4. profiles: vínculo com empresa + super_admin =====
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id);

UPDATE public.profiles
SET empresa_id = '11111111-1111-4111-8111-111111111111'
WHERE empresa_id IS NULL;

UPDATE public.profiles
SET papel = 'super_admin'
WHERE lower(email) = 'hugovinicius.27@gmail.com'
  AND papel IS DISTINCT FROM 'super_admin';

-- ===== 5. empresa_id nas tabelas de domínio =====
-- DEFAULT empresa_do_usuario(): todo INSERT feito pelo app já sai
-- com a empresa do usuário logado automaticamente.
DO $$
DECLARE
  t TEXT;
  v_empresa_padrao CONSTANT TEXT := '11111111-1111-4111-8111-111111111111';
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'proprietarios','imoveis','inquilinos','contratos','pagamentos','reajustes',
    'manutencoes','contas_consumo','arquivos','movimentacoes_pagamento',
    'ocorrencias','vistorias','vistoria_itens','vistoria_fotos','aditivos','leads'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id)', t);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN empresa_id SET DEFAULT public.empresa_do_usuario()', t);
    EXECUTE format('UPDATE public.%I SET empresa_id = %L WHERE empresa_id IS NULL', t, v_empresa_padrao);
  END LOOP;
END $$;

-- ===== 6. configuracoes: PK composta (empresa_id, chave) =====
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id);
ALTER TABLE public.configuracoes ALTER COLUMN empresa_id SET DEFAULT public.empresa_do_usuario();
UPDATE public.configuracoes SET empresa_id = '11111111-1111-4111-8111-111111111111' WHERE empresa_id IS NULL;

ALTER TABLE public.configuracoes DROP CONSTRAINT IF EXISTS configuracoes_pkey;
ALTER TABLE public.configuracoes DROP CONSTRAINT IF EXISTS configuracoes_empresa_chave_pk;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'configuracoes_empresa_chave_pk'
      AND conrelid = 'public.configuracoes'::regclass
  ) THEN
    ALTER TABLE public.configuracoes
      ADD CONSTRAINT configuracoes_empresa_chave_pk PRIMARY KEY (empresa_id, chave);
  END IF;
END $$;

-- ===== 7. Unicidade por empresa =====
-- Códigos/CPFs podem se repetir ENTRE empresas, nunca dentro de uma.
ALTER TABLE public.imoveis DROP CONSTRAINT IF EXISTS imoveis_codigo_key;
ALTER TABLE public.imoveis DROP CONSTRAINT IF EXISTS imoveis_empresa_codigo_key;
ALTER TABLE public.contratos DROP CONSTRAINT IF EXISTS contratos_codigo_key;
ALTER TABLE public.contratos DROP CONSTRAINT IF EXISTS contratos_empresa_codigo_key;
ALTER TABLE public.inquilinos DROP CONSTRAINT IF EXISTS inquilinos_cpf_cnpj_key;
ALTER TABLE public.inquilinos DROP CONSTRAINT IF EXISTS inquilinos_empresa_cpf_key;
ALTER TABLE public.proprietarios DROP CONSTRAINT IF EXISTS proprietarios_cpf_cnpj_key;
ALTER TABLE public.proprietarios DROP CONSTRAINT IF EXISTS proprietarios_empresa_cpf_key;

-- Remove a unicidade global de pagamentos.mes_ano (impedia 2 contratos
-- no mesmo mês); a app já controla a geração por contrato.
ALTER TABLE public.pagamentos DROP CONSTRAINT IF EXISTS pagamentos_mes_ano_key;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'imoveis_empresa_codigo_key' AND conrelid = 'public.imoveis'::regclass) THEN
    ALTER TABLE public.imoveis ADD CONSTRAINT imoveis_empresa_codigo_key UNIQUE (empresa_id, codigo);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contratos_empresa_codigo_key' AND conrelid = 'public.contratos'::regclass) THEN
    ALTER TABLE public.contratos ADD CONSTRAINT contratos_empresa_codigo_key UNIQUE (empresa_id, codigo);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inquilinos_empresa_cpf_key' AND conrelid = 'public.inquilinos'::regclass) THEN
    ALTER TABLE public.inquilinos ADD CONSTRAINT inquilinos_empresa_cpf_key UNIQUE (empresa_id, cpf_cnpj);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'proprietarios_empresa_cpf_key' AND conrelid = 'public.proprietarios'::regclass) THEN
    ALTER TABLE public.proprietarios ADD CONSTRAINT proprietarios_empresa_cpf_key UNIQUE (empresa_id, cpf_cnpj);
  END IF;
END $$;

-- ===== 8. Boleto: "nosso número" único por empresa =====
-- (Cada empresa tem seu próprio convênio BB; números podem coincidir entre elas.)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'pagamentos'
               AND column_name = 'boleto_nosso_numero') THEN
    DROP INDEX IF EXISTS idx_pagamentos_boleto_nosso_numero;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_pagamentos_boleto_nosso_empresa
      ON public.pagamentos (empresa_id, boleto_nosso_numero)
      WHERE boleto_nosso_numero IS NOT NULL;
  END IF;
END $$;

-- ===== 9. Trigger: lead herda a empresa do imóvel =====
-- (A API pública insere leads com service role, sem auth.uid().)
CREATE OR REPLACE FUNCTION public.definir_empresa_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.empresa_id := COALESCE(
    NEW.empresa_id,
    (SELECT i.empresa_id FROM public.imoveis i WHERE i.id = NEW.imovel_id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_definir_empresa_lead ON public.leads;
CREATE TRIGGER trg_definir_empresa_lead
  BEFORE INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.definir_empresa_lead();

-- ===== 10. RPCs de reajuste com empresa =====
CREATE OR REPLACE FUNCTION public.gerar_reajustes_pendentes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.reajustes
    (contrato_id, empresa_id, data_reajuste, indice_aplicado, taxa_aplicada, valor_anterior, valor_novo, aprovado, status)
  SELECT
    c.id,
    c.empresa_id,
    (b.base + (c.periodicidade_reajuste_meses || ' months')::interval)::date,
    c.indice_reajuste,
    t.taxa / 100.0,
    v.valor,
    ROUND(v.valor * (1 + t.taxa / 100.0), 2),
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
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_valor_novo NUMERIC(12,2);
  v_empresa UUID;
BEGIN
  SELECT ROUND(r.valor_anterior * (1 + r.taxa_aplicada), 2), r.empresa_id
    INTO v_valor_novo, v_empresa
  FROM public.reajustes r
  WHERE r.id = p_reajuste_id
  FOR UPDATE;

  IF v_valor_novo IS NULL THEN
    RAISE EXCEPTION 'Reajuste % não encontrado', p_reajuste_id;
  END IF;

  IF NOT public.eh_super_admin()
     AND v_empresa IS DISTINCT FROM public.empresa_do_usuario() THEN
    RAISE EXCEPTION 'Sem permissão para aplicar este reajuste';
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

-- ===== 11. RLS: remove TODAS as policies permissivas antigas =====
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ===== 12. Novas policies (isolamento por empresa) =====

-- empresas: super_admin vê/gerencia tudo; cada usuário vê/edita a sua.
CREATE POLICY "empresas_super_admin" ON public.empresas
  FOR ALL TO authenticated
  USING (public.eh_super_admin()) WITH CHECK (public.eh_super_admin());
CREATE POLICY "empresas_propria_leitura" ON public.empresas
  FOR SELECT TO authenticated
  USING (id = public.empresa_do_usuario());
CREATE POLICY "empresas_propria_edicao" ON public.empresas
  FOR UPDATE TO authenticated
  USING (id = public.empresa_do_usuario()) WITH CHECK (id = public.empresa_do_usuario());

-- profiles: leitura/edição dentro da empresa; criação/remoção só super_admin.
CREATE POLICY "profiles_leitura" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.eh_super_admin() OR empresa_id = public.empresa_do_usuario());
CREATE POLICY "profiles_edicao" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.eh_super_admin() OR empresa_id = public.empresa_do_usuario())
  WITH CHECK (public.eh_super_admin() OR empresa_id = public.empresa_do_usuario());
CREATE POLICY "profiles_insercao" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.eh_super_admin());
CREATE POLICY "profiles_remocao" ON public.profiles
  FOR DELETE TO authenticated
  USING (public.eh_super_admin());

-- configuracoes: estrito por empresa (credenciais BB isoladas).
CREATE POLICY "configuracoes_empresa" ON public.configuracoes
  FOR ALL TO authenticated
  USING (empresa_id = public.empresa_do_usuario())
  WITH CHECK (empresa_id = public.empresa_do_usuario());

-- indices_economicos: compartilhado — leitura p/ todos, escrita só super_admin.
CREATE POLICY "indices_leitura" ON public.indices_economicos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "indices_escrita" ON public.indices_economicos
  FOR ALL TO authenticated
  USING (public.eh_super_admin()) WITH CHECK (public.eh_super_admin());

-- Tabelas de domínio: tudo restrito à empresa do usuário (super_admin livre).
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'proprietarios','imoveis','inquilinos','contratos','pagamentos','reajustes',
    'manutencoes','contas_consumo','arquivos','movimentacoes_pagamento',
    'ocorrencias','vistorias','vistoria_itens','vistoria_fotos','aditivos','leads'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY "isolamento_empresa" ON public.%I FOR ALL TO authenticated USING (public.eh_super_admin() OR empresa_id = public.empresa_do_usuario()) WITH CHECK (public.eh_super_admin() OR empresa_id = public.empresa_do_usuario())',
      t
    );
  END LOOP;
END $$;

-- ===== 13. Índices de desempenho =====
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'proprietarios','imoveis','inquilinos','contratos','pagamentos','reajustes',
    'manutencoes','contas_consumo','arquivos','movimentacoes_pagamento',
    'ocorrencias','vistorias','vistoria_itens','vistoria_fotos','aditivos','leads'
  ]
  LOOP
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_empresa_id ON public.%I(empresa_id)', t, t);
  END LOOP;
END $$;
CREATE INDEX IF NOT EXISTS idx_profiles_empresa_id ON public.profiles(empresa_id);
CREATE INDEX IF NOT EXISTS idx_configuracoes_empresa_id ON public.configuracoes(empresa_id);

-- Fim. Verificação rápida (opcional):
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY 1, 2;
