/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';

const isServer = typeof window === "undefined";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("O URL do Supabase tem de ser um URL vǭlido"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "A chave Anon do Supabase Ǹ obrigatria"),
  SUPABASE_SERVICE_ROLE_KEY: isServer ? z.string().min(1, "A Service Role Key Ǹ obrigatria no servidor") : z.any().optional(),
  OPENROUTER_API_KEY: isServer ? z.string().min(1, "A chave da API do OpenRouter Ǹ obrigatria no servidor") : z.any().optional(),
});

const processEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ...(isServer && {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  }),
};

const parsedEnv = envSchema.safeParse(processEnv);

if (!parsedEnv.success) {
  console.error("❌ Erro fatal nas Variáveis de Ambiente:", parsedEnv.error.format());
}

export const env = parsedEnv.success ? parsedEnv.data : (processEnv as any);
