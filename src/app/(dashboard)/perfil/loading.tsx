import { ContenedorEsqueleto, EncabezadoEsqueleto } from "@/components/ui/esqueleto";
import { IndiceSecciones } from "@/components/perfil/indice-secciones";
import {
  EncabezadoPerfilEsqueleto,
  SeccionPerfilEsqueleto,
} from "@/components/perfil/esqueleto-perfil";
import { BAJADA, SECCIONES, TITULO } from "./secciones";

export default function Loading() {
  return (
    <ContenedorEsqueleto como="section" className="@container flex flex-col gap-6">
      <EncabezadoEsqueleto volver="/panel" className="-mt-2" titulo={TITULO} bajada={BAJADA} />

      <div className="grid grid-cols-1 items-start gap-4 @3xl:grid-cols-[240px_minmax(0,1fr)] @3xl:gap-8">
        {/* El índice es fijo: va real, sin foco mientras carga. */}
        <aside inert className="-mx-4 px-4 py-2 sm:-mx-6 sm:px-6 @3xl:mx-0 @3xl:p-0">
          <IndiceSecciones secciones={SECCIONES} />
        </aside>
        <div className="flex min-w-0 flex-col gap-6">
          <EncabezadoPerfilEsqueleto subtitulo="Postulante" />
          <SeccionPerfilEsqueleto titulo="Datos personales" datos={6} />
          <SeccionPerfilEsqueleto titulo="Procedencia" datos={2} />
          <SeccionPerfilEsqueleto titulo="Información laboral" datos={4} />
        </div>
      </div>
    </ContenedorEsqueleto>
  );
}
