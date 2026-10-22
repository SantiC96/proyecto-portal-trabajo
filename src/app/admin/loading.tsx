import { EsqueletoLista, EsqueletoTitulo } from "@/components/ui/esqueleto";

export default function Loading() {
  return (
    <section>
      <EsqueletoTitulo className="mb-6" />
      <EsqueletoLista filas={5} />
    </section>
  );
}
