-- 0023: Comprovante em Movimentações de Pagamento
-- Adiciona campo para armazenar comprovante de pagamento parcial

ALTER TABLE public.movimentacoes_pagamento
ADD COLUMN IF NOT EXISTS comprovante_url TEXT;

COMMENT ON COLUMN public.movimentacoes_pagamento.comprovante_url IS 'URL do comprovante no Storage (path)';