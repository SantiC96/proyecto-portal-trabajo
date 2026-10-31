import { Esqueleto, TablaEsqueleto } from "@/components/ui/esqueleto";

// Postulante | Procedencia | Coincidencia | Invitación | acciones. Lo usan la página y su esqueleto.
export const COLUMNAS = "minmax(0,1.5fr) minmax(0,1.1fr) minmax(0,2fr) minmax(0,1.3fr) auto";

/** Los postulantes que coinciden mientras cargan: el contador y la tabla. */
export function EsqueletoCandidatos() {
  return (
    <div aria-hidden="true" className="mt-6">
      <Esqueleto className="mb-3 h-4 w-44" />
      <TablaEsqueleto
        columnas={COLUMNAS}
        encabezados={["Postulante", "Procedencia", "Coincidencia", "Invitación", ""]}
        celdas={["persona", "badge", "chips", "texto", "boton"]}
        filete={false}
        filas={4}
      />
    </div>
  );
}

/** "Ya se postularon" (plegable) mientras carga. */
export function EsqueletoYaSePostularon() {
  return (
    <div aria-hidden="true" className="mt-8 flex min-h-11 items-center justify-between rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-3">
      <Esqueleto className="h-4 w-40" />
      <Esqueleto className="size-4" />
    </div>
  );
}
