import { Briefcase, Users } from "lucide-react";
import {
  ContenedorEsqueleto,
  DatosEsqueleto,
  EncabezadoEsqueleto,
  TextosOfertaEsqueleto,
} from "@/components/ui/esqueleto";
import { TituloBloque } from "@/components/ui/titulo-bloque";
import { EsqueletoDerivados } from "./esqueleto";

export default function Loading() {
  return (
    <ContenedorEsqueleto como="section" className="flex w-full flex-col gap-6">
      <EncabezadoEsqueleto
        volver="/empresa/ofertas"
        botonesBlancos
        className="-mt-2"
        junto
        bajadaVariable={24}
        accionesVariables={2}
      />
      <div className="@container">
        <div className="grid grid-cols-1 items-stretch gap-6 @3xl:grid-cols-[380px_minmax(0,1fr)]">
          <section className="tarjeta tarjeta-panel min-w-0">
            <TituloBloque id="datos-oferta" titulo="Datos de la oferta" icono={Briefcase} />
            <DatosEsqueleto cantidad={6} className="mt-5" />
          </section>
          <TextosOfertaEsqueleto secciones={3} />
        </div>
      </div>
      <section className="mt-4">
        <TituloBloque
          id="candidatos-titulo"
          titulo="Candidatos derivados por la Oficina de Empleo"
          icono={Users}
          bajada="Los perfiles que la Oficina preseleccionó para esta oferta."
        />
        <EsqueletoDerivados />
      </section>
    </ContenedorEsqueleto>
  );
}
