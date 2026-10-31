import {
  BuscadorEsqueleto,
  ContenedorEsqueleto,
  EncabezadoEsqueleto,
  PastillasEsqueleto,
} from "@/components/ui/esqueleto";
import { EsqueletoCursos } from "@/components/cursos/esqueleto-curso";
import { LABEL_PESTANA_CURSOS, PESTANAS_CURSOS } from "@/lib/admin/filtro-cursos";
import { AccionesCursos, bajadaCursos } from "./encabezado-cursos";

export default function Loading() {
  return (
    <ContenedorEsqueleto como="section" className="flex flex-col gap-6">
      <EncabezadoEsqueleto
        volver="/admin"
        className="-mt-2"
        botonesBlancos
        titulo="Cursos de inserción laboral"
        bajada={bajadaCursos}
        acciones={<AccionesCursos />}
      />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <PastillasEsqueleto etiquetas={PESTANAS_CURSOS.map((p) => LABEL_PESTANA_CURSOS[p])} />
        <BuscadorEsqueleto
          className="w-full min-w-0 lg:w-[22rem] lg:shrink-0"
          inputClassName="rounded-xl"
          placeholder="Buscar por nombre…"
        />
      </div>
      <EsqueletoCursos cantidad={4} pista="Ver detalle" />
    </ContenedorEsqueleto>
  );
}
