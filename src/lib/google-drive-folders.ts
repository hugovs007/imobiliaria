"use server";

import { google } from "googleapis";
import { Readable } from "stream";

/**
 * Google Drive folder structure service
 * Creates folders: Root / Imóvel - {endereco} / Inquilino - {nome} / {tipo_documento}
 */

interface GoogleDriveConfig {
  serviceAccountEmail: string;
  privateKey: string;
  rootFolderId: string;
}

function getDriveClient() {
  const config: GoogleDriveConfig = {
    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
    privateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    rootFolderId: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!,
  };

  const auth = new google.auth.JWT({
    email: config.serviceAccountEmail,
    key: config.privateKey,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  return google.drive({ version: "v3", auth });
}

function sanitizeFolderName(name: string): string {
  // Remove caracteres inválidos para nomes de pasta no Google Drive
  return name
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

async function obterOuCriarPasta(
  drive: ReturnType<typeof google.drive>,
  nome: string,
  parentId: string
): Promise<string> {
  const nomeSanitizado = sanitizeFolderName(nome);
  
  const busca = await drive.files.list({
    q: `name = '${nomeSanitizado.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id, name)",
  });

  if (busca.data.files && busca.data.files.length > 0) {
    return busca.data.files[0].id!;
  }

  const nova = await drive.files.create({
    requestBody: { 
      name: nomeSanitizado, 
      mimeType: "application/vnd.google-apps.folder", 
      parents: [parentId] 
    },
    fields: "id",
  });

  return nova.data.id!;
}

/**
 * Cria a estrutura de pastas: Root / Imóvel - {endereco} / Inquilino - {nome} / {tipo}
 * Retorna o ID da pasta final onde o arquivo deve ser salvo
 */
export async function getOrCreateTenantFolder(
  imovelEndereco: string,
  inquilinoNome: string,
  tipoDocumento: "contratos" | "recibos" | "documentos"
): Promise<string> {
  const drive = getDriveClient();
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!;

  // Nível 1: Pasta do Imóvel
  const imovelFolderName = `Imóvel - ${sanitizeFolderName(imovelEndereco)}`;
  const imovelFolderId = await obterOuCriarPasta(drive, imovelFolderName, rootFolderId);

  // Nível 2: Pasta do Inquilino
  const inquilinoFolderName = `Inquilino - ${sanitizeFolderName(inquilinoNome)}`;
  const inquilinoFolderId = await obterOuCriarPasta(drive, inquilinoFolderName, imovelFolderId);

  // Nível 3: Pasta do tipo de documento
  const tipoFolderName = tipoDocumento.charAt(0).toUpperCase() + tipoDocumento.slice(1); // Contratos, Recibos, Documentos
  const tipoFolderId = await obterOuCriarPasta(drive, tipoFolderName, inquilinoFolderId);

  return tipoFolderId;
}

/**
 * Envia um arquivo para a pasta do inquilino no Google Drive
 */
export async function uploadToTenantFolder(
  file: File,
  imovelEndereco: string,
  inquilinoNome: string,
  tipoDocumento: "contratos" | "recibos" | "documentos"
): Promise<string> {
  const drive = getDriveClient();
  
  const folderId = await getOrCreateTenantFolder(imovelEndereco, inquilinoNome, tipoDocumento);
  
  const buffer = Buffer.from(await file.arrayBuffer());
  const nomeSeguro = file.name.replace(/[\\/]/g, "_");
  
  const res = await drive.files.create({
    requestBody: { name: nomeSeguro, parents: [folderId] },
    media: { mimeType: file.type || "application/octet-stream", body: Readable.from(buffer) },
    fields: "id, webViewLink",
  });

  return res.data.webViewLink ?? `https://drive.google.com/file/d/${res.data.id}/view`;
}

/**
 * Lista arquivos na pasta do inquilino
 */
export async function listTenantFiles(
  imovelEndereco: string,
  inquilinoNome: string,
  tipoDocumento: "contratos" | "recibos" | "documentos"
): Promise<Array<{ id: string; name: string; webViewLink: string; createdTime: string }>> {
  const drive = getDriveClient();
  
  const folderId = await getOrCreateTenantFolder(imovelEndereco, inquilinoNome, tipoDocumento);
  
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id, name, webViewLink, createdTime)",
    orderBy: "createdTime desc",
  });

  return res.data.files?.map(f => ({
    id: f.id!,
    name: f.name!,
    webViewLink: f.webViewLink!,
    createdTime: f.createdTime!,
  })) || [];
}

/**
 * Cria a pasta do imóvel na estrutura: Root / Imóvel - {endereco}
 * Retorna o ID da pasta do imóvel
 */
export async function createPropertyFolder(imovelEndereco: string): Promise<string> {
  const drive = getDriveClient();
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!;

  const imovelFolderName = `Imóvel - ${sanitizeFolderName(imovelEndereco)}`;
  const imovelFolderId = await obterOuCriarPasta(drive, imovelFolderName, rootFolderId);

  return imovelFolderId;
}

/**
 * Cria a estrutura completa de pastas do inquilino dentro do imóvel:
 * Root / Imóvel - {endereco} / Inquilino - {nome} / Contratos, Recibos, Documentos
 * Retorna o ID da pasta do inquilino
 */
export async function createTenantFolderStructure(
  imovelEndereco: string,
  inquilinoNome: string
): Promise<string> {
  const drive = getDriveClient();
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!;

  // Nível 1: Pasta do Imóvel
  const imovelFolderName = `Imóvel - ${sanitizeFolderName(imovelEndereco)}`;
  const imovelFolderId = await obterOuCriarPasta(drive, imovelFolderName, rootFolderId);

  // Nível 2: Pasta do Inquilino
  const inquilinoFolderName = `Inquilino - ${sanitizeFolderName(inquilinoNome)}`;
  const inquilinoFolderId = await obterOuCriarPasta(drive, inquilinoFolderName, imovelFolderId);

  // Nível 3: Subpastas do tipo de documento
  const subpastas = ["Contratos", "Recibos", "Documentos"];
  for (const subpasta of subpastas) {
    await obterOuCriarPasta(drive, subpasta, inquilinoFolderId);
  }

  return inquilinoFolderId;
}