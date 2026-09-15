import { z } from 'zod';

const isServer = typeof window === "undefined";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("O URL do Supabase tem de ser um URL válido"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "A chave Anon do Supabase é obrigatória"),
  // As chaves secretas SÓ são exigidas e validadas se estivermos no Servidor
  SUPABASE_SERVICE_ROLE_KEY: isServer 
    ? z.string().min(1, "A Service Role Key do Supabase é obrigatória no servidor") 
    : z.any().optional(),
  GROQ_API_KEY: isServer 
    ? z.string().min(1, "A chave da API da Groq é obrigatória no servidor") 
    : z.any().optional(),
});

const processEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  // Apenas ler estas variáveis do process.env no servidor (o Next.js bloqueia-as no browser)
  ...(isServer && {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
  }),
};

const parsedEnv = envSchema.safeParse(processEnv);

if (!parsedEnv.success) {
  console.error("❌ Erro fatal nas Variáveis de Ambiente:", parsedEnv.error.format());
}

export const env = parsedEnv.success ? parsedEnv.data : (processEnv as any);
