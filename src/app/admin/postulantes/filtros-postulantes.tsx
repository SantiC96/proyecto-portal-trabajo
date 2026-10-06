"use client";

import { useState, useTransition, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { MultiCombobox } from "@/components/ui/multi-combobox";

type Props = {
  opciones: { id: string; nombre: string }[];
  seleccionadosIniciales: string[];
  qInicial: string;
  conCvInicial: boolean;
};

function buildUrl(params: {
  q: string;
  rubros: string[];
  conCv: boolean;
}): string {
  const sp = new URLSearchParams();
  if (params.q.trim()) sp.set("q", params.q.trim());
  if (params.rubros.length > 0) sp.set("rubros", params.rubros.join(","));
  if (params.conCv) sp.set("con_cv", "1");
  const qs = sp.toString();
  return qs ? `/admin/postulantes?${qs}` : "/admin/postulantes";
}

export function FiltrosPostulantes({
  opciones,
  seleccionadosIniciales,
  qInicial,
  conCvInicial,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [q, setQ] = useState(qInicial);
  const [rubros, setRubros] = useState<string[]>(seleccionadosIniciales);
  const [conCv, setConCv] = useState(conCvInicial);

  const tienesFiltros =
    q.trim() !== "" || rubros.length > 0 || conCv;

  function pushUrl(overrides: Partial<{ q: string; rubros: string[]; conCv: boolean }> = {}) {
    const url = buildUrl({ q, rubros, conCv, ...overrides });
    startTransition(() => router.push(url));
  }

  function pushUrlReplace(overrides: Partial<{ q: string; rubros: string[]; conCv: boolean }> = {}) {
    const url = buildUrl({ q, rubros, conCv, ...overrides });
    startTransition(() => router.replace(url));
  }

  function handleRubrosChange(ids: string[]) {
    setRubros(ids);
    pushUrl({ rubros: ids });
  }

  function handleConCvChange(checked: boolean) {
    setConCv(checked);
    pushUrl({ conCv: checked });
  }

  function handleQChange(value: string) {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      pushUrlReplace({ q: value });
    }, 400);
  }

  function handleTextSubmit(e: FormEvent) {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    pushUrlReplace();
  }

  function handleLimpiar() {
    setQ("");
    setRubros([]);
    setConCv(false);
    startTransition(() => router.push("/admin/postulantes"));
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
        {/* Búsqueda de texto */}
        <form onSubmit={handleTextSubmit} className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-icon pointer-events-none" />
          <input
            type="text"
            value={q}
            onChange={(e) => handleQChange(e.target.value)}
            placeholder="Buscar por nombre, apellido o DNI..."
            className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-24 text-sm text-foreground placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {isPending && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
              Buscando…
            </span>
          )}
        </form>

        {/* Checkbox con CV */}
        <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground select-none">
          <input
            type="checkbox"
            checked={conCv}
            onChange={(e) => handleConCvChange(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-primary"
          />
          Solo con CV cargado
        </label>
      </div>

      {/* Rubros */}
      <MultiCombobox
        opciones={opciones}
        seleccionados={rubros}
        onChange={handleRubrosChange}
        placeholder="Filtrar por rubro..."
        vacioTexto="No hay rubros que coincidan"
        campoClassName="bg-white"
      />

      {/* Limpiar filtros */}
      {tienesFiltros && (
        <button
          type="button"
          onClick={handleLimpiar}
          className="btn-secundario inline-flex items-center gap-1.5 px-3 py-1.5 text-sm"
        >
          <X className="h-3.5 w-3.5" />
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
