import Link from "next/link";
import { Bookmark, ChartColumn, List, Plus } from "lucide-react";
import { TarjetaAcceso } from "@/components/ui/tarjeta-acceso";

// Partes fijas del panel de la empresa: las usan la página y loading.tsx.

/** Botones del encabezado. */
export function AccionesPanelEmpresa() {
  return (
    <>
      <Link href="/empresa/ofertas" className="btn-neutro">
        <List aria-hidden="true" />
        Mis ofertas
      </Link>
      <Link href="/empresa/ofertas/nueva" className="btn-primario">
        <Plus aria-hidden="true" />
        Publicar oferta
      </Link>
    </>
  );
}

/**
 * "Más herramientas": en dos columnas, las dos tarjetas ocupan el alto de la
 * izquierda y el título queda afuera, arriba.
 */
export function MasHerramientas() {
  return (
    <section aria-labelledby="panel-accesos" className="relative flex min-w-0 flex-col gap-3">
      <h2
        id="panel-accesos"
        className="text-[13px] font-extrabold tracking-[0.04em] text-neutral uppercase @3xl:absolute @3xl:bottom-[calc(100%+8px)] @3xl:left-0"
      >
        Más herramientas
      </h2>
      <div className="grid @3xl:flex-1">
        <TarjetaAcceso
          href="/empresa/candidatos-guardados"
          icono={<Bookmark className="size-[22px]" />}
          claseIcono="bg-info text-white"
          elevable
          titulo="Candidatos guardados"
          descripcion="Perfiles para futuras búsquedas"
        />
      </div>
      <div className="grid @3xl:flex-1">
        <TarjetaAcceso
          href="/empresa/indicadores"
          icono={<ChartColumn className="size-[22px]" />}
          claseIcono="bg-teal text-white"
          elevable
          titulo="Indicadores"
          descripcion="Derivaciones, entrevistas y vacantes cubiertas"
        />
      </div>
    </section>
  );
}
