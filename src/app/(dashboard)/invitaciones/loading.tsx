import { Esqueleto, EsqueletoLista, EsqueletoTitulo } from "@/components/ui/esqueleto";

export default function Loading() {
  return (
    <section>
      <Esqueleto className="h-5 w-40" />
      <EsqueletoTitulo className="mt-6 mb-6" />
      <EsqueletoLista filas={3} />
    </section>
  );
}
