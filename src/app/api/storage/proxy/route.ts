import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const path = searchParams.get("path");

  if (!path) {
    return new NextResponse("Path não informado", { status: 400 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase.storage.from("arquivos").createSignedUrl(path, 60 * 60); // 1 hora

  if (error || !data?.signedUrl) {
    return new NextResponse("Arquivo não encontrado", { status: 404 });
  }

  return NextResponse.redirect(data.signedUrl);
}