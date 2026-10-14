"use client";

import { useState, type ReactNode } from "react";
import Image, { type ImageProps } from "next/image";

type FotoPrivadaProps = Omit<ImageProps, "src" | "unoptimized" | "onError"> & {
  src: string;
  fallback: ReactNode;
};

// Fotos del bucket privado "avatares" (URLs firmadas) y vistas previas locales.
// Van sin optimizador: ver docs/decisiones/011-imagenes.md.
// Si la URL firmada venció o falla la carga, se muestra el mismo fallback que
// cuando no hay foto. Se recuerda qué src falló para que un src nuevo se reintente.
export function FotoPrivada({ src, fallback, alt, ...props }: FotoPrivadaProps) {
  const [srcFallido, setSrcFallido] = useState<string | null>(null);

  if (srcFallido === src) return fallback;

  return (
    <Image
      {...props}
      src={src}
      alt={alt}
      unoptimized
      onError={() => setSrcFallido(src)}
    />
  );
}
