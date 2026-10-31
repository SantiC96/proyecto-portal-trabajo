import { BotonVolver } from "@/components/ui/boton-volver";
import { ContenedorEsqueleto, EsqueletoLista } from "@/components/ui/esqueleto";

// Página de comparación de diseño: sin esto heredaría el esqueleto del panel.
export default function Loading() {
  return (
    <ContenedorEsqueleto como="main" className="flex flex-1 flex-col gap-8">
      <BotonVolver href="/panel" destacado className="-mb-4" />
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-extrabold">Comparación de “Tu actividad”</h1>
      </header>
      <EsqueletoLista filas={3} />
    </ContenedorEsqueleto>
  );
}
