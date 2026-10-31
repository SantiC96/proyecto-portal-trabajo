import { ContenedorEsqueleto, EncabezadoEsqueleto } from "@/components/ui/esqueleto";
import { EsqueletoMisCursos } from "@/components/cursos/esqueleto-curso";

export default function Loading() {
  return (
    <ContenedorEsqueleto como="section" className="flex flex-col gap-6">
      <EncabezadoEsqueleto
        volver="/panel"
        className="-mt-2"
        titulo="Mis cursos"
        bajada="Ante cualquier duda, comunicate con la Oficina de Empleo."
      />
      <EsqueletoMisCursos />
    </ContenedorEsqueleto>
  );
}
