import { SeccionNumerada } from "@/components/ui/seccion-numerada";
import {
  CampoEsqueleto,
  Esqueleto,
  TarjetaOfertaEsqueleto,
} from "@/components/ui/esqueleto";

function OpcionesEsqueleto({ titulo, cantidad }: { titulo: string; cantidad: number }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-2">
      <span className="etiqueta-campo">{titulo}</span>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: cantidad }, (_, i) => (
          <Esqueleto key={i} className="h-11 w-28 rounded-full" />
        ))}
      </div>
    </div>
  );
}

function ListaEsqueleto({ etiqueta }: { etiqueta: string }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      <Esqueleto className="h-12 w-full rounded-[var(--radius-lg)]" />
      <CampoEsqueleto etiqueta={etiqueta} />
    </div>
  );
}

/**
 * OfertaForm mientras carga (Publicar y Editar oferta): las mismas secciones
 * numeradas con sus títulos reales, la vista previa y el progreso a la
 * derecha desde xl, y los botones abajo.
 */
export function EsqueletoOfertaForm() {
  return (
    <div className="formulario-oferta flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-x-7 gap-y-5 xl:mt-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-5">
          <SeccionNumerada
            numero={1}
            id="esqueleto-puesto"
            titulo="El puesto"
            descripcion="Cómo se llama el puesto y qué tareas incluye."
            className="xl:flex xl:flex-1 xl:flex-col"
            classNameCuerpo="xl:flex xl:flex-1 xl:flex-col"
          >
            <div className="flex flex-col gap-5 xl:flex-1">
              <CampoEsqueleto etiqueta="Título del puesto" />
              <CampoEsqueleto etiqueta="Descripción del puesto" alto="h-[132px] xl:h-auto xl:flex-1" className="xl:flex-1" />
            </div>
          </SeccionNumerada>
          <SeccionNumerada
            numero={2}
            id="esqueleto-rubros"
            titulo="Rubros"
            descripcion="Elegí uno o más. Los postulantes de esos rubros van a ver la oferta primero."
          >
            <div aria-hidden="true" className="flex flex-col gap-3">
              <Esqueleto className="my-[3px] h-4 w-24" />
              <div className="flex flex-wrap gap-2">
                <Esqueleto className="h-11 w-32 rounded-full" />
                <Esqueleto className="h-11 w-36 rounded-full" />
              </div>
            </div>
          </SeccionNumerada>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <section className="relative flex flex-col gap-2 xl:flex-1 xl:gap-0">
            <p className="text-xs leading-4 font-extrabold tracking-[0.06em] text-neutral uppercase xl:absolute xl:bottom-[calc(100%+8px)] xl:left-0">
              Vista previa
            </p>
            <TarjetaOfertaEsqueleto className="xl:flex-1" />
          </section>
          <div aria-hidden="true" className="tarjeta px-4 py-5 sm:p-6">
            <Esqueleto className="h-5 w-48" />
            <div className="mt-3 flex flex-col gap-2">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <Esqueleto className="size-5 shrink-0 rounded-full" />
                  <Esqueleto className="h-4 w-32" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="@container flex min-w-0 flex-col gap-5 xl:col-span-2">
          <SeccionNumerada
            numero={3}
            id="esqueleto-condiciones"
            titulo="Condiciones"
            descripcion="La modalidad, la jornada y el lugar de trabajo."
          >
            <div className="grid grid-cols-1 gap-5 @3xl:grid-cols-2">
              <OpcionesEsqueleto titulo="Modalidad" cantidad={3} />
              <OpcionesEsqueleto titulo="Jornada" cantidad={3} />
              <CampoEsqueleto etiqueta="Ubicación" className="@3xl:col-span-2" />
            </div>
          </SeccionNumerada>
          <div className="grid grid-cols-1 gap-5 @4xl:grid-cols-2">
            <SeccionNumerada
              numero={4}
              id="esqueleto-requisitos"
              titulo="Requisitos"
              descripcion="Lo que tiene que tener la persona para el puesto."
            >
              <ListaEsqueleto etiqueta="Requisito" />
            </SeccionNumerada>
            <SeccionNumerada
              numero={5}
              id="esqueleto-beneficios"
              titulo="Beneficios (opcional)"
              descripcion="Lo que la empresa ofrece además del sueldo."
            >
              <ListaEsqueleto etiqueta="Beneficio" />
            </SeccionNumerada>
          </div>
          <SeccionNumerada
            numero={6}
            id="esqueleto-publicacion"
            titulo="Publicación"
            descripcion="Cuántas personas buscás y cuánto tiempo se publica la oferta."
          >
            <div className="grid grid-cols-1 gap-5 @3xl:grid-cols-[auto_minmax(0,1fr)] @3xl:gap-x-10">
              <CampoEsqueleto etiqueta="Cantidad de personas a contratar" />
              <OpcionesEsqueleto titulo="Duración de la publicación" cantidad={4} />
            </div>
          </SeccionNumerada>
        </div>

        <div aria-hidden="true" className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end xl:col-span-2">
          <Esqueleto className="h-11 w-full rounded-[var(--radius-md)] sm:w-40" />
          <Esqueleto className="h-11 w-full rounded-[var(--radius-md)] sm:w-44" />
        </div>
      </div>
    </div>
  );
}
