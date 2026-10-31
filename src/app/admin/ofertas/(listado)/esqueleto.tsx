import { TablaEsqueleto } from "@/components/ui/esqueleto";
import { COLUMNAS } from "./listado";

export function EsqueletoOfertasAdmin() {
  return (
    <TablaEsqueleto
      semantica="tabla"
      columnas={COLUMNAS}
      encabezados={["Oferta", "Empresa", "Fecha", "Estado", ""]}
      celdas={["titulo", "persona", "corto", "badge", "boton"]}
    />
  );
}
