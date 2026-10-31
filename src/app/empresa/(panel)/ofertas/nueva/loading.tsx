import { ContenedorEsqueleto, EncabezadoEsqueleto } from "@/components/ui/esqueleto";
import { EsqueletoOfertaForm } from "../_components/esqueleto-oferta-form";

export default function Loading() {
  return (
    <ContenedorEsqueleto como="section" className="flex w-full flex-col gap-6">
      <EncabezadoEsqueleto
        volver="/empresa/ofertas"
        botonesBlancos
        className="-mt-2"
        titulo="Publicar oferta"
        bajada="Completá los datos del puesto. La oferta queda pendiente hasta que la Oficina de Empleo la revise."
      />
      <EsqueletoOfertaForm />
    </ContenedorEsqueleto>
  );
}
