import {
  CampoEsqueleto,
  ContenedorEsqueleto,
  DetalleEsqueleto,
  EncabezadoEsqueleto,
  Esqueleto,
} from "@/components/ui/esqueleto";
import { EsqueletoCursos } from "@/components/cursos/esqueleto-curso";

/** La misma grilla que CursoForm "crear": datos a la izquierda; vista previa y "Cómo se usa" a la derecha desde xl. */
export default function Loading() {
  return (
    <ContenedorEsqueleto como="section" className="flex w-full flex-col gap-6">
      <EncabezadoEsqueleto volver="/admin/cursos" botonesBlancos className="-mt-2" titulo="Crear curso" />
      <div className="formulario-oferta flex flex-col gap-6 xl:mt-5">
        <DetalleEsqueleto
          desde="xl"
          anchoLateral={380}
          separacion="gap-5"
          separacionColumnas="gap-6"
          principal={
            <div className="tarjeta tarjeta-panel @container flex flex-col gap-5">
              <p className="text-lg font-extrabold text-heading sm:text-xl">Datos del curso</p>
              <div className="grid grid-cols-1 items-start gap-5 @xl:grid-cols-2">
                <CampoEsqueleto etiqueta="Nombre" />
                <CampoEsqueleto etiqueta="Link (opcional)" />
              </div>
              <CampoEsqueleto etiqueta="Descripción" alto="h-[132px]" />
              <CampoEsqueleto etiqueta="Indicaciones" alto="h-[132px]" />
            </div>
          }
          lateral={
            <>
              <div className="relative flex flex-col gap-2 xl:gap-0">
                <p className="text-xs leading-4 font-extrabold tracking-[0.06em] text-neutral uppercase xl:absolute xl:bottom-[calc(100%+8px)] xl:left-0">
                  Vista previa para el postulante
                </p>
                <EsqueletoCursos cantidad={1} pista="Ver curso" />
              </div>
              <div className="tarjeta tarjeta-panel flex flex-col gap-4">
                <p className="text-lg font-extrabold text-heading">Cómo se usa</p>
                <div aria-hidden="true" className="flex flex-col gap-3">
                  {Array.from({ length: 3 }, (_, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Esqueleto className="size-6 shrink-0 rounded-full" />
                      <Esqueleto className="h-4 flex-1" />
                    </div>
                  ))}
                </div>
              </div>
            </>
          }
        />
        <div aria-hidden="true" className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Esqueleto className="h-11 w-full rounded-[var(--radius-md)] sm:w-32" />
          <Esqueleto className="h-11 w-full rounded-[var(--radius-md)] sm:w-36" />
        </div>
      </div>
    </ContenedorEsqueleto>
  );
}
