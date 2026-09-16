"use client";

import { useState } from "react";
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
});

type AuthFormValues = z.infer<typeof authSchema>;

export function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    getValues,
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
          toast.error("Login error", {
            description: error.message,
          });
          return;
        }

        toast.success("Successfully logged in!");
        window.location.href = "/chat";
      } else {
        const { data: authData, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/chat`,
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

        toast.success("Check your email!", {
          description: "We sent a confirmation link. Click it to enter the app.",
          duration: 8000,
        });
      }
    } catch (err) {
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
      redirectTo: `${window.location.origin}/update-password`,
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
          onClick={() => setIsLogin(!isLogin)}
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


