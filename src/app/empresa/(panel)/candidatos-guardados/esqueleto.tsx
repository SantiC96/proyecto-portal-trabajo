import { Esqueleto } from "@/components/ui/esqueleto";

/** Candidatos guardados mientras cargan: la misma grilla de cada tarjeta. */
export function EsqueletoGuardados({ cantidad = 3 }: { cantidad?: number }) {
  return (
    <div aria-hidden="true" className="@container">
      <div className="flex flex-col gap-4">
        {Array.from({ length: cantidad }, (_, i) => (
          <div
            key={i}
            className="tarjeta tarjeta-panel grid grid-cols-[52px_minmax(0,1fr)] gap-x-4 gap-y-4 @2xl:grid-cols-[64px_minmax(0,1.2fr)_minmax(0,1fr)_auto] @2xl:items-start @2xl:gap-x-6"
          >
            <Esqueleto className="size-[52px] rounded-full @2xl:size-16" />
            <div className="flex min-w-0 flex-col gap-2 self-center @2xl:self-start">
              <Esqueleto className="h-6 w-48 max-w-full" />
              <Esqueleto className="h-4 w-56 max-w-full" />
              <Esqueleto className="h-4 w-32" />
              <Esqueleto className="mt-1 h-7 w-44 max-w-full rounded-full" />
            </div>
            <Esqueleto className="col-span-2 h-24 w-full rounded-[var(--radius-lg)] @2xl:col-span-1" />
            <div className="col-span-2 flex gap-2 *:flex-1 @2xl:col-span-1 @2xl:flex-col @2xl:*:flex-none">
              <Esqueleto className="h-11 rounded-[var(--radius-md)] @2xl:w-32" />
              <Esqueleto className="h-11 rounded-[var(--radius-md)] @2xl:w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
