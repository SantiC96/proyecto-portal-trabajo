import { TablaEsqueleto } from "@/components/ui/esqueleto";
import { COLUMNAS } from "./columnas";

/** Candidatos derivados mientras cargan. */
export function EsqueletoDerivados() {
  return (
    <TablaEsqueleto
      className="mt-4"
      columnas={COLUMNAS}
      encabezados={["Candidato", "Derivado el", "Nota de la Oficina", "Estado", ""]}
      celdas={["persona", "corto", "texto", "badge", "boton"]}
      filete={false}
      filas={3}
    />
  );
}
