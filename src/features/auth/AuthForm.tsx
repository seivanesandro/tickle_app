"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createClient } from "@/shared/api/supabaseBrowser";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const authSchema = z.object({
  email: z.string().email("Please enter a valid email."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  confirmPassword: z.string().optional(),
});

type AuthFormValues = z.infer<typeof authSchema>;

export function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
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
          toast.error("Login error", {
            description: error.message,
          });
          return;
        }

        toast.success("Successfully logged in!");
        router.push("/chat");
      } else {
        if (!data.confirmPassword || data.confirmPassword.length < 6) {
          setError("confirmPassword", {
            message: "Please confirm your password (min. 6 characters).",
          });
          return;
        }

        if (data.password !== data.confirmPassword) {
          setError("confirmPassword", {
            message: "Passwords do not match.",
          });
          return;
        }

        const { data: authData, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
          },
        });

        if (error) {
          toast.error("Registration error", {
            description: error.message,
          });
          return;
        }

        if (authData.user?.identities?.length === 0) {
          toast.error("Registration error", {
            description: "This email is already registered.",
          });
          return;
        }

        // Garantir que não fica nenhuma sessão ativa antes do login manual
        if (authData.session) {
          await supabase.auth.signOut();
        }

        // Limpar os campos de password e redirecionar imediatamente para a vista de Login
        setValue("password", "");
        setValue("confirmPassword", "");
        clearErrors();
        setIsLogin(true);

        toast.success("Check your email!", {
          description: "We sent a confirmation link. Confirm your email and then log in.",
          duration: 8000,
        });
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResetPassword() {
    const email = getValues("email");
    if (!email) {
      toast.error("Missing email", {
        description: "Please enter your email above so we know where to send the reset link.",
      });
      return;
    }

    setIsResetting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/api/auth/callback?next=/update-password`,
    });
    setIsResetting(false);

    if (error) {
      toast.error("Recovery error", { description: error.message });
    } else {
      toast.success("Email sent!", {
        description: "Check your inbox to reset your password.",
      });
    }
  }

  return (
    <div className="w-full max-w-sm p-6 space-y-6 bg-card border rounded-xl shadow-lg">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          {isLogin ? "Welcome to Tickle AI" : "Create an account"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isLogin
            ? "Enter your details to log into Tickle AI"
            : "Enter your details to create an account"}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            
            {isLogin && (
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={isResetting}
                className="text-xs text-primary hover:underline disabled:opacity-50"
              >
                {isResetting ? "Sending..." : "Forgot password?"}
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

        {!isLogin && (
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
            )}
          </div>
        )}

        <Button type="submit" className="w-full font-bold" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isLogin ? (
            "Log in"
          ) : (
            "Register"
          )}
        </Button>
      </form>

      <div className="text-center text-sm mt-4">
        <button
          type="button"
          onClick={() => {
            setIsLogin(!isLogin);
            clearErrors();
            setValue("password", "");
            setValue("confirmPassword", "");
          }}
          className="text-primary hover:underline"
        >
          {isLogin
            ? "Don't have an account? Register."
            : "Already have an account? Log in."}
        </button>
      </div>
    </div>
  );
}


