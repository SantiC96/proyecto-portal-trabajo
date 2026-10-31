import { TablaEsqueleto } from "@/components/ui/esqueleto";
import { COLUMNAS_TABLA } from "./listado";

export function EsqueletoComprobantes() {
  return (
    <TablaEsqueleto
      semantica="tabla"
      columnas={COLUMNAS_TABLA}
      encabezados={["Postulante", "Localidad", "Domicilio declarado", "Cargado el", "Comprobante", ""]}
      celdas={["persona", "corto", "texto", "corto", "boton", "boton"]}
    />
  );
}
