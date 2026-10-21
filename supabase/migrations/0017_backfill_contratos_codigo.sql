-- 0017_backfill_contratos_codigo.sql
--
-- Popula a coluna `codigo` dos contratos existentes que ainda não têm código,
-- usando o mesmo padrão gerado pelo app: CT-{ano}-{sequencial} (3 dígitos).
--
-- - Ano de referência: ano da data_inicio do contrato.
-- - Sequencial: respeita os códigos CT- já existentes no mesmo ano (pega o
--   maior sequencial daquele ano e continua a partir dele).
-- - Contratos ordenados por data_inicio (mais antigos recebem números menores).
--
-- Idempotente: contratos que já possuem codigo não são alterados.

WITH sem_codigo AS (
    SELECT
        id,
        data_inicio,
        created_at
    FROM public.contratos
    WHERE codigo IS NULL OR codigo = ''
),
max_existente AS (
    SELECT
        EXTRACT(YEAR FROM data_inicio) AS ano,
        COALESCE(
            MAX((SUBSTRING(codigo FROM 'CT-[0-9]{4}-([0-9]+)'))::int),
            0
        ) AS max_seq
    FROM public.contratos
    WHERE codigo LIKE 'CT-%'
    GROUP BY 1
),
seq_por_ano AS (
    SELECT
        id,
        data_inicio,
        ROW_NUMBER() OVER (
            PARTITION BY EXTRACT(YEAR FROM data_inicio)
            ORDER BY data_inicio, created_at, id
        ) AS seq
    FROM sem_codigo
)
UPDATE public.contratos c
SET codigo = 'CT-'
    || EXTRACT(YEAR FROM s.data_inicio)::text
    || '-'
    || LPAD((COALESCE(m.max_seq, 0) + s.seq)::text, 3, '0'),
    updated_at = NOW()
FROM seq_por_ano s
LEFT JOIN max_existente m
    ON m.ano = EXTRACT(YEAR FROM s.data_inicio)
WHERE c.id = s.id;
