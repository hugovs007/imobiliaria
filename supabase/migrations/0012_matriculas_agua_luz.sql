-- 0012: Matrículas das companhias de água e energia por imóvel
-- Permite cadastrar, no imóvel, os números de matrícula das companhias
-- de água e de energia, exibidos ao registrar contas de consumo (água/energia).
ALTER TABLE public.imoveis ADD COLUMN IF NOT EXISTS matricula_agua text;
ALTER TABLE public.imoveis ADD COLUMN IF NOT EXISTS matricula_luz text;
