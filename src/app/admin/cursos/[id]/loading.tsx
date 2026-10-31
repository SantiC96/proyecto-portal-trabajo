import { Users } from "lucide-react";
import {
  ContenedorEsqueleto,
  EncabezadoEsqueleto,
  Esqueleto,
} from "@/components/ui/esqueleto";
import { TituloBloque } from "@/components/ui/titulo-bloque";
import { EsqueletoAsignados, EsqueletoDatosCurso } from "./esqueleto";

const TARJETA = "tarjeta tarjeta-panel flex min-w-0 flex-col gap-4";
const TITULO_TARJETA = "text-lg font-extrabold text-heading sm:text-xl";

export default function Loading() {
  return (
    <ContenedorEsqueleto como="section" className="flex w-full flex-col gap-6">
      <EncabezadoEsqueleto volver="/admin/cursos" botonesBlancos className="-mt-2" junto bajadaVariable={20} />
      <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 md:gap-5">
        <div className={TARJETA}>
          <div className="flex items-center justify-between gap-3">
            <p className={TITULO_TARJETA}>Estado</p>
            <Esqueleto className="h-7 w-20 rounded-full" />
          </div>
          <Esqueleto className="h-4 w-full" />
          <Esqueleto className="h-4 w-3/4" />
          <Esqueleto className="mt-auto h-11 w-full rounded-[var(--radius-md)] sm:w-40" />
        </div>
        <div className={TARJETA}>
          <p className={TITULO_TARJETA}>Asignaciones</p>
          <div aria-hidden="true" className="grid flex-1 auto-rows-fr grid-cols-2 gap-3">
            {Array.from({ length: 4 }, (_, i) => (
              <Esqueleto key={i} className="min-h-[70px] rounded-[14px]" />
            ))}
          </div>
        </div>
      </div>
      <EsqueletoDatosCurso />
      <section className="flex flex-col gap-4">
        <TituloBloque id="titulo-asignados" titulo="Postulantes asignados" icono={Users} />
        <EsqueletoAsignados />
      </section>
    </ContenedorEsqueleto>
  );
}
