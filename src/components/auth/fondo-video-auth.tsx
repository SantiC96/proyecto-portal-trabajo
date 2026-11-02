"use client";

import { useEffect, useRef } from "react";

export function FondoVideoAuth() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const movimientoReducido = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sincronizarReproduccion = () => {
      if (movimientoReducido.matches) {
        video.pause();
      } else {
        void video.play().catch(() => {});
      }
    };

    sincronizarReproduccion();
    movimientoReducido.addEventListener("change", sincronizarReproduccion);
    return () => movimientoReducido.removeEventListener("change", sincronizarReproduccion);
  }, []);

  return (
    <video
      ref={videoRef}
      className="login-columna-video"
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
      tabIndex={-1}
    >
      <source src="/videos/fondo-auth.mp4" type="video/mp4" />
    </video>
  );
}
