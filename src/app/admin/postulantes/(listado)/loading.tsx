import {
  BuscadorEsqueleto,
  CampoFiltroEsqueleto,
  ContenedorEsqueleto,
  EncabezadoEsqueleto,
  Esqueleto,
  PastillasEsqueleto,
} from "@/components/ui/esqueleto";
import { FILTROS_PROCEDENCIA } from "./listado";
import { EsqueletoListado } from "./esqueleto";

export default function Loading() {
  return (
    <ContenedorEsqueleto className="flex flex-col gap-6">
      <EncabezadoEsqueleto
        volver="/admin"
        className="-mt-2"
        botonesBlancos
        titulo="Postulantes"
        bajada="Ordenados por prioridad: primero los vecinos de Funes con domicilio verificado."
      />
      <PastillasEsqueleto etiquetas={["Todos", ...FILTROS_PROCEDENCIA.map((f) => f.etiqueta)]} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] md:items-end">
        <BuscadorEsqueleto
          etiqueta="Buscar"
          placeholder="Buscar por nombre o DNI"
          className="min-w-0"
          inputClassName="rounded-xl"
        />
        <CampoFiltroEsqueleto etiqueta="Rubro" />
        <div className="md:flex md:min-h-12 md:items-center md:pl-2">
          <Esqueleto className="h-4 w-48" />
        </div>
      </div>
      <EsqueletoListado />
    </ContenedorEsqueleto>
  );
}
