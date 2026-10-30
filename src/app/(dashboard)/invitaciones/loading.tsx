import { Esqueleto, EsqueletoLista } from "@/components/ui/esqueleto";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";

export default function Loading() {
  return (
    <section className="flex flex-col gap-6">
      <Esqueleto className="h-5 w-40" />
      <EncabezadoPagina
        banda
        className="-mt-2"
        titulo="Invitaciones"
        bajada={<span className="inline-block h-4 w-64 max-w-full rounded bg-primary-foreground/20" />}
      />
      <EsqueletoLista filas={3} />
    </section>
  );
}
