import { ContenedorEsqueleto, EncabezadoEsqueleto } from "@/components/ui/esqueleto";
import { DIAS_CURSOS_COMPLETADOS_RECIENTES } from "@/lib/cursos";
import { EsqueletoCompletados } from "./esqueleto";

export default function Loading() {
  return (
    <ContenedorEsqueleto como="section" className="flex flex-col gap-6">
      <EncabezadoEsqueleto
        volver="/admin/cursos"
        botonesBlancos
        className="-mt-2"
        titulo="Cursos completados"
        bajada={`Postulantes que marcaron un curso como completado en los últimos ${DIAS_CURSOS_COMPLETADOS_RECIENTES} días. Sus rechazos anteriores ya no cuentan para un nuevo curso.`}
      />
      <EsqueletoCompletados />
    </ContenedorEsqueleto>
  );
}
