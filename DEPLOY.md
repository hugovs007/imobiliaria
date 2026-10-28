# Deploy Checklist

## ☐ Setup Supabase

- [ ] Criar conta em supabase.com
- [ ] Criar projeto (escolher "Free")
- [ ] Copiar Project URL (Settings → API)
- [ ] Copiar Anon Key (Settings → API)

## ☐ Rodar migrations (ORDEM IMPORTANTE)

Execute no SQL Editor do Supabase **em ordem** (todas idempotentes):

1. `supabase/migrations/0016_...` (schema base)
2. `supabase/migrations/0018_...` (ajustes)
3. `supabase/migrations/0019_...` (ajustes)
4. `supabase/migrations/0020_saas_multi_tenant.sql` (multi-tenant SaaS)

- [ ] Verificar se não houve erros
- [ ] Ir a Storage → Buckets e criar bucket `arquivos` (público)

## ☐ Criar `.env.local`

```bash
NEXT_PUBLIC_SUPABASE_URL=https://seu-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## ☐ Testar localmente

```bash
npm install
npm run dev
```

- [ ] Acessar http://localhost:3000/login
- [ ] Convidar primeiro usuário no Supabase Auth (Hugo: hugovinicius.27@gmail.com)
- [ ] Em Database → Profiles, marcar papel = 'super_admin', ativo = true
- [ ] Fazer login

## ☐ Configuração Multi-tenant (SaaS)

Após login como super_admin:

- [ ] Acessar **Sistema → Empresas** (/empresas)
- [ ] Clicar "Criar empresa" → preencher dados do locador (nome, CNPJ/CPF, cidade, UF, telefone, e-mail)
- [ ] Clicar "Criar administrador da empresa" → selecionar a empresa criada, preencher nome, e-mail, senha (mín. 6 chars)
- [ ] O admin da empresa recebe acesso e gerencia imóveis, inquilinos, contratos, etc. pelo painel
- [ ] Repetir para cada novo cliente (locador)

## ☐ Fazer push no GitHub

```bash
git init
git add .
git commit -m "Initial commit: rental management system"
git branch -M main
git remote add origin https://github.com/seu-usuario/sistema-alugueis.git
git push -u origin main
```

## ☐ Publicar na Vercel

- [ ] Ir a vercel.com/new
- [ ] Importar repositório
- [ ] Adicionar variáveis de ambiente (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
- [ ] Clicar Deploy
- [ ] Aguardar ~2-3 minutos

## ☐ Testar produção

- [ ] Acessar `seu-projeto.vercel.app/login`
- [ ] Fazer login com super_admin (Hugo)
- [ ] Testar criação de empresa + admin em Sistema → Empresas
- [ ] Testar login do admin da empresa e criar imóvel/contrato

## ✅ Pronto!

O sistema está disponível em `seu-projeto.vercel.app`.

## Arquitetura Multi-tenant (SaaS)

- **Single codebase, single database** — isolamento via RLS (Row Level Security)
- **Super-admin** (Hugo) cria empresas e administradores via `/empresas`
- **Admin da empresa** gerencia seus dados (imóveis, inquilinos, contratos, pagamentos, equipe)
- **Locador** = dados da empresa (white-label em contratos/recibos)
- **RLS policies** garantem que cada empresa só vê seus próprios dados
- **Contratos/Recibos** usam dados da empresa (nome, CPF/CNPJ, endereço, PIX, WhatsApp, cidade/UF)

## Troubleshooting

**Erro de autenticação**
- Verifique se as variáveis de ambiente estão corretas
- Verifique se o usuário foi criado no Supabase Auth

**Erro ao subir arquivo**
- Verifique se o bucket `arquivos` existe
- Verifique se é público (read)

**Dados de outra empresa aparecendo**
- Verifique se a migration 0020 foi aplicada
- Verifique se o usuário tem `empresa_id` preenchido em profiles
- Verifique se as policies RLS estão ativas nas tabelas

**Reajuste não aparece**
- Cadastre índices econômicos antes (página Índices)
- Verifique se o contrato está ativo

Ver `README.md` para documentação completa.
