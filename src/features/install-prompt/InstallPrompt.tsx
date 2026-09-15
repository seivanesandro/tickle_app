"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 1. Verificar se já está a correr como PWA (standalone)
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    if (isStandalone) {
      return;
    }

    // 2. Verificar se o utilizador já mandou esconder o banner antes
    const isDismissed = localStorage.getItem("pwa-prompt-dismissed");
    if (isDismissed === "true") {
      return;
    }

    // 3. Ouve o evento que o browser dispara quando deteta uma PWA válida
    const handleBeforeInstallPrompt = (e: Event) => {
      // Evita que o aviso padrão chato do browser apareça
      e.preventDefault();
      // Guarda o evento para usarmos no botão
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Mostra o nosso banner bonito do Shadcn
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Se o utilizador instalar pelos menus do browser, esconde o nosso banner
    const handleAppInstalled = () => {
      setIsVisible(false);
      setDeferredPrompt(null);
    };
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Dispara o prompt nativo de instalação do sistema
    deferredPrompt.prompt();
    
    // Aguarda a resposta do utilizador
    const { outcome } = await deferredPrompt.userChoice;
    
    // Se ele disser sim, fechamos o banner
    if (outcome === "accepted") {
      setIsVisible(false);
    }
    
    // O evento prompt só pode ser chamado uma vez, por isso limpamos a state
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    // Esconde na sessão atual
    setIsVisible(false);
    // Guarda no localStorage para não chatear mais no futuro
    localStorage.setItem("pwa-prompt-dismissed", "true");
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96 bg-card border shadow-lg rounded-xl p-4 flex items-center justify-between gap-4 animate-in slide-in-from-bottom-5">
      <div className="flex items-center gap-3">
        <div className="bg-primary/20 p-2 rounded-full shrink-0">
          <Download className="h-5 w-5 text-primary" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-foreground">Instalar Tickle AI</span>
          <span className="text-xs text-muted-foreground">App nativa, acesso mais rápido.</span>
        </div>
      </div>
      
      <div className="flex items-center gap-2 shrink-0">
        <Button onClick={handleInstallClick} size="sm" className="font-bold text-xs bg-primary hover:bg-primary/90 text-primary-foreground">
          Instalar
        </Button>
        <Button 
          onClick={handleDismiss} 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

