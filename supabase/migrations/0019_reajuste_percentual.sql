-- =====================================================================
-- 0019_reajuste_percentual.sql
-- Corrige o cálculo de reajuste de aluguel.
--
-- PROBLEMA: indices_economicos.variacao_12m armazena PERCENTUAL
-- (ex.: 4.52 = 4,52% ao ano), mas a RPC gerar_reajustes_pendentes()
-- usava o valor diretamente como fator, gerando um reajuste de ~452%
-- (aluguel multiplicado por ~5,5x) assim que um índice fosse cadastrado.
--
-- CORREÇÃO: a partir de agora reajustes.taxa_aplicada armazena FRAÇÃO
-- (0.0452 = 4,52%), seguindo a mesma convenção do domínio
-- (ReajusteStrategy / taxaAplicada). A RPC aplicar_reajuste() já usava
-- a fração diretamente e não precisa de alteração.
--
-- Rede de segurança: normaliza eventuais reajustes pendentes gerados
-- com o bug (taxa > 1 só pode ser percentual mal armazenado).
-- Idempotente: CREATE OR REPLACE. EXECUTAR MANUALMENTE NO SQL EDITOR.
-- =====================================================================

-- ===== 1. Normaliza reajustes pendentes gerados com o bug =====
-- (taxa_aplicada > 1 = percentual gravado como se fosse fração;
--  valor_novo é recalculado a partir de valor_anterior com a fração correta)
UPDATE public.reajustes
SET taxa_aplicada = taxa_aplicada / 100,
    valor_novo    = ROUND(valor_anterior * (1 + taxa_aplicada / 100), 2)
WHERE status = 'pendente' AND taxa_aplicada > 1;

-- ===== 2. RPC corrigida: divide o percentual por 100 =====
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

-- aplicar_reajuste() permanece inalterada: já interpreta taxa_aplicada
-- como fração (valor_anterior * (1 + taxa_aplicada)).
