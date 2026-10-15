"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { LARGO_MAXIMO_BUSQUEDA } from "@/lib/busqueda";
import { hrefConParams } from "@/lib/paginacion";

const ESPERA_MS = 400;

type Props = {
  placeholder: string;
  /** Texto accesible del campo; por defecto se usa el placeholder. */
  etiqueta?: string;
  className?: string;
  inputClassName?: string;
};

/**
 * Campo de búsqueda que escribe "q" en la URL (con debounce) y vuelve a la
 * página 1. Usa router.replace para no llenar el historial con cada tecla.
 */
export function Buscador({ placeholder, etiqueta, className, inputClassName }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  const qUrl = searchParams.get("q") ?? "";
  const [valor, setValor] = useState(qUrl);
  // qVista: último valor de la URL ya reconciliado con el input.
  // qEnviada: último valor que escribió este componente en la URL.
  const [qVista, setQVista] = useState(qUrl);
  const [qEnviada, setQEnviada] = useState(qUrl);

  // Si la URL cambió por fuera (por ejemplo "Limpiar filtros"), el input la
  // sigue. Los cambios que hizo este mismo componente no pisan lo que el
  // usuario siguió escribiendo mientras la navegación estaba en curso.
  if (qUrl !== qVista) {
    setQVista(qUrl);
    if (qUrl !== qEnviada) {
      setQEnviada(qUrl);
      setValor(qUrl);
    }
  }

  useEffect(() => {
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, []);

  function navegar(texto: string) {
    if (temporizador.current) clearTimeout(temporizador.current);
    const q = texto.trim();
    // Se lee la URL en el momento de navegar para no perder filtros que hayan
    // cambiado durante la espera del debounce.
    const actuales = new URLSearchParams(window.location.search);
    if ((actuales.get("q") ?? "") === q) return;

    setQEnviada(q);
    const destino = hrefConParams(pathname, actuales, { q, pagina: null });
    startTransition(() => router.replace(destino, { scroll: false }));
  }

  function handleChange(texto: string) {
    setValor(texto);
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => navegar(texto), ESPERA_MS);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    navegar(valor);
  }

  function handleLimpiar() {
    setValor("");
    navegar("");
  }

  return (
    <form role="search" onSubmit={handleSubmit} className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-icon"
        aria-hidden="true"
      />
      <input
        type="search"
        value={valor}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        aria-label={etiqueta ?? placeholder}
        maxLength={LARGO_MAXIMO_BUSQUEDA}
        enterKeyHint="search"
        className={cn(
          "h-11 w-full rounded-lg border border-border bg-surface pl-10 pr-24 text-sm text-foreground placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary/30 [&::-webkit-search-cancel-button]:hidden",
          inputClassName,
        )}
      />
      <div className="absolute inset-y-0 right-0 flex items-center">
        {isPending && (
          <span className="pointer-events-none pr-1 text-xs text-muted-foreground" aria-live="polite">
            Buscando…
          </span>
        )}
        {valor && (
          <button
            type="button"
            onClick={handleLimpiar}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Limpiar búsqueda"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </form>
  );
}
