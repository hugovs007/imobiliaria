"use client";

import { useActionState } from "react";
import { Button, Field, Select, TextArea } from "@/components/ui";
import { criarContrato } from "./actions";

interface FormCriarContratoProps {
  imoveisParaExibir: any[];
  listaInquilinos: any[];
}

export function FormCriarContrato({ imoveisParaExibir, listaInquilinos }: FormCriarContratoProps) {
  const [state, formAction, isPending] = useActionState(criarContrato, null);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {state?.error && (
        <div className="sm:col-span-2 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {state.error}
        </div>
      )}

      <Select
        label="Imóvel (disponíveis)"
        name="imovel_id"
        required
        options={[
          { value: "", label: "— selecione um imóvel —" },
          ...imoveisParaExibir.map((i) => {
            const rotuloEndereco = [
              i.codigo,
              i.logradouro || i.endereco,
              i.numero,
              i.cidade ? `${i.cidade}/${i.uf || i.estado}` : null,
            ]
              .filter(Boolean)
              .join(" - ");

            return {
              value: i.id,
              label: rotuloEndereco || `Imóvel ID: ${i.id.slice(0, 8)}`,
            };
          }),
        ]}
      />

      <Select
        label="Inquilino"
        name="inquilino_id"
        required
        options={[
          { value: "", label: "— selecione um inquilino —" },
          ...listaInquilinos.map((i) => ({ value: i.id, label: i.nome })),
        ]}
      />

      <Field label="Data de início" name="data_inicio" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
      <Field label="Data de fim (opcional)" name="data_fim" type="date" />
      <Field label="Dia de vencimento (1-31)" name="dia_vencimento" type="number" required placeholder="Ex: 10" />
      <Field label="Valor do aluguel (R$)" name="valor_aluguel" type="number" step="0.01" required />

      <Select
        label="Índice de reajuste"
        name="indice_reajuste"
        defaultValue="IGP-M"
        options={[
          { value: "IGP-M", label: "IGP-M" },
          { value: "IPCA", label: "IPCA" },
          { value: "Outro", label: "Outro (definir em cláusula)" },
        ]}
      />

      <Field label="Periodicidade do reajuste (meses)" name="periodicidade_reajuste_meses" type="number" defaultValue={12} />
      <Field label="Caução/depósito (R$)" name="valor_caucao" type="number" step="0.01" />

      {/* SEÇÃO: FIADOR 1 (OBRIGATÓRIO) */}
      <div className="sm:col-span-2 border-t pt-4 mt-2">
        <h3 className="font-semibold text-sm text-gray-900 mb-3">Fiador 1 (Obrigatório)</h3>
      </div>

      <Field label="Nome completo do Fiador 1" name="fiador_1_nome" required />
      <Field label="CPF do Fiador 1" name="fiador_1_cpf" required placeholder="000.000.000-00" />
      <Field label="Estado civil do Fiador 1" name="fiador_1_estado_civil" placeholder="Ex: casado, divorciado" />
      <Field label="Profissão do Fiador 1" name="fiador_1_profissao" placeholder="Ex: autônomo, empresário" />
      <Field label="Endereço completo do Fiador 1" name="fiador_1_endereco" required placeholder="Rua, nº, Bairro, Cidade - UF" />
      <Field label="Telefone / Contato do Fiador 1" name="fiador_1_telefone" placeholder="(83) 9.0000-0000" />

      {/* SEÇÃO: FIADOR 2 (OPCIONAL) */}
      <div className="sm:col-span-2 border-t pt-4 mt-2">
        <h3 className="font-semibold text-sm text-gray-900 mb-3">Fiador 2 (Opcional)</h3>
      </div>

      <Field label="Nome completo do Fiador 2" name="fiador_2_nome" />
      <Field label="CPF do Fiador 2" name="fiador_2_cpf" placeholder="000.000.000-00" />
      <Field label="Estado civil do Fiador 2" name="fiador_2_estado_civil" placeholder="Ex: solteiro, casado" />
      <Field label="Profissão do Fiador 2" name="fiador_2_profissao" placeholder="Ex: autônomo" />
      <Field label="Endereço completo do Fiador 2" name="fiador_2_endereco" placeholder="Rua, nº, Bairro, Cidade - UF" />
      <Field label="Telefone / Contato do Fiador 2" name="fiador_2_telefone" placeholder="(83) 9.0000-0000" />

      <div className="sm:col-span-2">
        <TextArea label="Cláusulas especiais" name="clausulas_especiais" />
      </div>

      <div className="sm:col-span-2">
        <Button type="submit">
          {isPending ? "Cadastrando..." : "Cadastrar contrato"}
        </Button>
      </div>
    </form>
  );
}