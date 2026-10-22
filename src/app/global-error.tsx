"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // global error boundary reached
  }, [error]);

  // Se renderiza sin globals.css: estos valores replican los tokens primary,
  // background, foreground y muted-foreground del bloque @theme.
  return (
    <html lang="es">
      <body
        style={{
          fontFamily: "'Trebuchet MS', 'Segoe UI', sans-serif",
          backgroundColor: "#f6f8f6",
          color: "#17241d",
          margin: 0,
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          textAlign: "center",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "0.75rem" }}>
            Algo salió mal
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#666f6a", maxWidth: "28rem", margin: "0 auto" }}>
            Ocurrió un error inesperado. Recargá la página o volvé más tarde.
          </p>
          {error.digest && (
            <p style={{ fontSize: "0.75rem", color: "#666f6a", marginTop: "0.5rem" }}>
              Código: <span style={{ fontFamily: "monospace" }}>{error.digest}</span>
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: "2.5rem",
              padding: "0 1.25rem",
              borderRadius: "0.5rem",
              backgroundColor: "#006833",
              color: "#ffffff",
              fontSize: "0.875rem",
              fontWeight: "500",
              cursor: "pointer",
              border: "none",
            }}
          >
            Intentar de nuevo
          </button>
        </div>
      </body>
    </html>
  );
}
