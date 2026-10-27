"use client";

import { useId, useOptimistic, useTransition, type ReactNode } from "react";
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
  /** Hay una procedencia elegida (?procedencia=); "Limpiar filtros" también la saca. */
  hayProcedencia: boolean;
  /** Pastillas de procedencia, debajo de la búsqueda y los rubros. */
  pastillas?: ReactNode;
  /** "Mostrando X–Y de N postulantes", a la derecha de los filtros. */
  contador?: ReactNode;
};

export function FiltrosPostulantes({
  opciones,
  rubros,
  hayBusqueda,
  hayProcedencia,
  pastillas,
  contador,
}: Props) {
  const router = useRouter();
  const idRubro = useId();
  const [, startTransition] = useTransition();
  // Refleja el cambio en el momento; al terminar la navegación vuelve a tomar
  // los valores que llegan desde la URL.
  const [filtros, setFiltros] = useOptimistic<Filtros>({ rubros });

  const tienesFiltros = hayBusqueda || hayProcedencia || filtros.rubros.length > 0;

  function aplicar(cambios: Partial<Filtros>) {
    const siguiente = { ...filtros, ...cambios };
    // Parte de la URL actual: conserva la búsqueda (q) y la procedencia.
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
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Buscador
          placeholder="Buscar por nombre o DNI"
          className="min-w-0 lg:flex-1"
          inputClassName="rounded-xl"
        />

        <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
          <label htmlFor={idRubro} className="etiqueta-campo shrink-0">
            Rubro
          </label>
          <div className="min-w-0 sm:min-w-[220px] sm:flex-1 lg:flex-none">
            <MultiCombobox
              id={idRubro}
              opciones={opciones}
              seleccionados={filtros.rubros}
              onChange={(ids) => aplicar({ rubros: ids })}
              placeholder="Todos los rubros"
              vacioTexto="No hay rubros que coincidan"
              campoClassName="bg-white"
            />
          </div>
        </div>

        {contador && <div className="shrink-0 lg:ml-auto lg:pl-2">{contador}</div>}
      </div>

      {pastillas}

      {tienesFiltros && (
        <button
          type="button"
          onClick={handleLimpiar}
          className="btn-secundario self-start"
        >
          <X aria-hidden="true" />
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
