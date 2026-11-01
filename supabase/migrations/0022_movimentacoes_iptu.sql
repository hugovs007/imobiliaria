-- 0022: Movimentações de IPTU (Histórico de pagamentos/recebimentos)
-- Adiciona tabela para controle de movimentações financeiras do IPTU

-- Tabela de Movimentações de IPTU
CREATE TABLE IF NOT EXISTS public.movimentacoes_iptu (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    iptu_id UUID NOT NULL REFERENCES public.iptu(id) ON DELETE CASCADE,
    data_pagamento DATE NOT NULL,
    valor_pago NUMERIC(12, 2) NOT NULL,
    forma_pagamento TEXT,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_movimentacoes_iptu_iptu_id ON public.movimentacoes_iptu(iptu_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_iptu_data_pagamento ON public.movimentacoes_iptu(data_pagamento);

-- Habilitar RLS
ALTER TABLE public.movimentacoes_iptu ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso Total para Autenticados
CREATE POLICY "Acesso Autenticado Movimentacoes IPTU" ON public.movimentacoes_iptu FOR ALL TO authenticated USING (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_movimentacoes_iptu_updated_at
    BEFORE UPDATE ON public.movimentacoes_iptu
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE public.movimentacoes_iptu IS 'Histórico de pagamentos/recebimentos de IPTU';
COMMENT ON COLUMN public.movimentacoes_iptu.iptu_id IS 'Referência ao IPTU';
COMMENT ON COLUMN public.movimentacoes_iptu.data_pagamento IS 'Data do pagamento/recebimento';
COMMENT ON COLUMN public.movimentacoes_iptu.valor_pago IS 'Valor pago na movimentação';
COMMENT ON COLUMN public.movimentacoes_iptu.forma_pagamento IS 'Forma de pagamento (PIX, Dinheiro, Cartão, etc.)';
COMMENT ON COLUMN public.movimentacoes_iptu.observacoes IS 'Observações sobre a movimentação';