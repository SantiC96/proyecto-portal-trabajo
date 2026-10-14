import { cn } from "@/lib/utils";

export function Esqueleto({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-gray-200", className)}
      aria-hidden="true"
    />
  );
}

export function EsqueletoTexto({ className }: { className?: string }) {
  return <Esqueleto className={cn("h-4 w-full", className)} />;
}

export function EsqueletoTitulo({ className }: { className?: string }) {
  return <Esqueleto className={cn("h-7 w-48 sm:w-64", className)} />;
}

export function EsqueletoTarjeta({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-border bg-white p-4 shadow-xs sm:p-5",
        className,
      )}
    >
      <div className="flex flex-col gap-3">
        <Esqueleto className="h-5 w-3/4" />
        <Esqueleto className="h-4 w-full" />
        <Esqueleto className="h-4 w-2/3" />
      </div>
    </div>
  );
}

export function EsqueletoLista({
  filas = 3,
  className,
}: {
  filas?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {Array.from({ length: filas }, (_, i) => (
        <EsqueletoTarjeta key={i} />
      ))}
    </div>
  );
}
