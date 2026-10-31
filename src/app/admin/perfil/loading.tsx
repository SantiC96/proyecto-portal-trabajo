import { ContenedorEsqueleto, EncabezadoEsqueleto } from "@/components/ui/esqueleto";
import { PerfilCuentaEsqueleto } from "@/components/perfil/esqueleto-perfil";

export default function Loading() {
  return (
    <ContenedorEsqueleto como="section" className="flex w-full flex-col gap-6">
      <EncabezadoEsqueleto
        volver="/admin"
        botonesBlancos
        className="-mt-2"
        titulo="Mi perfil"
        bajada="Los datos de tu cuenta de la Oficina de Empleo en el portal."
      />
      <PerfilCuentaEsqueleto
        subtitulo="Oficina de Empleo"
        izquierda="Datos personales"
        derecha="Cuenta"
      />
    </ContenedorEsqueleto>
  );
}
