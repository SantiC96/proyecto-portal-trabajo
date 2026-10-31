import {
  ContenedorEsqueleto,
  DetalleEsqueleto,
  EncabezadoEsqueleto,
  TarjetaEsqueleto,
} from "@/components/ui/esqueleto";

export default function Loading() {
  return (
    <ContenedorEsqueleto como="section" className="flex w-full flex-col gap-6">
      <EncabezadoEsqueleto volver="/admin/postulaciones" botonesBlancos className="-mt-2" junto bajadaVariable={24} />
      <DetalleEsqueleto
        anchoLateral={380}
        separacion="gap-4"
        separacionColumnas="gap-5"
        lateralEnCelular="al-final"
        principal={
          <>
            <TarjetaEsqueleto titulo="Postulante" lineas={4} />
            <TarjetaEsqueleto titulo="Oferta" lineas={3} />
            <TarjetaEsqueleto titulo="Historial de estados" lineas={3} />
          </>
        }
        lateral={
          <>
            <TarjetaEsqueleto lineas={3} />
            <TarjetaEsqueleto titulo="Nota interna" lineas={3} />
          </>
        }
      />
    </ContenedorEsqueleto>
  );
}
