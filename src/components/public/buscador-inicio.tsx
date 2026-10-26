"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { LARGO_MAXIMO_BUSQUEDA } from "@/lib/busqueda";
import { hrefConParams } from "@/lib/paginacion";
import { marcarNavegacionDelUsuario } from "@/lib/navegacion-interna";
import { Combobox } from "@/components/ui/combobox";

/**
 * Buscador del inicio. Lleva a /ofertas con los mismos parámetros que usa el
 * listado público: q (texto) y categoria (nombre del rubro). Sin JavaScript
 * el formulario hace un GET común a /ofertas; con JavaScript se navega sin
 * los parámetros vacíos. El rubro se elige en un Combobox de selección única
 * que manda `categoria` en un input oculto.
 */
export function BuscadorInicio({ categorias }: { categorias: string[] }) {
  const router = useRouter();
  const id = useId();
  const [categoria, setCategoria] = useState("");

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    const q = String(datos.get("q") ?? "").trim();
    marcarNavegacionDelUsuario();
    router.push(hrefConParams("/ofertas", {}, { q, categoria }));
  }

  return (
    <form
      role="search"
      action="/ofertas"
      method="get"
      onSubmit={handleSubmit}
      className="flex w-full max-w-[960px] flex-col gap-2 rounded-2xl border border-white bg-surface p-2 shadow-[var(--sombra-buscador)] md:flex-row md:items-center"
    >
      <div className="relative flex min-w-0 flex-1 items-center">
        <Search
          className="pointer-events-none absolute left-3.5 size-5 text-muted-foreground"
          aria-hidden="true"
        />
        <label htmlFor={`${id}-q`} className="sr-only">
          Puesto, empresa o palabra clave
        </label>
        <input
          id={`${id}-q`}
          name="q"
          type="search"
          placeholder="Puesto, empresa o palabra clave"
          maxLength={LARGO_MAXIMO_BUSQUEDA}
          enterKeyHint="search"
          className="h-[52px] w-full min-w-0 rounded-xl border border-border bg-transparent pr-3 pl-11 md:border-transparent text-[17px] text-foreground outline-none placeholder:text-placeholder focus-visible:shadow-[var(--sombra-foco-campo)] [&::-webkit-search-cancel-button]:hidden"
        />
      </div>

      <span aria-hidden="true" className="hidden h-8 w-px shrink-0 bg-border md:block" />

      <label htmlFor={`${id}-rubro`} className="sr-only">
        Rubro
      </label>
      <Combobox
        id={`${id}-rubro`}
        name="categoria"
        opciones={categorias.map((c) => ({ id: c, nombre: c }))}
        valor={categoria}
        onCambiar={setCategoria}
        opcionVacia="Todos los rubros"
        placeholderBusqueda="Buscar rubro"
        etiquetaBusqueda="Buscar rubro"
        vacioTexto="No hay rubros con ese nombre"
        triggerClassName="h-[52px] w-full shrink-0 rounded-xl border border-border bg-surface px-3 text-base focus-visible:shadow-[var(--sombra-foco-campo)] md:w-[220px] md:border-transparent"
        popupClassName="min-w-[280px]"
      />

      <button type="submit" className="btn-primario min-h-[52px]! w-full shrink-0 px-8! md:w-auto">
        Buscar ofertas
      </button>
    </form>
  );
}
