import { NextResponse } from "next/server";
import { createClient } from "@/shared/api/supabaseServer";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/login";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/login";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // No registo (next = /login), valida o email mas termina a sessão automática
      // para obrigar o utilizador a fazer login com email e password.
      if (next.startsWith("/login")) {
        await supabase.auth.signOut();
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  if (next.startsWith("/login")) {
    return NextResponse.redirect(`${origin}/login`);
  }

  // Se falhar ou não houver código, manda para o login com erro
  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
}
