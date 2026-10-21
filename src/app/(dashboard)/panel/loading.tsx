import { Esqueleto, EsqueletoTitulo } from "@/components/ui/esqueleto";
import { EsqueletoIndicadores, EsqueletoListaBloque, EsqueletoPerfil } from "./esqueletos";

export default function Loading() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <EsqueletoTitulo />
      <Esqueleto className="mt-3 h-4 w-3/4 sm:w-96" />
      <div className="mt-8 flex flex-col gap-8">
        <EsqueletoIndicadores />
        <EsqueletoListaBloque filas={3} etiqueta="Cargando tus últimos movimientos" />
        <EsqueletoPerfil />
        <EsqueletoListaBloque filas={3} etiqueta="Cargando ofertas para vos" />
      </div>
    </section>
  );
}
