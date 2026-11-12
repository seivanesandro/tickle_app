"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Popover as PopoverPrimitive, Dialog as DialogPrimitive } from "radix-ui";
import { ImageIcon, Camera, FolderOpen, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface ImageUploaderProps {
  imageBase64: string | null;
  onImageSelected: (base64: string | null) => void;
  disabled?: boolean;
}

export function ImageUploader({ imageBase64, onImageSelected, disabled }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [isCameraReady, setIsCameraReady] = useState(false);

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraReady(false);
  }, []);

  const startCamera = useCallback(
    async (mode: "user" | "environment") => {
      stopCameraStream();
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraModalOpen(false);
        nativeCameraInputRef.current?.click();
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
          setIsCameraReady(true);
        }
      } catch {
        // Se o PC não tiver webcam ou o utilizador negar permissão no browser, abre o seletor nativo
        setCameraModalOpen(false);
        stopCameraStream();
        toast.info("A abrir câmara/seletor do dispositivo...");
        nativeCameraInputRef.current?.click();
      }
    },
    [stopCameraStream]
  );

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  const handleOpenCamera = () => {
    setMenuOpen(false);
    setCameraModalOpen(true);
    setTimeout(() => {
      startCamera(facingMode);
    }, 50);
  };

  const handleSwitchCamera = () => {
    const nextMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const handleCapturePhoto = () => {
    const video = videoRef.current;
    if (!video || !isCameraReady) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL("image/jpeg", 0.9);

    stopCameraStream();
    setCameraModalOpen(false);
    onImageSelected(base64);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error("Imagem demasiado grande", {
        description: "A imagem excede o limite máximo de 20MB suportado.",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (nativeCameraInputRef.current) nativeCameraInputRef.current.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      onImageSelected(base64);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    onImageSelected(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (nativeCameraInputRef.current) nativeCameraInputRef.current.value = "";
  };

  return (
    <div className="flex items-center gap-2">
      {/* Input para escolher foto guardada no dispositivo */}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
        disabled={disabled}
      />

      {/* Input nativo com capture para fallback em Mobile/Tablet */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        ref={nativeCameraInputRef}
        onChange={handleFileChange}
        disabled={disabled}
      />

      {imageBase64 ? (
        <div className="relative inline-block mt-2 ml-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageBase64}
            alt="Preview"
            className="h-14 w-14 rounded-md object-cover border-2 border-primary/20"
          />
          <button
            type="button"
            onClick={clearImage}
            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-sm hover:scale-110 transition-transform cursor-pointer"
            disabled={disabled}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <PopoverPrimitive.Root open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverPrimitive.Trigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-primary transition-colors"
              disabled={disabled}
              title="Anexar imagem ou tirar foto"
            >
              <ImageIcon className="h-5 w-5" />
            </Button>
          </PopoverPrimitive.Trigger>

          <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
              side="top"
              align="start"
              sideOffset={10}
              className="z-50 w-56 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
            >
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  fileInputRef.current?.click();
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-primary/15 hover:text-primary transition-colors cursor-pointer"
              >
                <FolderOpen className="h-4 w-4 text-primary" />
                <span>Galeria / Dispositivo</span>
              </button>

              <button
                type="button"
                onClick={handleOpenCamera}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-primary/15 hover:text-primary transition-colors cursor-pointer"
              >
                <Camera className="h-4 w-4 text-primary" />
                <span>Tirar Foto (Câmara)</span>
              </button>
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
      )}

      {/* Modal Universal de Câmara Ao Vivo (PC, Mobile & Tablet) */}
      <DialogPrimitive.Root
        open={cameraModalOpen}
        onOpenChange={(open) => {
          setCameraModalOpen(open);
          if (!open) stopCameraStream();
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-primary/30 bg-card p-4 shadow-2xl outline-none">
            <DialogPrimitive.Title className="sr-only">
              Tirar Foto com a Câmara
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Visor da câmara para capturar e anexar fotografia à conversa.
            </DialogPrimitive.Description>

            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Câmara Tickle AI</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleSwitchCamera}
                  title="Alternar Câmara (Frontal / Traseira)"
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-primary transition-colors cursor-pointer"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <DialogPrimitive.Close asChild>
                  <button
                    type="button"
                    title="Fechar Câmara"
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-500/20 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </DialogPrimitive.Close>
              </div>
            </div>

            <div className="relative my-3 aspect-video w-full overflow-hidden rounded-xl bg-black flex items-center justify-center border border-border">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />
              {!isCameraReady && (
                <span className="absolute text-xs text-muted-foreground animate-pulse">
                  A iniciar câmara...
                </span>
              )}
            </div>

            <div className="flex items-center justify-center gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  stopCameraStream();
                  setCameraModalOpen(false);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleCapturePhoto}
                disabled={!isCameraReady}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-6 shadow-[0_0_12px_rgba(57,255,20,0.3)]"
              >
                <Camera className="mr-2 h-4 w-4" />
                Capturar Foto
              </Button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
