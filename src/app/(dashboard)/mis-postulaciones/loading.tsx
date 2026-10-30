import { EsqueletoLista } from "@/components/ui/esqueleto";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";

export default function Loading() {
  return (
    <section className="flex flex-col gap-6">
      <EncabezadoPagina
        banda
        titulo="Mis postulaciones"
        bajada={<span className="inline-block h-4 w-72 max-w-full rounded bg-primary-foreground/20" />}
      />
      <EsqueletoLista filas={3} />
    </section>
  );
}
