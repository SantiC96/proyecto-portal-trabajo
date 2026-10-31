import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { IconoCuadro } from "@/components/ui/icono-cuadro";

const CLASE_LINK_TITULO =
  "inline-flex min-h-11 items-center gap-1 rounded-[var(--radius-md)] text-[15px] font-bold whitespace-nowrap text-primary outline-none hover:underline focus-visible:shadow-[var(--sombra-foco)]";

/**
 * Título de bloque de los paneles (20 px, 800) con su ícono en un cuadrado
 * de 40 px, su bajada y un link opcional a la derecha.
 */
export function TituloBloque({
  id,
  titulo,
  icono,
  bajada,
  enlace,
  nivel = "h2",
}: {
  id: string;
  titulo: string;
  icono: LucideIcon;
  bajada?: string;
  enlace?: { href: string; texto: string };
  nivel?: "h2" | "h3";
}) {
  const Titulo = nivel;
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <div className="flex min-w-0 items-center gap-3">
        <IconoCuadro icono={icono} />
        <div className="min-w-0">
          <Titulo id={id} className="text-xl leading-tight font-extrabold text-heading">
            {titulo}
          </Titulo>
          {bajada && <p className="mt-0.5 text-[15px] text-muted-foreground">{bajada}</p>}
        </div>
      </div>
      {enlace && (
        <Link href={enlace.href} className={CLASE_LINK_TITULO}>
          {enlace.texto}
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
