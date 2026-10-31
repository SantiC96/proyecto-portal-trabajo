import { TablaEsqueleto } from "@/components/ui/esqueleto";

// Postulante | Curso | Completado el | acción. Lo usan la página y su esqueleto.
export const COLUMNAS = "minmax(0,1.2fr) minmax(0,1.2fr) 9rem auto";

export function EsqueletoCompletados() {
  return (
    <TablaEsqueleto
      semantica="tabla"
      columnas={COLUMNAS}
      encabezados={["Postulante", "Curso", "Completado el", ""]}
      celdas={["persona", "texto", "corto", "boton"]}
      filas={4}
    />
  );
}
