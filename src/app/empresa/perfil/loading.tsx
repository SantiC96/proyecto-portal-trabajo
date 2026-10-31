import { ContenedorEsqueleto, EncabezadoEsqueleto } from "@/components/ui/esqueleto";
import { PerfilCuentaEsqueleto } from "@/components/perfil/esqueleto-perfil";

export default function Loading() {
  return (
    <ContenedorEsqueleto como="section" className="flex w-full flex-col gap-6">
      <EncabezadoEsqueleto
        volver="/empresa"
        className="-mt-2"
        titulo="Mi perfil"
        bajada="Los datos de tu cuenta y de tu empresa en el Portal de Empleo."
      />
      <PerfilCuentaEsqueleto izquierda="Datos de contacto" derecha="Datos de la empresa" />
    </ContenedorEsqueleto>
  );
}
