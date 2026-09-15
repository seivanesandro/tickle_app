"use client";

import { useRef } from "react";
import { ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface ImageUploaderProps {
  imageBase64: string | null;
  onImageSelected: (base64: string | null) => void;
  disabled?: boolean;
}

export function ImageUploader({ imageBase64, onImageSelected, disabled }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // A Groq suporta até 20MB. Validação forte no cliente.
    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error("Imagem demasiado grande", {
        description: "A imagem excede o limite máximo de 20MB suportado.",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
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
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
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
            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-sm hover:scale-110 transition-transform"
            disabled={disabled}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-primary transition-colors"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageIcon className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}

