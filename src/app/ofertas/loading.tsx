import { EsqueletoLista, EsqueletoTitulo, Esqueleto } from "@/components/ui/esqueleto";

export default function Loading() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <EsqueletoTitulo className="mb-2" />
      <Esqueleto className="mb-6 h-4 w-48" />
      <EsqueletoLista filas={6} />
    </section>
  );
}
