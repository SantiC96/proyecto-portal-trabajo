import { TablaEsqueleto } from "@/components/ui/esqueleto";
import { COLUMNAS } from "./columnas";

/** La tabla de Mis ofertas mientras carga. */
export function EsqueletoMisOfertas() {
  return (
    <TablaEsqueleto
      semantica="tabla"
      columnas={COLUMNAS}
      encabezados={["Oferta", "Estado", "Rubros", "Vence", ""]}
      celdas={["titulo", "badge", "chips", "corto", "boton"]}
      filas={5}
    />
  );
}
