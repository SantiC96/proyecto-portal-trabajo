import {
  BuscadorEsqueleto,
  ContenedorEsqueleto,
  EncabezadoEsqueleto,
  PastillasEsqueleto,
} from "@/components/ui/esqueleto";
import { ESTADOS_FILTRO_ADMIN } from "@/lib/admin/filtro-ofertas";
import { LABEL_FILTRO } from "./listado";
import { EsqueletoOfertasAdmin } from "./esqueleto";

export default function Loading() {
  return (
    <ContenedorEsqueleto como="section" className="flex flex-col gap-6">
      <EncabezadoEsqueleto
        volver="/admin"
        className="-mt-2"
        botonesBlancos
        titulo="Ofertas"
        bajada="Revisá las ofertas que cargan las empresas antes de publicarlas."
      />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <PastillasEsqueleto etiquetas={ESTADOS_FILTRO_ADMIN.map((e) => LABEL_FILTRO[e])} />
        <BuscadorEsqueleto
          className="w-full min-w-0 lg:w-80 lg:shrink-0"
          inputClassName="rounded-xl"
          placeholder="Buscar por título…"
        />
      </div>
      <EsqueletoOfertasAdmin />
    </ContenedorEsqueleto>
  );
}
