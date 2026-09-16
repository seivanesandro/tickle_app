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
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    if (isStandalone) return;

    const isDismissed = localStorage.getItem("pwa-prompt-dismissed");
    if (isDismissed === "true") return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

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
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
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
          <span className="text-sm font-bold text-foreground">Install Tickle AI</span>
          <span className="text-xs text-muted-foreground">Native app, faster access.</span>
        </div>
      </div>
      
      <div className="flex items-center gap-2 shrink-0">
        <Button onClick={handleInstallClick} size="sm" className="font-bold text-xs bg-primary hover:bg-primary/90 text-primary-foreground">
          Install
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
