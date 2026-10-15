"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {}, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-foreground">Algo salió mal</h1>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">
        Algo salió mal al cargar esta página. Podés intentar de nuevo o volver al panel.
      </p>
      {error.digest && (
        <p className="mt-2 text-xs text-muted-foreground">
          Código de referencia: <span className="font-mono">{error.digest}</span>
        </p>
      )}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="btn-primario inline-flex h-10 items-center justify-center px-5 text-sm"
        >
          Intentar de nuevo
        </button>
        <Link
          href="/empresa"
          className="btn-secundario inline-flex h-10 items-center justify-center px-5 text-sm"
        >
          Volver al panel
        </Link>
      </div>
    </div>
  );
}
