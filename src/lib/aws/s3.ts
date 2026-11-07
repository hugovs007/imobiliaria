import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const LIMITE_ARQUIVO_BYTES = 40 * 1024 * 1024; // 40MB
const TIPOS_PERMITIDOS = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

// Cliente S3 (singleton)
let s3Client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return s3Client;
}

const BUCKET = process.env.AWS_S3_BUCKET!;

export interface UploadResultado {
  url: string;           // URL presigned (1 hora)
  path: string;          // Key no bucket
  nomeArquivo: string;
  tamanho: number;
  tipoMime: string;
}

/**
 * Faz upload de arquivo para AWS S3
 * Retorna URL presigned válida por 1 hora (para visualização)
 */
export async function uploadParaS3(
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
  const key = `${pasta}/${entidadeId}/${timestamp}-${randomId}-${nomeSeguro}`;

  const client = getS3Client();
  const arrayBuffer = await arquivo.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: arquivo.type,
      Metadata: {
        originalName: arquivo.name,
        uploadedAt: new Date().toISOString(),
      },
    })
  );

  // URL presigned para visualização (1 hora) - usa GetObjectCommand
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const presignedUrl = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: 3600 }
  );

  return {
    url: presignedUrl,
    path: key,
    nomeArquivo: arquivo.name,
    tamanho: arquivo.size,
    tipoMime: arquivo.type,
  };
}

/**
 * Remove arquivo do S3
 */
export async function removerDoS3(key: string): Promise<void> {
  const client = getS3Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  ).catch(() => {}); // Ignora erro se não existir
}

/**
 * Remove múltiplos arquivos
 */
export async function removerMultiplosDoS3(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  
  const client = getS3Client();
  await client.send(
    new DeleteObjectsCommand({
      Bucket: BUCKET,
      Delete: {
        Objects: keys.map((k) => ({ Key: k })),
        Quiet: true,
      },
    })
  ).catch(() => {});
}