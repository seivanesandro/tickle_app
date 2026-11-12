"use client";

import { useState, useRef } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  X,
  Maximize2,
  RotateCcw,
} from "lucide-react";

interface ImageViewerProps {
  src: string;
  alt?: string;
}

export function ImageViewer({ src, alt = "Imagem do chat" }: ImageViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [hasError, setHasError] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  if (!src || hasError) return null;

  const resetTransform = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resetTransform();
    }
  };

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.4, 4));
  const handleZoomOut = () => {
    setScale((prev) => {
      const next = Math.max(prev - 0.4, 0.5);
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleDownload = async () => {
    try {
      let downloadUrl = src;
      let shouldRevoke = false;

      if (!src.startsWith("data:")) {
        const res = await fetch(src);
        const blob = await res.blob();
        downloadUrl = URL.createObjectURL(blob);
        shouldRevoke = true;
      }

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `tickle-ai-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (shouldRevoke) {
        URL.revokeObjectURL(downloadUrl);
      }
    } catch {
      window.open(src, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Trigger asChild>
        <div className="group relative inline-block cursor-zoom-in overflow-hidden rounded-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            onError={() => setHasError(true)}
            className="max-h-64 rounded-md object-contain bg-black/10 transition-transform duration-200 group-hover:scale-[1.02]"
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/30 group-hover:opacity-100">
            <div className="rounded-full bg-black/70 p-2 text-primary shadow-[0_0_10px_rgba(57,255,20,0.4)]">
              <Maximize2 className="h-4 w-4" />
            </div>
          </div>
        </div>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          onWheel={handleWheel}
          className="fixed inset-0 z-50 flex flex-col outline-none select-none"
        >
          {/* Título oculto obrigatório para o Radix UI não emitir avisos na consola */}
          <DialogPrimitive.Title className="sr-only">
            Visualizador de Imagem
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Visualização em ecrã inteiro da imagem da conversa com controlos de zoom, rotação e download.
          </DialogPrimitive.Description>

          {/* Barra Superior Estilo WhatsApp / Telegram Web */}
          <div className="z-10 flex items-center justify-between border-b border-white/10 bg-black/70 px-4 py-3 text-white backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs font-mono text-primary">
              <span className="rounded bg-primary/15 px-2 py-0.5 border border-primary/30">
                {Math.round(scale * 100)}%
              </span>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={handleZoomOut}
                title="Diminuir Zoom (-)"
                className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-primary transition-colors cursor-pointer"
              >
                <ZoomOut className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                title="Aumentar Zoom (+)"
                className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-primary transition-colors cursor-pointer"
              >
                <ZoomIn className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={handleRotate}
                title="Rodar 90°"
                className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-primary transition-colors cursor-pointer"
              >
                <RotateCw className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={resetTransform}
                title="Repor Tamanho Original"
                className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-primary transition-colors cursor-pointer"
              >
                <RotateCcw className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={handleDownload}
                title="Guardar Imagem"
                className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-primary transition-colors cursor-pointer"
              >
                <Download className="h-5 w-5" />
              </button>

              <div className="mx-1 h-5 w-[1px] bg-white/20" />

              <DialogPrimitive.Close asChild>
                <button
                  type="button"
                  title="Fechar (ESC)"
                  className="rounded-lg p-2 text-white/80 hover:bg-red-500/20 hover:text-red-400 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </DialogPrimitive.Close>
            </div>
          </div>

          {/* Área Central da Imagem (Clica fora para fechar, Duplo-Clique para Zoom, Arrastar quando com Zoom) */}
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsOpen(false);
            }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className="relative flex flex-1 items-center justify-center overflow-hidden p-4"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              draggable={false}
              onPointerDown={handlePointerDown}
              onDoubleClick={() => {
                if (scale > 1) {
                  resetTransform();
                } else {
                  setScale(2);
                }
              }}
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
                transition: isDragging ? "none" : "transform 0.2s ease-out",
                cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "zoom-in",
              }}
              className="max-h-[82vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
            />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
