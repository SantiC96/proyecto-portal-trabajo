import Link from "next/link";
import { ChartColumn, LayoutGrid } from "lucide-react";
import {
  ContenedorEsqueleto,
  CuadrosEsqueleto,
  EncabezadoEsqueleto,
  Esqueleto,
  EsqueletoEnLinea,
  TituloBloqueEsqueleto,
} from "@/components/ui/esqueleto";
import { TituloBloque } from "@/components/ui/titulo-bloque";
import { TITULOS_PENDIENTES } from "./pendientes-panel";

// El panel (/admin) va en el grupo (inicio) para que este esqueleto no sea el
// respaldo de las demás pantallas de la oficina.
export default function Loading() {
  return (
    <ContenedorEsqueleto como="section" className="flex flex-col gap-8">
      <EncabezadoEsqueleto
        volver="/"
        className="-mt-4"
        botonesBlancos
        bajada="Esto es lo que tiene pendiente la Oficina de Empleo."
        acciones={
          <Link href="/admin/indicadores" className="btn-neutro">
            <ChartColumn aria-hidden="true" />
            Ver indicadores
          </Link>
        }
      />

      <section aria-labelledby="panel-pendientes" className="@container flex flex-col gap-4">
        <TituloBloqueEsqueleto titulo="Pendientes" bajadaVariable />
        <CuadrosEsqueleto etiquetas={TITULOS_PENDIENTES} pie />
      </section>

      <section aria-labelledby="panel-accesos" className="flex flex-col gap-4">
        <TituloBloque id="panel-accesos" titulo="Accesos" icono={LayoutGrid} />
        <div aria-hidden="true" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="tarjeta flex h-full items-center gap-4 p-5">
              <Esqueleto className="size-11 shrink-0 rounded-[var(--radius-lg)]" />
              {/* Renglones con la letra de TarjetaAcceso: 17, 14 y 13 px. */}
              <div className="min-w-0 flex-1">
                <p className="text-[17px] leading-snug">
                  <EsqueletoEnLinea className="w-40 max-w-full" />
                </p>
                <p className="mt-0.5 text-sm">
                  <EsqueletoEnLinea className="w-56 max-w-full" />
                </p>
                <p className="mt-1 text-[13px]">
                  <EsqueletoEnLinea className="w-24" />
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </ContenedorEsqueleto>
  );
}
