import {
  BuscadorEsqueleto,
  CampoFiltroEsqueleto,
  ContenedorEsqueleto,
  EncabezadoEsqueleto,
  PastillasEsqueleto,
} from "@/components/ui/esqueleto";
import { ESTADOS_FILTRO, LABEL_FILTRO } from "../listado";
import { EsqueletoPostulacionesAdmin } from "../esqueleto";

export default function Loading() {
  return (
    <ContenedorEsqueleto como="section" className="flex flex-col gap-6">
      <EncabezadoEsqueleto
        volver="/admin"
        className="-mt-2"
        botonesBlancos
        titulo="Postulaciones"
        bajada="Revisá cada postulación antes de derivarla a la empresa."
      />
      <PastillasEsqueleto etiquetas={ESTADOS_FILTRO.map((e) => LABEL_FILTRO[e])} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] md:items-end">
        <BuscadorEsqueleto
          etiqueta="Buscar"
          className="min-w-0"
          inputClassName="rounded-xl"
          placeholder="Buscar por nombre, apellido o DNI"
        />
        <CampoFiltroEsqueleto etiqueta="Oferta" />
        <CampoFiltroEsqueleto etiqueta="Orden" />
      </div>
      <EsqueletoPostulacionesAdmin />
    </ContenedorEsqueleto>
  );
}
