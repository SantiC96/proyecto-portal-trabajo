import {
  BuscadorEsqueleto,
  ContenedorEsqueleto,
  EncabezadoEsqueleto,
  PastillasEsqueleto,
} from "@/components/ui/esqueleto";
import { ESTADOS_EMPRESA } from "@/lib/admin/historial-empresa";
import { LABELS } from "./listado";
import { EsqueletoEmpresasAdmin } from "./esqueleto";

export default function Loading() {
  return (
    <ContenedorEsqueleto como="section" className="flex flex-col gap-6">
      <EncabezadoEsqueleto
        volver="/admin"
        className="-mt-2"
        botonesBlancos
        titulo="Empresas"
        bajada="Aprobá las empresas antes de que puedan publicar ofertas."
      />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <PastillasEsqueleto etiquetas={ESTADOS_EMPRESA.map((e) => LABELS[e])} />
        <BuscadorEsqueleto
          className="w-full min-w-0 lg:w-[25rem] lg:shrink-0"
          inputClassName="rounded-xl"
          placeholder="Buscar por razón social o CUIT…"
        />
      </div>
      <EsqueletoEmpresasAdmin />
    </ContenedorEsqueleto>
  );
}
