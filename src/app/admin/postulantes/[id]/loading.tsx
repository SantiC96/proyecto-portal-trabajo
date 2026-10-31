import { ChartColumn } from "lucide-react";
import {
  ContenedorEsqueleto,
  EncabezadoEsqueleto,
  Esqueleto,
  TarjetaEsqueleto,
  TituloBloqueEsqueleto,
} from "@/components/ui/esqueleto";
import { TituloBloque } from "@/components/ui/titulo-bloque";
import { EsqueletoPostulacionesAdmin } from "../../postulaciones/esqueleto";

export default function Loading() {
  return (
    <ContenedorEsqueleto como="section" className="flex w-full flex-col gap-6">
      <EncabezadoEsqueleto
        volver="/admin/postulantes"
        botonesBlancos
        className="-mt-2"
        avatar
        junto
        bajadaVariable={24}
        accionesVariables={1}
      />
      <div className="@container">
        <div className="grid grid-cols-1 items-stretch gap-4 @4xl:grid-cols-2 @4xl:gap-5">
          <TarjetaEsqueleto titulo="Datos del candidato" lineas={6} />
          <TarjetaEsqueleto titulo="Información laboral" lineas={6} />
        </div>
      </div>
      <section className="tarjeta tarjeta-panel min-w-0">
        <TituloBloque id="titulo-rechazos-cursos" titulo="Rechazos y cursos" icono={ChartColumn} />
        <div aria-hidden="true" className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Esqueleto className="h-20 rounded-[var(--radius-lg)]" />
          <Esqueleto className="h-20 rounded-[var(--radius-lg)]" />
        </div>
      </section>
      <section className="flex flex-col gap-4">
        <TituloBloqueEsqueleto titulo="Historial de postulaciones" />
        <EsqueletoPostulacionesAdmin />
      </section>
    </ContenedorEsqueleto>
  );
}
