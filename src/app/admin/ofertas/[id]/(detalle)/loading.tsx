import {
  ContenedorEsqueleto,
  DetalleEsqueleto,
  EncabezadoEsqueleto,
  TarjetaEsqueleto,
} from "@/components/ui/esqueleto";

export default function Loading() {
  return (
    <ContenedorEsqueleto como="section" className="flex w-full flex-col gap-6">
      <EncabezadoEsqueleto volver="/admin/ofertas" botonesBlancos className="-mt-2" junto bajadaVariable={24} />
      <DetalleEsqueleto
        anchoLateral={380}
        separacion="gap-4"
        separacionColumnas="gap-5"
        principal={<TarjetaEsqueleto titulo="Contenido de la oferta" lineas={9} />}
        lateral={
          <>
            <TarjetaEsqueleto lineas={3} />
            <TarjetaEsqueleto titulo="Revisión" lineas={3} />
          </>
        }
      />
    </ContenedorEsqueleto>
  );
}
