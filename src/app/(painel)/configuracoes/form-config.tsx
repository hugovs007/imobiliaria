"use client";

import { useActionState } from "react";
import { Alert, Button, Card, Field, Input, Select } from "@/components/ui";
import { salvarConfigBB, testarConexaoBB, type ResultadoConfig } from "./actions";

const VAZIO: ResultadoConfig = { ok: false, message: "" };

export default function FormConfigBB({
  inicial,
  tabelaPronta,
}: {
  inicial: {
    ambiente: string;
    clientId: string;
    temSecret: boolean;
    convenio: string;
    carteira: string;
    variacao: string;
    modalidade: string;
  };
  tabelaPronta: boolean;
}) {
  const [estadoSalvar, salvarForm, salvando] = useActionState(salvarConfigBB, VAZIO);
  const [estadoTeste, testarForm, testando] = useActionState(testarConexaoBB, VAZIO);

  return (
    <div className="space-y-6">
      <Card>
        <form action={salvarForm} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Ambiente"
              name="ambiente"
              defaultValue={inicial.ambiente}
              options={[
                { value: "sandbox", label: "Homologação (sandbox) — para testar" },
                { value: "producao", label: "Produção — boletos reais" },
              ]}
            />
            <Field
              label="Client ID"
              name="client_id"
              defaultValue={inicial.clientId}
              placeholder="Gerado no portal de desenvolvedores do BB"
            />
            <Field
              label="Client Secret"
              name="client_secret"
              type="password"
              placeholder={inicial.temSecret ? "•••• preenchido — digite para alterar" : "Gerado no portal de desenvolvedores do BB"}
            />
            <Field
              label="Nº do convênio"
              name="convenio"
              defaultValue={inicial.convenio}
              placeholder="Fornecido pelo gerente do BB (7 dígitos)"
            />
            <Field label="Carteira" name="carteira" defaultValue={inicial.carteira} placeholder="Ex.: 17" />
            <Field
              label="Variação da carteira"
              name="variacao"
              defaultValue={inicial.variacao}
              placeholder="Ex.: 019"
            />
            <Field
              label="Modalidade"
              name="modalidade"
              defaultValue={inicial.modalidade}
              placeholder="Ex.: 1 (simples)"
            />
          </div>
          <Button type="submit" disabled={salvando || !tabelaPronta}>
            {salvando ? "Salvando..." : "Salvar configuração"}
          </Button>
        </form>
        {estadoSalvar.message && (
          <Alert variant={estadoSalvar.ok ? "default" : "destructive"} className="mt-4">
            {estadoSalvar.message}
          </Alert>
        )}
      </Card>

      <Card>
        <form action={testarForm} className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="ghost" disabled={testando || !tabelaPronta}>
            {testando ? "Testando..." : "Testar conexão"}
          </Button>
          <span className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
            Usa a configuração salva — salve antes de testar.
          </span>
        </form>
        {estadoTeste.message && (
          <Alert variant={estadoTeste.ok ? "default" : "destructive"} className="mt-4">
            {estadoTeste.message}
          </Alert>
        )}
      </Card>

      <Card>
        <div className="space-y-2 text-sm" style={{ color: "var(--color-ink-soft)" }}>
          <p className="font-medium" style={{ color: "var(--color-ink)" }}>
            Como obter as credenciais
          </p>
          <p>
            1. No portal de desenvolvedores do BB (devportal.bb.com.br), crie um aplicativo e assine a
            API de Boletos. O Client ID e o Client Secret aparecem na página do aplicativo.
          </p>
          <p>
            2. O número do convênio, carteira, variação e modalidade são fornecidos pelo gerente da
            conta do proprietário no Banco do Brasil.
          </p>
          <p>
            3. Comece no ambiente de homologação (sandbox) para validar a integração; troque para
            produção quando o convênio real estiver liberado.
          </p>
        </div>
      </Card>
    </div>
  );
}
