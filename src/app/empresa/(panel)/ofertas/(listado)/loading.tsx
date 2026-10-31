import Link from "next/link";
import { Plus } from "lucide-react";
import {
  BuscadorEsqueleto,
  ContenedorEsqueleto,
  EncabezadoEsqueleto,
  PastillasEsqueleto,
} from "@/components/ui/esqueleto";
import { ETIQUETA_FILTRO_OFERTAS, FILTROS_OFERTAS } from "@/lib/empresa/filtro-ofertas";
import { EsqueletoMisOfertas } from "./esqueleto";

export default function Loading() {
  return (
    <ContenedorEsqueleto como="section" className="flex flex-col gap-6">
      <EncabezadoEsqueleto
        volver="/empresa"
        botonesBlancos
        className="-mt-2"
        titulo="Mis ofertas"
        bajadaVariable={30}
        acciones={
          <Link href="/empresa/ofertas/nueva" className="btn-primario">
            <Plus aria-hidden="true" />
            Publicar oferta
          </Link>
        }
      />
      <div className="@container">
        <div className="flex flex-col gap-4 @5xl:flex-row @5xl:items-end @5xl:justify-between @5xl:gap-6">
          <PastillasEsqueleto
            titulo="Estado"
            etiquetas={["Todas", ...FILTROS_OFERTAS.map((f) => ETIQUETA_FILTRO_OFERTAS[f])]}
            despuesDeLinea={["Eliminadas"]}
            claseUna="sm:h-11"
            className="@5xl:flex-1"
          />
          <BuscadorEsqueleto className="w-full @5xl:w-80 @5xl:shrink-0" placeholder="Buscar por título…" />
        </div>
      </div>
      <EsqueletoMisOfertas />
    </ContenedorEsqueleto>
  );
}
