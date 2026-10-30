import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * Sección de texto del detalle de una oferta (Descripción, Requisitos,
 * Beneficios): título de 18 px 800 con su ícono verde. Van en una tarjeta con
 * `divide-y`, que las separa con una línea.
 */
export function SeccionTexto({
  titulo,
  icono: Icono,
  nivel = "h2",
  children,
}: {
  titulo: string;
  icono: LucideIcon;
  /** h3 si la tarjeta ya tiene su título (detalle de la oficina). */
  nivel?: "h2" | "h3";
  children: ReactNode;
}) {
  const Titulo = nivel;
  return (
    <section className="flex min-w-0 flex-col gap-2.5 py-5 first:pt-0 last:pb-0">
      <Titulo className="flex items-center gap-2 text-lg font-extrabold text-heading">
        <Icono className="size-5 shrink-0 text-primary" aria-hidden="true" />
        {titulo}
      </Titulo>
      {children}
    </section>
  );
}

/** Lista con viñetas verdes (requisitos, beneficios). */
export function ListaTexto({ items }: { items: string[] }) {
  return (
    <ul className="flex list-disc flex-col gap-2 pl-[22px] text-base leading-[1.6] break-words text-texto-parrafo marker:text-primary">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
