import { BotonVolver } from "@/components/ui/boton-volver";
import { ContenedorEsqueleto } from "@/components/ui/esqueleto";
import { EsqueletoListadoOfertas } from "@/components/public/esqueleto-ofertas";

export default function Loading() {
  return (
    <ContenedorEsqueleto como="main" className="flex flex-1 flex-col gap-4">
      <BotonVolver href="/" destacado />
      <EsqueletoListadoOfertas />
    </ContenedorEsqueleto>
  );
}
