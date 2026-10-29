import { normalizarBusqueda } from "@/components/ui/combobox";
import type { RubroConOfertas } from "@/lib/rubros-destacados";

// Lista del panel "Todos los rubros" (/ofertas). La usa solo el panel (client
// component): normalizarBusqueda viene de un módulo "use client".

export type GrupoRubros = { letra: string; rubros: RubroConOfertas[] };

/** Rubros que contienen el texto, sin importar tildes ni mayúsculas. */
export function filtrarRubros(
  rubros: readonly RubroConOfertas[],
  texto: string,
): RubroConOfertas[] {
  const buscado = normalizarBusqueda(texto.trim());
  if (buscado === "") return [...rubros];
  return rubros.filter((r) => normalizarBusqueda(r.nombre).includes(buscado));
}

/** En orden alfabético, agrupados por la primera letra sin tilde ("Á" va en "A"). */
export function agruparPorLetra(rubros: readonly RubroConOfertas[]): GrupoRubros[] {
  const ordenados = [...rubros].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  const grupos: GrupoRubros[] = [];
  for (const rubro of ordenados) {
    const letra = normalizarBusqueda(rubro.nombre.charAt(0)).toUpperCase();
    const ultimo = grupos[grupos.length - 1];
    if (ultimo?.letra === letra) ultimo.rubros.push(rubro);
    else grupos.push({ letra, rubros: [rubro] });
  }
  return grupos;
}
