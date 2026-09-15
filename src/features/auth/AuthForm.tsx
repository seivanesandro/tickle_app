"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createClient } from "@/shared/api/supabaseBrowser";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const authSchema = z.object({
  email: z.string().email("Por favor, introduz um email válido."),
  password: z.string().min(6, "A password deve ter no mínimo 6 caracteres."),
});

type AuthFormValues = z.infer<typeof authSchema>;

export function AuthForm() {
  const router = useRouter();
  const supabase = createClient();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const {
    register,
    handleSubmit,
    getValues, // <--- Adicionado para podermos ler o email solto sem validar a password!
    formState: { errors },
  } = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: AuthFormValues) {
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

        if (error) {
          toast.error("Erro no login", {
            description: error.message,
          });
          return;
        }

        toast.success("Login com sucesso!");
        router.push("/chat");
      } else {
        // CORREÇÃO DO ERRO AQUI:
        // Antes estava 'const { data, error }' e estava a chocar com o 'data' da função onSubmit!
        // Mudei para 'authData' para não colidir as variáveis!
        const { data: authData, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/chat`,
          },
        });

        if (error) {
          toast.error("Erro ao registar", {
            description: error.message,
          });
          return;
        }

        if (authData.user?.identities?.length === 0) {
          toast.error("Erro ao registar", {
            description: "Este email já se encontra registado.",
          });
          return;
        }

        toast.success("Verifica o teu email!", {
          description: "Enviámos um link de confirmação. Tens de clicar nele para entrar na app.",
          duration: 8000,
        });
        
        setIsLogin(true); 
      }
    } catch {
      toast.error("Ocorreu um erro inesperado.");
    } finally {
      setIsLoading(false);
    }
  }

  // NOVA FUNÇÃO: Pedir recuperação de Password
  async function handleResetPassword() {
    const email = getValues("email");
    if (!email) {
      toast.error("Email em falta", {
        description: "Escreve o teu email na caixa acima primeiro, para sabermos para onde enviar o link de recuperação.",
      });
      return;
    }

    setIsResetting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // Quando clicarem no email de recuperação, vêm parar aqui
      redirectTo: `${window.location.origin}/update-password`,
    });
    setIsResetting(false);

    if (error) {
      toast.error("Erro ao recuperar", { description: error.message });
    } else {
      toast.success("Email enviado!", {
        description: "Vê a tua caixa de correio para redefinires a tua password.",
      });
    }
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-sm space-y-6 rounded-lg border bg-card p-6 shadow-sm">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          {isLogin ? "Bem-vindo de volta" : "Cria a tua conta"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isLogin
            ? "Introduz os teus dados para entrar no Tickle AI"
            : "Preenche os dados para começares a usar o assistente"}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="nome@exemplo.com"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            
            {/* NOVO: Botão de Esqueci-me da Password (só aparece no Login) */}
            {isLogin && (
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={isResetting}
                className="text-xs text-primary hover:underline disabled:opacity-50"
              >
                {isResetting ? "A enviar..." : "Esqueceste-te da password?"}
              </button>
            )}
          </div>

          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-sm text-red-500">{errors.password.message}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full font-bold"
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLogin ? "Entrar" : "Registar"}
        </Button>
      </form>

      <div className="text-center text-sm">
        <button
          type="button"
          onClick={() => setIsLogin(!isLogin)}
          className="text-primary hover:underline"
        >
          {isLogin
            ? "Não tens conta? Regista-te."
            : "Já tens conta? Faz login."}
        </button>
      </div>
    </div>
  );
}
