"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { MultiCombobox } from "@/components/ui/multi-combobox";
import { Buscador } from "@/components/ui/buscador";
import { hrefConParams } from "@/lib/paginacion";
import type { Tabla } from "@/types/db";

const RUTA = "/admin/postulantes";

type Filtros = {
  rubros: string[];
};

type Props = Filtros & {
  opciones: Tabla<"categorias">[];
  hayBusqueda: boolean;
};

export function FiltrosPostulantes({
  opciones,
  rubros,
  hayBusqueda,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  // Refleja el cambio en el momento; al terminar la navegación vuelve a tomar
  // los valores que llegan desde la URL.
  const [filtros, setFiltros] = useOptimistic<Filtros>({ rubros });

  const tienesFiltros = hayBusqueda || filtros.rubros.length > 0;

  function aplicar(cambios: Partial<Filtros>) {
    const siguiente = { ...filtros, ...cambios };
    const destino = hrefConParams(RUTA, new URLSearchParams(window.location.search), {
      rubros: siguiente.rubros.join(",") || null,
      // Filtros que ya no existen: no se arrastran desde un link viejo.
      esperando_curso: null,
      curso_pendiente: null,
      con_cv: null,
      nivel: null,
      comprobante: null,
      pagina: null,
    });
    startTransition(() => {
      setFiltros(siguiente);
      router.push(destino);
    });
  }

  function handleLimpiar() {
    startTransition(() => {
      setFiltros({ rubros: [] });
      router.push(RUTA);
    });
  }

  return (
    <div className="space-y-3">
      <Buscador placeholder="Buscar por nombre, apellido o DNI..." />

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
