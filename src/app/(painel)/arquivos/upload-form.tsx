"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { registrarArquivo } from "./actions";
import { uploadToGoogleDrive } from "./google-drive-actions";

const LIMITE_ARQUIVO_BYTES = 40 * 1024 * 1024;

type TipoDocumento = "contratos" | "recibos" | "documentos";

interface Imovel {
  id: string;
  codigo: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
}

interface Inquilino {
  id: string;
  nome: string;
}

export function UploadForm() {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [inquilinos, setInquilinos] = useState<Inquilino[]>([]);
  const [carregandoListas, setCarregandoListas] = useState(true);

  // Carregar imóveis e inquilinos ao montar o componente
  async function carregarListas() {
    try {
      const supabase = createClient();
      
      const [imoveisRes, inquilinosRes] = await Promise.all([
        supabase.from("imoveis").select("id, codigo, logradouro, numero, bairro, cidade, uf").order("codigo"),
        supabase.from("inquilinos").select("id, nome").order("nome"),
      ]);

      if (imoveisRes.data) setImoveis(imoveisRes.data);
      if (inquilinosRes.data) setInquilinos(inquilinosRes.data);
    } catch (e) {
      console.error("Erro ao carregar listas:", e);
    } finally {
      setCarregandoListas(false);
    }
  }

  // Formatar endereço completo do imóvel
  function formatarEnderecoImovel(imovel: Imovel): string {
    return [
      [imovel.logradouro, imovel.numero].filter(Boolean).join(", "),
      imovel.bairro,
      `${imovel.cidade}/${imovel.uf}`,
    ].filter(Boolean).join(" - ");
  }

  async function enviar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (enviando) return;

    const form = event.currentTarget;
    const dados = new FormData(form);
    const arquivo = dados.get("arquivo");
    const imovelId = String(dados.get("imovel_id") || "").trim();
    const inquilinoId = String(dados.get("inquilino_id") || "").trim();
    const tipoDocumento = String(dados.get("tipo_documento") || "") as TipoDocumento;

    setErro(null);
    setSucesso(false);

    if (!(arquivo instanceof File) || arquivo.size === 0) {
      setErro("Selecione um arquivo para enviar.");
      return;
    }
    if (arquivo.size > LIMITE_ARQUIVO_BYTES) {
      setErro("O arquivo excede o limite de 40 MB.");
      return;
    }
    if (!imovelId) {
      setErro("Selecione um imóvel.");
      return;
    }
    if (!inquilinoId) {
      setErro("Selecione um inquilino.");
      return;
    }
    if (!tipoDocumento) {
      setErro("Selecione o tipo de documento.");
      return;
    }

    const imovelSelecionado = imoveis.find(i => i.id === imovelId);
    const inquilinoSelecionado = inquilinos.find(i => i.id === inquilinoId);

    if (!imovelSelecionado || !inquilinoSelecionado) {
      setErro("Imóvel ou inquilino não encontrado.");
      return;
    }

    setEnviando(true);
    const supabase = createClient();
    const nomeSeguro = arquivo.name.replace(/[\\/]/g, "_");
    const caminho = `inquilino/${inquilinoId}/${crypto.randomUUID()}-${nomeSeguro}`;

    try {
      // 1. Upload para Supabase Storage (backup)
      const { error: erroUpload } = await supabase.storage.from("arquivos").upload(caminho, arquivo);
      if (erroUpload) throw new Error(erroUpload.message);

      // 2. Upload para Google Drive (estrutura organizada) - via Server Action
      let googleDriveUrl: string | null = null;
      try {
        const enderecoImovel = formatarEnderecoImovel(imovelSelecionado);
        googleDriveUrl = await uploadToGoogleDrive(
          arquivo,
          enderecoImovel,
          inquilinoSelecionado.nome,
          tipoDocumento
        );
      } catch (gdError) {
        console.warn("Falha ao enviar para Google Drive (continuando apenas com Supabase):", gdError);
      }

      // 3. Registrar metadados no banco
      const metadados = new FormData();
      metadados.set("entidade_tipo", "inquilino");
      metadados.set("entidade_id", inquilinoId);
      metadados.set("tipo_arquivo", tipoDocumento);
      metadados.set("nome", arquivo.name);
      metadados.set("path_ou_url", googleDriveUrl || caminho);
      metadados.set("tamanho_bytes", String(arquivo.size));

      try {
        await registrarArquivo(metadados);
      } catch (cause) {
        await supabase.storage.from("arquivos").remove([caminho]);
        throw cause;
      }

      form.reset();
      setSucesso(true);
    } catch (cause) {
      setErro(cause instanceof Error ? cause.message : "Não foi possível enviar o arquivo.");
    } finally {
      setEnviando(false);
    }
  }

  if (carregandoListas) {
    return (
      <div className="flex items-center justify-center py-8 text-sm" style={{ color: "var(--color-ink-soft)" }}>
        Carregando imóveis e inquilinos...
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm">
        <span style={{ color: "var(--color-ink-soft)" }}>Imóvel *</span>
        <select name="imovel_id" required disabled={carregandoListas} className="rounded-sm border bg-white/70 px-3 py-2" style={{ borderColor: "var(--color-line)" }}>
          <option value="">— selecione um imóvel —</option>
          {imoveis.map((i) => (
            <option key={i.id} value={i.id}>
              {i.codigo} - {formatarEnderecoImovel(i)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span style={{ color: "var(--color-ink-soft)" }}>Inquilino *</span>
        <select name="inquilino_id" required disabled={carregandoListas} className="rounded-sm border bg-white/70 px-3 py-2" style={{ borderColor: "var(--color-line)" }}>
          <option value="">— selecione um inquilino —</option>
          {inquilinos.map((i) => (
            <option key={i.id} value={i.id}>
              {i.nome}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span style={{ color: "var(--color-ink-soft)" }}>Tipo de documento *</span>
        <select name="tipo_documento" required className="rounded-sm border bg-white/70 px-3 py-2" style={{ borderColor: "var(--color-line)" }}>
          <option value="">— selecione —</option>
          <option value="contratos">Contratos</option>
          <option value="recibos">Recibos</option>
          <option value="documentos">Documentos</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span style={{ color: "var(--color-ink-soft)" }}>Arquivo *</span>
        <input name="arquivo" type="file" required className="text-sm" />
        <span className="mt-1 inline-flex w-fit items-center rounded-sm border px-2 py-1 text-xs" style={{ borderColor: "var(--color-line)", color: "var(--color-ink-soft)" }}>
          Limite: 40 MB por arquivo
        </span>
      </label>
      {(erro || sucesso) && (
        <p role={erro ? "alert" : "status"} className="text-sm sm:col-span-2" style={{ color: erro ? "var(--color-alert)" : "var(--color-ok)" }}>
          {erro ?? "Arquivo enviado com sucesso."}
        </p>
      )}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={enviando || carregandoListas}
          className="rounded-sm px-4 py-2 text-sm font-medium disabled:opacity-60"
          style={{ background: "var(--color-teal)", color: "var(--color-paper)" }}
        >
          {enviando ? "Enviando..." : "Enviar arquivo"}
        </button>
      </div>
    </form>
  );
}
