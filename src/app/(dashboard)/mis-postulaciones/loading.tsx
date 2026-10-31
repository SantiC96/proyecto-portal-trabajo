import Link from "next/link";
import { Search } from "lucide-react";
import {
  ContenedorEsqueleto,
  EncabezadoEsqueleto,
  PastillasEsqueleto,
} from "@/components/ui/esqueleto";
import { ETIQUETA_FILTRO, FILTROS_MIS_POSTULACIONES } from "@/lib/mis-postulaciones";
import { LeyendaEstados } from "./mis-postulaciones-lista";
import { EsqueletoMisPostulaciones } from "./esqueleto";

export default function Loading() {
  return (
    <ContenedorEsqueleto como="section" className="flex flex-col gap-6">
      <EncabezadoEsqueleto
        volver="/panel"
        className="-mt-2"
        titulo="Mis postulaciones"
        bajadaVariable={30}
        acciones={
          <Link href="/ofertas" className="btn-secundario">
            <Search aria-hidden="true" />
            Buscar ofertas
          </Link>
        }
      />
      {/* La leyenda es fija: va real, pero sin foco mientras carga. */}
      <div inert>
        <LeyendaEstados />
      </div>
      <PastillasEsqueleto
        titulo="Estado"
        etiquetas={["Todas", ...FILTROS_MIS_POSTULACIONES.map((f) => ETIQUETA_FILTRO[f])]}
        claseUna="sm:h-11"
      />
      <EsqueletoMisPostulaciones />
    </ContenedorEsqueleto>
  );
}
