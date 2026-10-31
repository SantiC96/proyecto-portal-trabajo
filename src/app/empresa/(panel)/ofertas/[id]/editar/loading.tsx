import { ContenedorEsqueleto, EncabezadoEsqueleto } from "@/components/ui/esqueleto";
import { EsqueletoOfertaForm } from "../../_components/esqueleto-oferta-form";

// "Editar oferta" o "Completar borrador" depende de la oferta: el título va en gris.
export default function Loading() {
  return (
    <ContenedorEsqueleto como="section" className="flex w-full flex-col gap-6">
      <EncabezadoEsqueleto
        volver="/empresa/ofertas"
        botonesBlancos
        className="-mt-2"
        bajadaVariable={26}
      />
      <EsqueletoOfertaForm />
    </ContenedorEsqueleto>
  );
}
