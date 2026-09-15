import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4 text-center">
      <div className="rounded-full bg-muted p-4">
        <WifiOff className="h-10 w-10 text-muted-foreground" />
      </div>
      <h1 className="mt-6 text-2xl font-bold tracking-tight text-foreground">
        Estás offline
      </h1>
      <p className="mt-2 text-muted-foreground">
        O Tickle precisa de uma ligação à internet para processar as tuas mensagens e imagens. <br />
        Por favor, verifica a tua ligação.
      </p>
    </div>
  );
}

