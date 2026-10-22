import { Esqueleto, EsqueletoLista, EsqueletoTitulo } from "@/components/ui/esqueleto";

// Rutas de empresa fuera del panel (notificaciones, solicitud): el panel tiene su propio loading.
export default function Loading() {
  return (
    <section>
      <Esqueleto className="h-5 w-32" />
      <EsqueletoTitulo className="mb-6 mt-4" />
      <EsqueletoLista filas={4} />
    </section>
  );
}
