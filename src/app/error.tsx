"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global Error Caught:", error);
  }, [error]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground p-4">
      <div className="max-w-md w-full bg-card border border-border p-6 rounded-xl shadow-lg text-center space-y-4">
        <h2 className="text-xl font-bold text-destructive">Algo correu mal!</h2>
        <p className="text-sm text-muted-foreground break-words">
          {error.message || "Erro desconhecido ao carregar a página."}
        </p>
        <p className="text-xs text-muted-foreground/50 break-all bg-muted p-2 rounded">
          {error.stack}
        </p>
        <div className="pt-4">
          <Button onClick={() => reset()} className="w-full">
            Tentar Novamente
          </Button>
        </div>
      </div>
    </div>
  );
}

