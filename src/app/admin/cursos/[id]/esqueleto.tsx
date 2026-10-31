import { Esqueleto, TablaEsqueleto } from "@/components/ui/esqueleto";

// Postulante | Estado | Fechas | Nota interna. Lo usan la página y su esqueleto.
export const COLUMNAS_ASIGNADOS = "minmax(0,1.3fr) 8.5rem minmax(0,1fr) minmax(0,1.4fr)";

export function EsqueletoAsignados() {
  return (
    <TablaEsqueleto
      semantica="tabla"
      columnas={COLUMNAS_ASIGNADOS}
      encabezados={["Postulante", "Estado", "Fechas", "Nota interna"]}
      celdas={["persona", "badge", "titulo", "texto"]}
      filas={3}
    />
  );
}

/** La tarjeta de los datos del curso (CursoForm "editar", en lectura). */
export function EsqueletoDatosCurso() {
  return (
    <div className="tarjeta tarjeta-panel flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-lg font-extrabold text-heading sm:text-xl">Datos del curso</p>
        <Esqueleto className="h-11 w-24 rounded-[var(--radius-md)]" />
      </div>
      <div aria-hidden="true" className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Esqueleto className="h-3.5 w-24" />
            <Esqueleto className="h-5 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
