import {
  ContenedorEsqueleto,
  EncabezadoEsqueleto,
  Esqueleto,
} from "@/components/ui/esqueleto";

export default function Loading() {
  return (
    <ContenedorEsqueleto como="section" className="flex flex-col gap-6">
      <EncabezadoEsqueleto
        volver="/admin"
        className="-mt-2"
        botonesBlancos
        titulo="Cuentas de la oficina"
        bajada="Todas las cuentas activas tienen los mismos permisos. Una cuenta desactivada no puede ingresar, pero su historial se conserva."
        accionesVariables={1}
      />
      <div aria-hidden="true" className="flex flex-col gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="tarjeta tarjeta-panel flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
          >
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <Esqueleto className="size-14 shrink-0 rounded-full" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Esqueleto className="h-5 w-44 max-w-full" />
                  <Esqueleto className="h-7 w-20 rounded-full" />
                </div>
                <Esqueleto className="h-4 w-56 max-w-full" />
                <Esqueleto className="h-4 w-64 max-w-full" />
              </div>
            </div>
            <Esqueleto className="h-11 w-full shrink-0 rounded-[var(--radius-md)] sm:w-32" />
          </div>
        ))}
      </div>
    </ContenedorEsqueleto>
  );
}
