import { TablaEsqueleto } from "@/components/ui/esqueleto";
import { COLUMNAS } from "./listado";

export function EsqueletoEmpresasAdmin() {
  return (
    <TablaEsqueleto
      semantica="tabla"
      columnas={COLUMNAS}
      encabezados={["Razón social", "CUIT", "Rubro", "Persona responsable", "Solicitud", ""]}
      celdas={["persona", "corto", "texto", "texto", "corto", "boton"]}
    />
  );
}
