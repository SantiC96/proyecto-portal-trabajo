import {
  ContenedorEsqueleto,
  DetalleEsqueleto,
  EncabezadoEsqueleto,
  TarjetaEsqueleto,
} from "@/components/ui/esqueleto";

export default function Loading() {
  return (
    <ContenedorEsqueleto como="section" className="flex w-full flex-col gap-6">
      <EncabezadoEsqueleto
        volver="/admin/empresas"
        botonesBlancos
        className="-mt-2"
        avatar
        junto
        bajadaVariable={24}
      />
      <DetalleEsqueleto
        anchoLateral={380}
        separacion="gap-4"
        separacionColumnas="gap-5"
        principal={
          <>
            <TarjetaEsqueleto titulo="Datos de la empresa" lineas={5} />
            <TarjetaEsqueleto titulo="Persona responsable" lineas={3} />
          </>
        }
        lateral={
          <>
            <TarjetaEsqueleto lineas={3} />
            <TarjetaEsqueleto titulo="Historial de la solicitud" lineas={4} />
          </>
        }
      />
    </ContenedorEsqueleto>
  );
}
