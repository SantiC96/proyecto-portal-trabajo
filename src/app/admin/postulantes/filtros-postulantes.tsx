"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { MultiCombobox } from "@/components/ui/multi-combobox";
import { Buscador } from "@/components/ui/buscador";
import { hrefConParams } from "@/lib/paginacion";

const RUTA = "/admin/postulantes";

type Filtros = {
  rubros: string[];
  conCv: boolean;
  esperandoCurso: boolean;
};

type Props = Filtros & {
  opciones: { id: string; nombre: string }[];
  hayBusqueda: boolean;
};

export function FiltrosPostulantes({
  opciones,
  rubros,
  conCv,
  esperandoCurso,
  hayBusqueda,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  // Refleja el cambio en el momento; al terminar la navegación vuelve a tomar
  // los valores que llegan desde la URL.
  const [filtros, setFiltros] = useOptimistic<Filtros>({
    rubros,
    conCv,
    esperandoCurso,
  });

  const tienesFiltros =
    hayBusqueda || filtros.rubros.length > 0 || filtros.conCv || filtros.esperandoCurso;

  function aplicar(cambios: Partial<Filtros>) {
    const siguiente = { ...filtros, ...cambios };
    const destino = hrefConParams(RUTA, new URLSearchParams(window.location.search), {
      rubros: siguiente.rubros.join(",") || null,
      con_cv: siguiente.conCv ? "1" : null,
      esperando_curso: siguiente.esperandoCurso ? "1" : null,
      pagina: null,
    });
    startTransition(() => {
      setFiltros(siguiente);
      router.push(destino);
    });
  }

  function handleLimpiar() {
    startTransition(() => {
      setFiltros({ rubros: [], conCv: false, esperandoCurso: false });
      router.push(RUTA);
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
        {/* Búsqueda de texto */}
        <Buscador placeholder="Buscar por nombre, apellido o DNI..." />

        {/* Checkbox con CV */}
        <label className="flex min-h-11 cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground select-none">
          <input
            type="checkbox"
            checked={filtros.conCv}
            onChange={(e) => aplicar({ conCv: e.target.checked })}
            className="h-4 w-4 rounded border-border accent-primary"
          />
          Solo con CV
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        {/* Rubros */}
        <div className="flex-1 min-w-[200px]">
          <MultiCombobox
            opciones={opciones}
            seleccionados={filtros.rubros}
            onChange={(ids) => aplicar({ rubros: ids })}
            placeholder="Filtrar por rubro..."
            vacioTexto="No hay rubros que coincidan"
            campoClassName="bg-white"
          />
        </div>

        {/* Checkbox esperando curso */}
        <label className="flex min-h-11 cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-amber-800 select-none">
          <input
            type="checkbox"
            checked={filtros.esperandoCurso}
            onChange={(e) => aplicar({ esperandoCurso: e.target.checked })}
            className="h-4 w-4 rounded border-amber-300 accent-amber-600"
          />
          Esperando curso
        </label>
      </div>

      {/* Limpiar filtros */}
      {tienesFiltros && (
        <button
          type="button"
          onClick={handleLimpiar}
          className="btn-secundario inline-flex min-h-11 items-center gap-1.5 px-3 py-1.5 text-sm"
        >
          <X className="h-3.5 w-3.5" />
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
