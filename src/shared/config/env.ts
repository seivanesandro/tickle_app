import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .url("O URL do Supabase tem de ser um URL válido"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "A chave Anon do Supabase é obrigatória"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "A Service Role Key do Supabase é obrigatória"),
  GROQ_API_KEY: z
    .string()
    .min(1, "A chave da API da Groq é obrigatória"),
});

// Em Next.js, temos de ser explícitos ao ler variáveis NEXT_PUBLIC_ para o lado do cliente
const processEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
};

const parsedEnv = envSchema.safeParse(processEnv);

if (!parsedEnv.success) {
  console.error("❌ Erro fatal nas Variáveis de Ambiente:", parsedEnv.error.format());
  throw new Error("As variáveis de ambiente estão em falta ou inválidas. Verifica o ficheiro .env.local.");
}

export const env = parsedEnv.data;

