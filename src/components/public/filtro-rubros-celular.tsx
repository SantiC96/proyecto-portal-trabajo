"use client";

import { useId, useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MultiCombobox } from "@/components/ui/multi-combobox";
import { hrefConParams } from "@/lib/paginacion";
import { resumenRubros } from "@/lib/filtros-ofertas";

/**
 * Rubros del listado público en el celular: desplegable de selección múltiple
 * con buscador. Solo cambia ?categoria= en la URL (conserva q y modalidad,
 * vuelve a la página 1); el filtrado lo hace el servidor.
 */
export function FiltroRubrosCelular({
  ruta,
  categorias,
  seleccionadas,
}: {
  ruta: string;
  categorias: string[];
  seleccionadas: string[];
}) {
  const router = useRouter();
  const id = useId();
  const [, startTransition] = useTransition();
  // Refleja el cambio en el momento; al terminar la navegación vuelve a tomar
  // los valores que llegan desde la URL.
  const [elegidas, setElegidas] = useOptimistic(seleccionadas);

  function aplicar(nombres: string[]) {
    const ordenadas = categorias.filter((c) => nombres.includes(c));
    const destino = hrefConParams(ruta, new URLSearchParams(window.location.search), {
      categoria: ordenadas,
      pagina: null,
    });
    startTransition(() => {
      setElegidas(ordenadas);
      router.push(destino, { scroll: false });
    });
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={id} className="text-[13px] font-bold text-muted-foreground-strong">
        Rubros
      </label>
      <MultiCombobox
        id={id}
        opciones={categorias.map((c) => ({ id: c, nombre: c }))}
        seleccionados={elegidas}
        onChange={aplicar}
        placeholder="Todos los rubros"
        vacioTexto="No hay rubros que coincidan"
        campoClassName="border-border-campo bg-surface"
        resumen={resumenRubros(elegidas)}
      />
    </div>
  );
}
