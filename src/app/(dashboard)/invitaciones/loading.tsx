import { ContenedorEsqueleto, EncabezadoEsqueleto } from "@/components/ui/esqueleto";
import { EsqueletoInvitaciones } from "./esqueleto";

export default function Loading() {
  return (
    <ContenedorEsqueleto como="section" className="flex flex-col gap-6">
      <EncabezadoEsqueleto
        volver="/panel"
        className="-mt-2"
        titulo="Invitaciones"
        bajada="Ofertas que la Oficina de Empleo te propone"
      />
      <EsqueletoInvitaciones />
    </ContenedorEsqueleto>
  );
}
