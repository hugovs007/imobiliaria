-- =====================================================
-- 0014_pilota_features.sql
-- Novos módulos inspirados no Pilota Imóveis:
--   • Ocorrências (registro de incidentes por contrato)
--   • Vistorias (checklist por cômodo + fotos)
--   • Aditivos contratuais
--   • Leads (funil de captação)
-- Apenas adições — não altera tabelas existentes.
-- =====================================================

-- ===== ENUMS =====
DO $$ BEGIN
    CREATE TYPE public.vistoria_tipo AS ENUM ('entrada', 'saida', 'periodica');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.item_estado AS ENUM ('bom', 'regular', 'ruim', 'nao_se_aplica');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.ocorrencia_gravidade AS ENUM ('baixa', 'media', 'alta');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.ocorrencia_status AS ENUM ('aberta', 'em_andamento', 'resolvida', 'cancelada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.aditivo_tipo AS ENUM ('valor', 'prazo', 'clausula', 'outro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.lead_status AS ENUM ('novo', 'em_atendimento', 'visitou', 'contratou', 'perdido');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===== OCORRÊNCIAS =====
CREATE TABLE IF NOT EXISTS public.ocorrencias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contrato_id UUID REFERENCES public.contratos(id) ON DELETE CASCADE,
    inquilino_id UUID REFERENCES public.inquilinos(id) ON DELETE SET NULL,
    imovel_id UUID REFERENCES public.imoveis(id) ON DELETE SET NULL,
    tipo TEXT NOT NULL,
    gravidade public.ocorrencia_gravidade NOT NULL DEFAULT 'media',
    status public.ocorrencia_status NOT NULL DEFAULT 'aberta',
    descricao TEXT NOT NULL,
    data_ocorrencia DATE NOT NULL DEFAULT CURRENT_DATE,
    resolvida_em DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== VISTORIAS =====
CREATE TABLE IF NOT EXISTS public.vistorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    imovel_id UUID NOT NULL REFERENCES public.imoveis(id) ON DELETE CASCADE,
    contrato_id UUID REFERENCES public.contratos(id) ON DELETE SET NULL,
    tipo public.vistoria_tipo NOT NULL DEFAULT 'entrada',
    data_vistoria DATE NOT NULL DEFAULT CURRENT_DATE,
    vistoriador TEXT,
    observacoes_gerais TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vistoria_itens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vistoria_id UUID NOT NULL REFERENCES public.vistorias(id) ON DELETE CASCADE,
    comodo TEXT NOT NULL,
    item TEXT NOT NULL,
    estado public.item_estado NOT NULL DEFAULT 'bom',
    observacao TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vistoria_fotos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vistoria_id UUID NOT NULL REFERENCES public.vistorias(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    descricao TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== ADITIVOS =====
CREATE TABLE IF NOT EXISTS public.aditivos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
    tipo public.aditivo_tipo NOT NULL DEFAULT 'outro',
    descricao TEXT NOT NULL,
    data_assinatura DATE NOT NULL DEFAULT CURRENT_DATE,
    valor_anterior NUMERIC(12, 2),
    valor_novo NUMERIC(12, 2),
    nova_data_fim DATE,
    documento_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== LEADS =====
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    telefone TEXT NOT NULL,
    email TEXT,
    imovel_id UUID REFERENCES public.imoveis(id) ON DELETE SET NULL,
    origem TEXT,
    status public.lead_status NOT NULL DEFAULT 'novo',
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== ÍNDICES =====
CREATE INDEX IF NOT EXISTS idx_ocorrencias_contrato ON public.ocorrencias(contrato_id);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_imovel ON public.ocorrencias(imovel_id);
CREATE INDEX IF NOT EXISTS idx_vistorias_imovel ON public.vistorias(imovel_id);
CREATE INDEX IF NOT EXISTS idx_vistorias_contrato ON public.vistorias(contrato_id);
CREATE INDEX IF NOT EXISTS idx_vistoria_itens_vistoria ON public.vistoria_itens(vistoria_id);
CREATE INDEX IF NOT EXISTS idx_vistoria_fotos_vistoria ON public.vistoria_fotos(vistoria_id);
CREATE INDEX IF NOT EXISTS idx_aditivos_contrato ON public.aditivos(contrato_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);

-- ===== RLS =====
ALTER TABLE public.ocorrencias ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "Acesso Autenticado Ocorrencias" ON public.ocorrencias
        FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.vistorias ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "Acesso Autenticado Vistorias" ON public.vistorias
        FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.vistoria_itens ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "Acesso Autenticado Vistoria Itens" ON public.vistoria_itens
        FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.vistoria_fotos ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "Acesso Autenticado Vistoria Fotos" ON public.vistoria_fotos
        FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.aditivos ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "Acesso Autenticado Aditivos" ON public.aditivos
        FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "Acesso Autenticado Leads" ON public.leads
        FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
