import { BotonVolver } from "@/components/ui/boton-volver";
import { ContenedorEsqueleto, Esqueleto } from "@/components/ui/esqueleto";

export default function Loading() {
  return (
    <ContenedorEsqueleto como="section">
      <BotonVolver href="/mis-cursos" />
      <div aria-hidden="true" className="mt-6 flex flex-col gap-6 rounded-2xl border border-border bg-white p-6 shadow-xs sm:p-8">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Esqueleto className="h-8 w-64 max-w-full sm:h-9" />
            <Esqueleto className="h-7 w-24 rounded-full" />
          </div>
          <Esqueleto className="h-4 w-40" />
        </div>
        <Esqueleto className="h-11 w-full rounded-[var(--radius-md)] sm:w-44" />
        <div className="flex flex-col gap-2">
          <Esqueleto className="h-4 w-24" />
          <Esqueleto className="h-4 w-full" />
          <Esqueleto className="h-4 w-4/5" />
        </div>
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Ante cualquier duda, comunicate con la Oficina de Empleo.
      </p>
    </ContenedorEsqueleto>
  );
}
