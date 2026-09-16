"use client";

import { useEffect } from "react";

export function HydrationErrorFilter() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      const originalConsoleError = console.error;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console.error = (...args: any[]) => {
        // Ignorar o erro específico causado pelo 'bis_skin_checked' ou outros atributos de extensões
        if (
          typeof args[0] === "string" && 
          (args[0].includes("Hydration failed because the initial UI does not match") || 
           args[0].includes("A tree hydrated but some attributes") ||
           args[0].includes("bis_skin_checked"))
        ) {
          // Se o erro referir a extensão de bloqueio, engolimos o erro para não quebrar a UI
          if (args.join(" ").includes("bis_skin_checked")) {
             return;
          }
        }
        
        // Passar os outros erros normais
        originalConsoleError.apply(console, args);
      };

      // Limpeza opcional
      return () => {
        console.error = originalConsoleError;
      };
    }
  }, []);

  return null;
}

