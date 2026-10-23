import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  icono: LucideIcon;
  /** Número ya formateado ("1.234", "—"). */
  valor: string;
  etiqueta: string;
  subtitulo?: string;
  /** Pantalla con el listado correspondiente. */
  href?: string;
};

/**
 * Número destacado de un dashboard: ícono blanco en un cuadrado verde, el
 * número grande, la etiqueta y un subtítulo. Si tiene `href`, toda la tarjeta
 * es el link.
 */
export function TarjetaNumero({ icono: Icono, valor, etiqueta, subtitulo, href }: Props) {
  const contenido = (
    <>
      <span
        aria-hidden="true"
        className="flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-primary text-primary-foreground"
      >
        <Icono className="size-6" />
      </span>
      <span className="mt-4 block text-[28px] leading-none font-extrabold tracking-[-0.01em] text-heading tabular-nums sm:text-[36px]">
        {valor}
      </span>
      <span className="mt-2 block text-[15px] leading-snug font-bold text-control-foreground">
        {etiqueta}
      </span>
      {subtitulo && (
        <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">
          {subtitulo}
        </span>
      )}
    </>
  );

  const base = "tarjeta flex h-full flex-col p-5";

  if (!href) return <div className={base}>{contenido}</div>;

  return (
    <Link
      href={href}
      className={cn(
        base,
        "tarjeta-clickeable relative pr-10 no-underline outline-none focus-visible:shadow-[var(--sombra-foco)]",
      )}
    >
      {contenido}
      <ChevronRight
        aria-hidden="true"
        className="absolute top-5 right-4 size-5 text-muted-icon"
      />
    </Link>
  );
}

/** Grilla de tarjetas de número: 4 columnas en escritorio, 2 en el celular. */
export function GrillaNumeros({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">{children}</div>;
}
