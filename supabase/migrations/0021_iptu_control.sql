-- 0021: Controle de IPTU (Imposto Predial e Territorial Urbano)
-- Adiciona tabela para controle de pagamentos de IPTU por imóvel

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tabela de IPTU (Histórico de pagamentos de IPTU por imóvel)
CREATE TABLE IF NOT EXISTS public.iptu (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    imovel_id UUID NOT NULL REFERENCES public.imoveis(id) ON DELETE CASCADE,
    ano INTEGER NOT NULL,
    parcela INTEGER NOT NULL DEFAULT 1,
    total_parcelas INTEGER NOT NULL DEFAULT 1,
    valor_total NUMERIC(12, 2) NOT NULL,
    valor_parcela NUMERIC(12, 2) NOT NULL,
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    valor_pago NUMERIC(12, 2) DEFAULT 0.00,
    desconto NUMERIC(12, 2) DEFAULT 0.00,
    multa_juros NUMERIC(12, 2) DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado', 'isento', 'cancelado')),
    forma_pagamento TEXT,
    comprovante_url TEXT,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Garante que não haja duplicidade de parcela para o mesmo imóvel/ano
    UNIQUE (imovel_id, ano, parcela)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_iptu_imovel_id ON public.iptu(imovel_id);
CREATE INDEX IF NOT EXISTS idx_iptu_ano ON public.iptu(ano);
CREATE INDEX IF NOT EXISTS idx_iptu_status ON public.iptu(status);
CREATE INDEX IF NOT EXISTS idx_iptu_data_vencimento ON public.iptu(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_iptu_imovel_ano_parcela ON public.iptu(imovel_id, ano, parcela);

-- Habilitar RLS
ALTER TABLE public.iptu ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso Total para Autenticados
CREATE POLICY "Acesso Autenticado IPTU" ON public.iptu FOR ALL TO authenticated USING (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_iptu_updated_at
    BEFORE UPDATE ON public.iptu
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- View para facilitar consultas de IPTU com dados do imóvel
CREATE OR REPLACE VIEW public.v_iptu_completo AS
SELECT 
    i.*,
    im.codigo as imovel_codigo,
    im.logradouro,
    im.numero,
    im.bairro,
    im.cidade,
    im.uf,
    im.cep,
    p.nome as proprietario_nome,
    p.cpf_cnpj as proprietario_cpf_cnpj
FROM public.iptu i
JOIN public.imoveis im ON i.imovel_id = im.id
LEFT JOIN public.proprietarios p ON im.proprietario_id = p.id;

-- Função para gerar parcelas de IPTU automaticamente
CREATE OR REPLACE FUNCTION public.gerar_iptu_anual(
    p_imovel_id UUID,
    p_ano INTEGER,
    p_total_parcelas INTEGER DEFAULT 1,
    p_valor_total NUMERIC,
    p_data_primeiro_vencimento DATE
) RETURNS VOID AS $$
DECLARE
    v_valor_parcela NUMERIC;
    v_data_vencimento DATE;
    v_parcela INTEGER;
BEGIN
    -- Validações
    IF p_total_parcelas < 1 THEN
        RAISE EXCEPTION 'Total de parcelas deve ser maior que zero';
    END IF;
    
    IF p_valor_total <= 0 THEN
        RAISE EXCEPTION 'Valor total deve ser maior que zero';
    END IF;
    
    -- Calcula valor da parcela
    v_valor_parcela := ROUND(p_valor_total / p_total_parcelas, 2);
    
    -- Remove parcelas existentes para o mesmo imóvel/ano (se houver)
    DELETE FROM public.iptu 
    WHERE imovel_id = p_imovel_id AND ano = p_ano;
    
    -- Gera as parcelas
    FOR v_parcela IN 1..p_total_parcelas LOOP
        v_data_vencimento := p_data_primeiro_vencimento + (v_parcela - 1) * INTERVAL '1 month';
        
        INSERT INTO public.iptu (
            imovel_id,
            ano,
            parcela,
            total_parcelas,
            valor_total,
            valor_parcela,
            data_vencimento,
            status
        ) VALUES (
            p_imovel_id,
            p_ano,
            v_parcela,
            p_total_parcelas,
            p_valor_total,
            v_valor_parcela,
            v_data_vencimento,
            'pendente'
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Comentários
COMMENT ON TABLE public.iptu IS 'Controle de pagamentos de IPTU por imóvel';
COMMENT ON COLUMN public.iptu.ano IS 'Ano de referência do IPTU';
COMMENT ON COLUMN public.iptu.parcela IS 'Número da parcela (1 a total_parcelas)';
COMMENT ON COLUMN public.iptu.total_parcelas IS 'Total de parcelas do IPTU no ano';
COMMENT ON COLUMN public.iptu.valor_total IS 'Valor total do IPTU no ano';
COMMENT ON COLUMN public.iptu.valor_parcela IS 'Valor de cada parcela';
COMMENT ON COLUMN public.iptu.status IS 'Status: pendente, pago, atrasado, isento, cancelado';