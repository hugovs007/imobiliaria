-- Importação em lote de imóveis da planilha
-- Proprietários: PAULO SERGIO DE SOUZA TORRES e ESPÓLIO DE PEDRO TORRES DE MEDEIROS
--
-- REQUISITO: executar 0015_align_schema_to_app.sql ANTES deste script:
--   • proprietarios.cpf_cnpj precisa aceitar NULL (Espólio não tem CPF)
--   • imoveis.status/finalidade precisam ser TEXT ('Alugado'/'Disponível'/'Residencial'/'Comercial')
-- Idempotente: pode ser re-executado (guardas por nome do proprietário e por código do imóvel).

-- Criar proprietário PAULO SERGIO se não existir
insert into public.proprietarios (nome, cpf_cnpj, telefone, email, observacoes)
select 'PAULO SERGIO DE SOUZA TORRES', null, null, null, null
where not exists (
  select 1 from public.proprietarios where nome = 'PAULO SERGIO DE SOUZA TORRES'
);

-- Criar proprietário ESPÓLIO se não existir
insert into public.proprietarios (nome, cpf_cnpj, telefone, email, observacoes)
select 'ESPÓLIO DE PEDRO TORRES DE MEDEIROS', null, null, null, 'Espólio'
where not exists (
  select 1 from public.proprietarios where nome = 'ESPÓLIO DE PEDRO TORRES DE MEDEIROS'
);

-- Inserir imóveis PSS (proprietário: PAULO SERGIO DE SOUZA TORRES)
with proprietario_pss as (
  select id from public.proprietarios where nome = 'PAULO SERGIO DE SOUZA TORRES' limit 1
)
insert into public.imoveis (
  codigo, proprietario_id, tipo, finalidade, status, cep, logradouro, numero, complemento,
  bairro, cidade, uf, valor_aluguel, observacoes
)
select * from (values
  ('PSS-007', (select id from proprietario_pss), 'apartamento', 'Residencial', 'Alugado', '58600000', 'RUA BONIFACIO NÓBREGA', '857 - TERREO', null, 'CENTRO', 'SANTA LUZIA', 'PB', 800.00, 'DUVALE'),
  ('PSS-008', (select id from proprietario_pss), 'apartamento', 'Residencial', 'Alugado', '58600000', 'RUA BONIFACIO NOBREGA', '857- 1 ANDAR', null, 'CENTRO', 'SANTA LUZIA', 'PB', 800.00, null),
  ('PSS-009', (select id from proprietario_pss), 'apartamento', 'Residencial', 'Alugado', '58600000', 'AV JOSÉ AMERICO', '492', null, 'CENTRO', 'SANTA LUZIA', 'PB', 800.00, null),
  ('PSS-010', (select id from proprietario_pss), 'comercial', 'Comercial', 'Alugado', '58600000', 'AV JOSÉ AMERICO', '65', null, 'CENTRO', 'SANTA LUZIA', 'PB', 800.00, 'CACAU SHOW'),
  ('PSS-011', (select id from proprietario_pss), 'apartamento', 'Residencial', 'Alugado', '58600000', 'AV JOSÉ AMERICO', 'S/N', null, 'CENTRO', 'SANTA LUZIA', 'PB', 800.00, null),
  ('PSS-012', (select id from proprietario_pss), 'casa', 'Residencial', 'Alugado', '58600000', 'AV JOSÉ AMERICO', '28', null, 'CENTRO', 'SANTA LUZIA', 'PB', 800.00, 'CASA VERDE'),
  ('PSS-013', (select id from proprietario_pss), 'rural', 'Residencial', 'Alugado', '58600000', 'SITIO SÃO MIGUEL, B. SÃO SEBASTIÃO', 'S/N', null, 'ZONA RURAL', 'SANTA LUZIA', 'PB', 800.00, null),
  ('PSS-014', (select id from proprietario_pss), 'rural', 'Residencial', 'Alugado', '58600000', 'SITIO TORRELANDIA', 'S/N', null, 'ZONA RURAL', 'SANTA LUZIA', 'PB', 800.00, 'CACHAÇA BAÍTA'),
  ('PSS-015', (select id from proprietario_pss), 'casa', 'Residencial', 'Alugado', '58600000', 'TRAV. BONIFÁCIO NÓBREGA', '57', null, 'CENTRO', 'SANTA LUZIA', 'PB', 800.00, null),
  ('PSS-016', (select id from proprietario_pss), 'casa', 'Residencial', 'Alugado', '58600000', 'RUA ZEZÉ MEDEIROS', '187', null, 'SÃO JOSÉ', 'SANTA LUZIA', 'PB', 800.00, null),
  ('PSS-017', (select id from proprietario_pss), 'apartamento', 'Residencial', 'Alugado', '58600000', 'RUA AMELIA AUGUSTA', '899', null, 'N S DE FÁTIMA', 'SANTA LUZIA', 'PB', 800.00, null),
  ('PSS-018', (select id from proprietario_pss), 'apartamento', 'Residencial', 'Alugado', '58600000', 'RUA AMELIA AUGUSTA', 'S/N', null, 'N S DE FÁTIMA', 'SANTA LUZIA', 'PB', 800.00, 'LANCHONETE'),
  ('PSS-019', (select id from proprietario_pss), 'apartamento', 'Residencial', 'Alugado', '58600000', 'RUA PEDRO HONORATO', '46', null, 'CENTRO', 'SANTA LUZIA', 'PB', 800.00, null),
  ('PSS-020', (select id from proprietario_pss), 'apartamento', 'Residencial', 'Alugado', '58600000', 'RUA ANTONIO MOISES', '59', null, 'SÃO JOSÉ', 'SANTA LUZIA', 'PB', 800.00, null),
  ('PSS-021', (select id from proprietario_pss), 'apartamento', 'Residencial', 'Disponível', '58600000', 'AV. JOSÉ AMÉRICO', 'S/N', null, 'CENTRO', 'SANTA LUZIA', 'PB', 800.00, 'EM CONSTRUÇÃO'),
  ('PSS-022', (select id from proprietario_pss), 'apartamento', 'Residencial', 'Alugado', '58600000', 'RUA PRESID. CASTELO BRANCO', '209', null, 'FREI DAMIAO', 'SANTA LUZIA', 'PB', 800.00, null),
  ('PSS-023', (select id from proprietario_pss), 'apartamento', 'Residencial', 'Alugado', '58600000', 'RUA JOAQUIM BENÍCIO', '79', null, 'SÃO JOSÉ', 'SANTA LUZIA', 'PB', 800.00, null),
  ('PSS-024', (select id from proprietario_pss), 'apartamento', 'Residencial', 'Disponível', '58600000', 'AV. JOSÉ AMERICO', '241', null, 'CENTRO', 'SANTA LUZIA', 'PB', 800.00, null),
  ('PSS-025', (select id from proprietario_pss), 'apartamento', 'Residencial', 'Alugado', '58600000', 'RUA BARTOLOMEU DE MEDEIROS', '84 TERREO 1', null, 'CENTRO', 'SANTA LUZIA', 'PB', 800.00, null),
  ('PSS-026', (select id from proprietario_pss), 'apartamento', 'Residencial', 'Alugado', '58600000', 'RUA BARTOLOMEU DE MEDEIROS', '84 TERREO 2', null, 'CENTRO', 'SANTA LUZIA', 'PB', 800.00, null),
  ('PSS-027', (select id from proprietario_pss), 'apartamento', 'Residencial', 'Alugado', '58600000', 'RUA BARTOLOMEU DE MEDEIROS', '84 1° ANDAR', null, 'CENTRO', 'SANTA LUZIA', 'PB', 800.00, null)
) as t(codigo, proprietario_id, tipo, finalidade, status, cep, logradouro, numero, complemento, bairro, cidade, uf, valor_aluguel, observacoes)
where not exists (select 1 from public.imoveis where codigo = t.codigo);

