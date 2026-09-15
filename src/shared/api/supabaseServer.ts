import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/shared/config/env";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Este try/catch é propositado. O método setAll pode ser chamado
            // a partir de um Server Component, o que daria erro ao tentar
            // escrever cookies. Mas o nosso ficheiro `proxy.ts` já tratou
            // de refrescar a sessão, por isso podemos ignorar aqui.
          }
        },
      },
    }
  );
}

