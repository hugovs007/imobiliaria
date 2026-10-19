-- 0016: Documento de identificação (RG ou CNH) dos inquilinos
-- O cadastro passa a exigir o tipo e o número do documento de identificação.

ALTER TABLE inquilinos
  ADD COLUMN IF NOT EXISTS tipo_documento TEXT,
  ADD COLUMN IF NOT EXISTS numero_documento TEXT;

-- Migra dados existentes da coluna rg (quando presente) para o novo modelo.
UPDATE inquilinos
   SET tipo_documento = 'RG',
       numero_documento = rg
 WHERE rg IS NOT NULL
   AND btrim(rg) <> ''
   AND tipo_documento IS NULL
   AND numero_documento IS NULL;

-- Restringe o tipo de documento aos valores aceitos pelo sistema.
ALTER TABLE inquilinos DROP CONSTRAINT IF EXISTS inquilinos_tipo_documento_check;

ALTER TABLE inquilinos
  ADD CONSTRAINT inquilinos_tipo_documento_check
  CHECK (tipo_documento IS NULL OR tipo_documento IN ('RG', 'CNH'));
