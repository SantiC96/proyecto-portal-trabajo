import { Esqueleto, EsqueletoLista, EsqueletoTitulo } from "@/components/ui/esqueleto";

export default function Loading() {
  return (
    <section>
      <Esqueleto className="h-5 w-40" />
      <EsqueletoTitulo className="mt-4" />
      <Esqueleto className="mt-2 h-4 w-48" />
      <EsqueletoLista filas={4} className="mt-6" />
    </section>
  );
}