-- Inserir imóveis ESP (proprietário: ESPÓLIO DE PEDRO TORRES DE MEDEIROS)
with proprietario_esp as (
  select id from public.proprietarios where nome = 'ESPÓLIO DE PEDRO TORRES DE MEDEIROS' limit 1
)
insert into public.imoveis (
  codigo, proprietario_id, tipo, finalidade, status, cep, logradouro, numero, complemento,
  bairro, cidade, uf, valor_aluguel, observacoes
)
select * from (values
  ('ESP-001', (select id from proprietario_esp), 'apartamento', 'Residencial', 'Alugado', '58600000', 'Ezequiel Fernandes', '02 TERREO', null, 'CENTRO', 'SANTA LUZIA', 'PB', 800.00, null),
  ('ESP-002', (select id from proprietario_esp), 'apartamento', 'Residencial', 'Alugado', '58600000', 'Ezequiel Fernandes', '02 1° ANDAR', null, 'CENTRO', 'SANTA LUZIA', 'PB', 800.00, null),
  ('ESP-003', (select id from proprietario_esp), 'apartamento', 'Residencial', 'Alugado', '58600000', 'Ezequiel Fernandes', '02 2°ANDAR', null, 'CENTRO', 'SANTA LUZIA', 'PB', 800.00, null),
  ('ESP-004', (select id from proprietario_esp), 'apartamento', 'Residencial', 'Alugado', '58600000', 'Rua Isidoro Ortins, 29', '29', null, 'CENTRO', 'SANTA LUZIA', 'PB', 800.00, null),
  ('ESP-005', (select id from proprietario_esp), 'comercial', 'Comercial', 'Alugado', '58600000', 'Praça Alcindo leite', '16', null, 'CENTRO', 'SANTA LUZIA', 'PB', 800.00, null),
  ('ESP-006', (select id from proprietario_esp), 'apartamento', 'Residencial', 'Alugado', '58600000', 'Rua Teodolo Fernandes', '158', null, 'CENTRO', 'SANTA LUZIA', 'PB', 800.00, null),
  ('ESP-007', (select id from proprietario_esp), 'apartamento', 'Residencial', 'Alugado', '58600000', 'Rua Bonifácio Nóbrega, 805', '805 TERREO', null, 'CENTRO', 'SANTA LUZIA', 'PB', 800.00, null),
  ('ESP-008', (select id from proprietario_esp), 'apartamento', 'Residencial', 'Alugado', '58600000', 'Rua Bonifácio Nóbrega, 805', '805 1° ANDAR', null, 'CENTRO', 'SANTA LUZIA', 'PB', 800.00, null),
  ('ESP-009', (select id from proprietario_esp), 'comercial', 'Comercial', 'Alugado', '58600000', 'Rua Bonifácio Nóbrega, 811', '805', null, 'CENTRO', 'SANTA LUZIA', 'PB', 800.00, null),
  ('ESP-010', (select id from proprietario_esp), 'apartamento', 'Residencial', 'Alugado', '58600000', 'Rua José Jaime', '53', null, 'CENTRO', 'SANTA LUZIA', 'PB', 800.00, null),
  ('ESP-011', (select id from proprietario_esp), 'apartamento', 'Residencial', 'Alugado', '58600000', 'Rua José Jaime', '57', null, 'CENTRO', 'SANTA LUZIA', 'PB', 800.00, null)
) as t(codigo, proprietario_id, tipo, finalidade, status, cep, logradouro, numero, complemento, bairro, cidade, uf, valor_aluguel, observacoes)
where not exists (select 1 from public.imoveis where codigo = t.codigo);
