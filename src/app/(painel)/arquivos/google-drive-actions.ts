"use server";

import { uploadToTenantFolder } from "@/lib/google-drive-folders";

export async function uploadToGoogleDrive(
  file: File,
  imovelEndereco: string,
  inquilinoNome: string,
  tipoDocumento: "contratos" | "recibos" | "documentos"
): Promise<string> {
  return uploadToTenantFolder(file, imovelEndereco, inquilinoNome, tipoDocumento);
}