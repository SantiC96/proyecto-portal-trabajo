import { Send } from "lucide-react";
import {
  ContenedorEsqueleto,
  CuadrosEsqueleto,
  EncabezadoEsqueleto,
} from "@/components/ui/esqueleto";
import { TituloBloque } from "@/components/ui/titulo-bloque";
import { AccionesPanelEmpresa, MasHerramientas } from "./bloques-fijos";
import { CUADROS } from "./cuadros";
import { EsqueletoPorContactar } from "./esqueletos";

// El panel (/empresa) va en el grupo (inicio) para que este esqueleto no sea el
// respaldo de las demás pantallas de la empresa.
export default function Loading() {
  return (
    <ContenedorEsqueleto como="section" className="flex flex-col gap-7">
      <EncabezadoEsqueleto
        volver="/"
        className="-mt-3"
        botonesBlancos
        bajada="Así están tus ofertas y tus candidatos."
        acciones={<AccionesPanelEmpresa />}
      />
      <CuadrosEsqueleto etiquetas={CUADROS.map((c) => c.etiqueta)} />
      <div className="@container">
        <div className="grid grid-cols-1 items-start gap-7 @3xl:mt-3 @3xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] @3xl:items-stretch">
          <section aria-labelledby="panel-por-contactar" className="tarjeta tarjeta-panel min-w-0">
            <TituloBloque
              id="panel-por-contactar"
              titulo="Candidatos por contactar"
              icono={Send}
              bajada="Derivados por la Oficina de Empleo y todavía pendientes."
            />
            <EsqueletoPorContactar />
          </section>
          {/* Fijas: van reales, sin foco mientras carga. */}
          <div inert className="flex min-w-0 flex-col *:flex-1">
            <MasHerramientas />
          </div>
        </div>
      </div>
    </ContenedorEsqueleto>
  );
}
