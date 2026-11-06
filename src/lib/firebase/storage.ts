import { firebaseStorage } from "./admin";

const LIMITE_ARQUIVO_BYTES = 40 * 1024 * 1024; // 40MB
const TIPOS_PERMITIDOS = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

export interface UploadResultado {
  url: string;           // URL pública (download token)
  path: string;          // Path no bucket (para referência)
  nomeArquivo: string;
  tamanho: number;
  tipoMime: string;
}

/**
 * Faz upload de arquivo para Firebase Storage
 * Retorna URL pública com download token (não expira)
 */
export async function uploadParaFirebaseStorage(
  pasta: string,
  entidadeId: string,
  arquivo: File
): Promise<UploadResultado> {
  if (!arquivo || arquivo.size === 0) {
    throw new Error("Arquivo vazio");
  }

  if (arquivo.size > LIMITE_ARQUIVO_BYTES) {
    throw new Error("O arquivo excede o limite de 40 MB.");
  }

  if (!TIPOS_PERMITIDOS.includes(arquivo.type)) {
    throw new Error("Tipo de arquivo não permitido. Use PDF, JPG, PNG ou WebP.");
  }

  const nomeSeguro = arquivo.name.replace(/[\\/]/g, "_");
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 10);
  const path = `${pasta}/${entidadeId}/${timestamp}-${randomId}-${nomeSeguro}`;

  const bucket = firebaseStorage.bucket();
  const file = bucket.file(path);

  // Converte File para Buffer
  const arrayBuffer = await arquivo.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload
  await file.save(buffer, {
    metadata: {
      contentType: arquivo.type,
      metadata: {
        originalName: arquivo.name,
        uploadedAt: new Date().toISOString(),
      },
    },
    resumable: false,
  });

  // Torna público e pega URL de download
  await file.makePublic();
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${encodeURIComponent(path)}`;

  return {
    url: publicUrl,
    path,
    nomeArquivo: arquivo.name,
    tamanho: arquivo.size,
    tipoMime: arquivo.type,
  };
}

/**
 * Remove arquivo do Firebase Storage
 */
export async function removerDoFirebaseStorage(path: string): Promise<void> {
  const bucket = firebaseStorage.bucket();
  const file = bucket.file(path);
  await file.delete().catch(() => {}); // Ignora erro se não existir
}

/**
 * Remove múltiplos arquivos
 */
export async function removerMultiplosDoFirebaseStorage(paths: string[]): Promise<void> {
  await Promise.all(paths.map((p) => removerDoFirebaseStorage(p)));
}