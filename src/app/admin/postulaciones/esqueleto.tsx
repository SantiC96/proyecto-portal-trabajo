import { TablaEsqueleto } from "@/components/ui/esqueleto";
import { COLUMNAS } from "./listado";

/** El rótulo de la fecha cambia con la pestaña: va el de "Pendientes", la pestaña por defecto. */
export function EsqueletoPostulacionesAdmin({ etiquetaFecha = "Fecha" }: { etiquetaFecha?: string }) {
  return (
    <TablaEsqueleto
      semantica="tabla"
      columnas={COLUMNAS}
      encabezados={["Postulante", "Oferta y empresa", etiquetaFecha, "Estado", ""]}
      celdas={["persona", "titulo", "corto", "badge", "boton"]}
    />
  );
}
