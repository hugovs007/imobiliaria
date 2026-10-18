import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Se as variáveis não estiverem configuradas, permite acesso à página de login
    // para que o usuário possa ver a mensagem de erro
    const isLoginPage = request.nextUrl.pathname.startsWith("/login");
    if (!isLoginPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname.startsWith("/login");
  const isRecuperarSenha = pathname.startsWith("/recuperar-senha");
  const isRedefinirSenha = pathname.startsWith("/redefinir-senha");

  // Portal do Inquilino: o inquilino NÃO é usuário Supabase — usa sessão
  // própria (cookie assinado). Apenas a página de login do portal é pública;
  // as sub-rotas exigem o cookie de sessão.
  const isPortalRoute = pathname.startsWith("/portal");
  if (isPortalRoute) {
    const isPortalLogin = pathname === "/portal" || pathname === "/portal/";
    if (!isPortalLogin && !request.cookies.get("portal_session")?.value) {
      const url = request.nextUrl.clone();
      url.pathname = "/portal";
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }

  const isPublicPage = isLoginPage || isRecuperarSenha || isRedefinirSenha;

  if (!user && !isPublicPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
