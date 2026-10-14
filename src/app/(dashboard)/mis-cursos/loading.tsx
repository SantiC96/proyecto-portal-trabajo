import { EsqueletoLista, EsqueletoTitulo } from "@/components/ui/esqueleto";

export default function Loading() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <EsqueletoTitulo className="mb-6" />
      <EsqueletoLista filas={3} />
    </section>
  );
}
