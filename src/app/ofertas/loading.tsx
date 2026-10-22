import { EsqueletoLista, EsqueletoTitulo, Esqueleto } from "@/components/ui/esqueleto";

export default function Loading() {
  return (
    <section>
      <EsqueletoTitulo className="mb-2" />
      <Esqueleto className="mb-6 h-4 w-48" />
      <EsqueletoLista filas={6} />
    </section>
  );
}
