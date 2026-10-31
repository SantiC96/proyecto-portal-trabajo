import type { Metadata } from "next";
import { Suspense } from "react";
import { requerirRolPagina } from "@/lib/auth";
import { leerPeriodo } from "@/lib/indicadores-periodo";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";
import { SelectorPeriodoDesplegable } from "@/components/indicadores/selector-periodo-desplegable";
import { ContenidoIndicadores, RUTA_INDICADORES } from "./contenido";
import { EsqueletoIndicadores } from "./esqueleto-indicadores";
import { BotonVolver } from "@/components/ui/boton-volver";

export const metadata: Metadata = {
  title: "Indicadores | Panel municipal | Portal de Empleo Funes",
};

export default async function IndicadoresPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  await requerirRolPagina("municipalidad");
  const sp = await searchParams;
  const periodo = leerPeriodo(sp.periodo);

  return (
    <section className="flex flex-col gap-6">
      <BotonVolver href="/admin" destacado />
      <EncabezadoPagina
        banda
        className="-mt-2"
        titulo="Indicadores"
        bajada="Cómo viene funcionando el Portal de Empleo, para informar al municipio."
        acciones={<SelectorPeriodoDesplegable ruta={RUTA_INDICADORES} periodo={periodo} enBanda />}
      />

      <Suspense key={periodo} fallback={<EsqueletoIndicadores />}>
        <ContenidoIndicadores periodo={periodo} />
      </Suspense>
    </section>
  );
}
